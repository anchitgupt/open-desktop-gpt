import { useState, useRef, useEffect } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import { Link } from "react-router-dom";
import type { ComponentPropsWithoutRef } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function WikiLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href?.startsWith("/wiki/")) {
    return <Link to={href} className="text-primary underline">{children}</Link>;
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
}

const remarkPlugins = [
  remarkGfm,
  [remarkWikiLink, {
    hrefTemplate: (permalink: string) => `/wiki/${permalink}`,
    pageResolver: (name: string) => [name.replace(/ /g, "-").toLowerCase()],
    aliasDivider: "|",
  }],
] as any;

export function QA() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const question = input.trim();
    if (!question || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    interface StreamEvent {
      event: "token" | "done" | "error";
      data: { text?: string; fullText?: string; message?: string };
    }

    const onEvent = new Channel<StreamEvent>();
    onEvent.onmessage = (event: StreamEvent) => {
      if (event.event === "token" && event.data.text) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            last.content += event.data.text;
          }
          return updated;
        });
      } else if (event.event === "done") {
        setStreaming(false);
      } else if (event.event === "error") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            last.content = `Error: ${event.data.message}`;
          }
          return updated;
        });
        setStreaming(false);
      }
    };

    try {
      await invoke("ask", { question, onEvent });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          last.content = `Error: ${err}`;
        }
        return updated;
      });
      setStreaming(false);
    }
  }

  async function handleFileAnswer(question: string, answer: string) {
    try {
      const slug = await invoke<string>("file_answer", { question, answer });
      alert(`Filed to wiki: ${slug}`);
    } catch (err) {
      alert(`Failed: ${err}`);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Q&A</h2>
        <p className="text-sm text-muted-foreground">Ask questions about your knowledge base</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-lg px-4 py-3 max-w-[80%] ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {msg.role === "assistant" ? (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={remarkPlugins} components={{ a: WikiLink }}>
                        {msg.content || "..."}
                      </ReactMarkdown>
                    </div>
                    {msg.content && !streaming && i > 0 && (
                      <Button variant="ghost" size="sm" className="mt-2 text-xs"
                        onClick={() => {
                          const userMsg = messages[i - 1];
                          if (userMsg?.role === "user") handleFileAnswer(userMsg.content, msg.content);
                        }}
                      >
                        File to wiki
                      </Button>
                    )}
                  </>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 max-w-3xl mx-auto">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." disabled={streaming} className="flex-1" />
          <Button type="submit" disabled={streaming || !input.trim()}>
            {streaming ? "..." : "Ask"}
          </Button>
        </form>
      </div>
    </div>
  );
}
