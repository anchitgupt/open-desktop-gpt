import { useState, useRef, useEffect } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
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
  const [filedSlug, setFiledSlug] = useState<string | null>(null);
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
      setFiledSlug(slug);
      setTimeout(() => setFiledSlug(null), 3000);
    } catch (err) {
      console.error("Failed to file:", err);
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-8 py-5 border-b">
        <h2 className="text-lg font-semibold tracking-tight">Q&A</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Ask questions grounded in your knowledge base</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-24">
            <div className="text-3xl mb-3 opacity-30">?</div>
            <p className="text-sm font-medium text-muted-foreground">Ask anything about your wiki</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
              Questions are answered using your compiled articles. Answers can be filed back into the wiki.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-8 py-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="rounded-2xl px-4 py-2.5 max-w-[75%] bg-foreground/5 border border-border/50">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[85%]">
                    {msg.content === "" && streaming ? (
                      <div className="flex gap-1 py-2">
                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                          <ReactMarkdown remarkPlugins={remarkPlugins} components={{ a: WikiLink }}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.content && !streaming && i > 0 && (
                          <button
                            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            onClick={() => {
                              const userMsg = messages[i - 1];
                              if (userMsg?.role === "user") handleFileAnswer(userMsg.content, msg.content);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                            Save to wiki
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Filed toast */}
      {filedSlug && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-full text-xs font-medium shadow-lg">
          Saved to wiki: {filedSlug}
        </div>
      )}

      {/* Input area */}
      <div className="px-8 py-4 border-t">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={streaming}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 disabled:opacity-30 transition-colors"
          >
            {streaming ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
