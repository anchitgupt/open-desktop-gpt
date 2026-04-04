import { Channel, invoke } from "@tauri-apps/api/core";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

interface ConversationMeta {
	id: string;
	title: string;
	message_count: number;
	updated: string;
}

interface Conversation {
	id: string;
	title: string;
	messages: ChatMessage[];
	created: string;
	updated: string;
}

function WikiLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
	if (href?.startsWith("/wiki/")) {
		return (
			<Link to={href} className="text-primary underline">
				{children}
			</Link>
		);
	}
	return (
		<a href={href} target="_blank" rel="noopener noreferrer" {...props}>
			{children}
		</a>
	);
}

const remarkPlugins = [
	remarkGfm,
	[
		remarkWikiLink,
		{
			hrefTemplate: (permalink: string) => `/wiki/${permalink}`,
			pageResolver: (name: string) => [name.replace(/ /g, "-").toLowerCase()],
			aliasDivider: "|",
		},
	],
] as any;

export function QA() {
	const [conversations, setConversations] = useState<ConversationMeta[]>([]);
	const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [streaming, setStreaming] = useState(false);
	const [filedSlug, setFiledSlug] = useState<string | null>(null);
	const [hoveredConvoId, setHoveredConvoId] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Active conversation ref for use inside callbacks
	const activeConvoRef = useRef<{
		id: string;
		title: string;
		created: string;
	} | null>(null);

	useEffect(() => {
		loadConversationList();
	}, [loadConversationList]);

	useEffect(() => {
		scrollRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	async function loadConversationList() {
		try {
			const list = await invoke<ConversationMeta[]>("list_conversations");
			setConversations(list);
		} catch (err) {
			console.error("Failed to load conversations:", err);
		}
	}

	async function handleSelectConversation(id: string) {
		if (streaming) return;
		try {
			const convo = await invoke<Conversation | null>("load_conversation", {
				id,
			});
			if (convo) {
				setActiveConvoId(convo.id);
				activeConvoRef.current = {
					id: convo.id,
					title: convo.title,
					created: convo.created,
				};
				setMessages(convo.messages as ChatMessage[]);
			}
		} catch (err) {
			console.error("Failed to load conversation:", err);
		}
	}

	async function handleNewChat() {
		if (streaming) return;
		try {
			const convo = await invoke<Conversation>("create_conversation");
			setActiveConvoId(convo.id);
			activeConvoRef.current = {
				id: convo.id,
				title: convo.title,
				created: convo.created,
			};
			setMessages([]);
			await loadConversationList();
		} catch (err) {
			console.error("Failed to create conversation:", err);
		}
	}

	async function handleDeleteConversation(id: string, e: React.MouseEvent) {
		e.stopPropagation();
		try {
			await invoke("delete_conversation", { id });
			if (activeConvoId === id) {
				setActiveConvoId(null);
				activeConvoRef.current = null;
				setMessages([]);
			}
			await loadConversationList();
		} catch (err) {
			console.error("Failed to delete conversation:", err);
		}
	}

	async function persistConversation(
		updatedMessages: ChatMessage[],
		titleOverride?: string,
	) {
		const meta = activeConvoRef.current;
		if (!meta) return;

		const title = titleOverride ?? meta.title;

		const convo: Conversation = {
			id: meta.id,
			title,
			messages: updatedMessages,
			created: meta.created,
			updated: new Date().toISOString(),
		};

		// Update ref title if overriding
		if (titleOverride) {
			activeConvoRef.current = { ...meta, title: titleOverride };
		}

		try {
			await invoke("save_conversation", { convo });
			await loadConversationList();
		} catch (err) {
			console.error("Failed to save conversation:", err);
		}
	}

	async function handleSend() {
		const question = input.trim();
		if (!question || streaming) return;

		// Auto-create a conversation if none is active
		let meta = activeConvoRef.current;
		if (!meta) {
			try {
				const convo = await invoke<Conversation>("create_conversation");
				setActiveConvoId(convo.id);
				activeConvoRef.current = {
					id: convo.id,
					title: convo.title,
					created: convo.created,
				};
				meta = activeConvoRef.current;
				await loadConversationList();
			} catch (err) {
				console.error("Failed to auto-create conversation:", err);
				return;
			}
		}

		setInput("");
		const userMessage: ChatMessage = { role: "user", content: question };
		const assistantPlaceholder: ChatMessage = {
			role: "assistant",
			content: "",
		};

		setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
		setStreaming(true);

		// Determine title: use first question, truncated to 40 chars
		const isFirstMessage = messages.length === 0;
		const newTitle = isFirstMessage
			? question.slice(0, 40) + (question.length > 40 ? "…" : "")
			: undefined;

		interface StreamEvent {
			event: "token" | "done" | "error";
			data: { text?: string; fullText?: string; message?: string };
		}

		const onEvent = new Channel<StreamEvent>();
		// Accumulate full text locally so we can save on "done"
		let accumulatedText = "";

		onEvent.onmessage = (event: StreamEvent) => {
			if (event.event === "token" && event.data.text) {
				accumulatedText += event.data.text;
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
				// Build final messages snapshot and persist
				setMessages((prev) => {
					const finalMessages = [...prev];
					// Ensure last assistant message has the full text
					const last = finalMessages[finalMessages.length - 1];
					if (
						last.role === "assistant" &&
						accumulatedText &&
						last.content !== accumulatedText
					) {
						last.content = accumulatedText;
					}
					persistConversation(finalMessages, newTitle);
					return finalMessages;
				});
			} else if (event.event === "error") {
				setMessages((prev) => {
					const updated = [...prev];
					const last = updated[updated.length - 1];
					if (last.role === "assistant") {
						last.content = `Error: ${event.data.message}`;
					}
					persistConversation(updated, newTitle);
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
				persistConversation(updated, newTitle);
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
		<div className="flex h-full">
			{/* Conversations sidebar */}
			<div className="w-[200px] shrink-0 border-r flex flex-col bg-muted/20">
				<div className="p-3 border-b">
					<button
						type="button"
						onClick={handleNewChat}
						disabled={streaming}
						className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors"
					>
						<svg role="img" aria-label="icon">
							<path d="M12 5v14M5 12h14" />
						</svg>
						New chat
					</button>
				</div>

				<ScrollArea className="flex-1">
					<div className="p-2 space-y-0.5">
						{conversations.length === 0 ? (
							<p className="text-[11px] text-muted-foreground/50 px-2 py-3 text-center">
								No conversations yet
							</p>
						) : (
							conversations.map((convo) => {
								// biome-ignore lint/a11y/useSemanticElements: requires a div because of nested delete button
								return (
								<div
									key={convo.id}
									// biome-ignore lint/a11y/useKeyWithClickEvents: UI element with nested buttons
									// biome-ignore lint/a11y/noStaticElementInteractions: UI element with nested buttons
									onClick={() => handleSelectConversation(convo.id)}
									onMouseEnter={() => setHoveredConvoId(convo.id)}
									onMouseLeave={() => setHoveredConvoId(null)}
									className={`group flex items-center gap-1 px-2 py-2 rounded-lg cursor-pointer transition-colors text-left ${
										activeConvoId === convo.id
											? "bg-foreground/8 text-foreground"
											: "hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
									}`}
								>
									<div className="flex-1 min-w-0">
										<p className="text-[11px] font-medium truncate leading-snug">
											{convo.title}
										</p>
										<p className="text-[10px] text-muted-foreground/60 mt-0.5">
											{convo.message_count} msg
											{convo.message_count !== 1 ? "s" : ""}
										</p>
									</div>
									{hoveredConvoId === convo.id && (
										<button
											type="button"
											onClick={(e) => handleDeleteConversation(convo.id, e)}
											className="shrink-0 p-0.5 rounded hover:bg-destructive/15 hover:text-destructive transition-colors opacity-60 hover:opacity-100"
											title="Delete conversation"
										>
											<svg role="img" aria-label="icon">
												<path d="M18 6 6 18M6 6l12 12" />
											</svg>
										</button>
									)}
								</div>
								);
							})
						)}
					</div>
				</ScrollArea>
			</div>

			{/* Main chat area */}
			<div className="flex flex-col flex-1 min-w-0 relative">
				{/* Header */}
				<div className="px-8 py-5 border-b shrink-0">
					<h2 className="text-lg font-semibold tracking-tight">Q&A</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Ask questions grounded in your knowledge base
					</p>
				</div>

				{/* Messages */}
				<ScrollArea className="flex-1">
					{messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-center px-4 py-24">
							<div className="mb-3 rounded-full bg-muted p-3">
								<MessageCircle className="h-6 w-6 text-muted-foreground" />
							</div>
							<p className="text-sm font-medium text-muted-foreground">
								Ask a question about your knowledge base
							</p>
							<p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
								Answers are grounded in your compiled wiki articles with [[wiki-link]] citations.
							</p>
							<div className="flex gap-2 mt-4">
								{["What topics do I have?", "Summarize my sources"].map((q) => (
									<button
										key={q}
										type="button"
										onClick={() => { setInput(q); }}
										className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
									>
										{q}
									</button>
								))}
							</div>
						</div>
					) : (
						<div className="max-w-3xl mx-auto px-8 py-6 space-y-6">
							{messages.map((msg, i) => (
								<div
									key={i}
									className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
								>
									{msg.role === "user" ? (
										<div className="rounded-2xl px-4 py-2.5 max-w-[75%] bg-foreground/5 border border-border/50">
											<p className="text-sm">{msg.content}</p>
										</div>
									) : (
										<div className="max-w-[85%]">
											{msg.content === "" && streaming ? (
												<div className="flex gap-1 py-2">
													<span
														className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
														style={{ animationDelay: "0ms" }}
													/>
													<span
														className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
														style={{ animationDelay: "150ms" }}
													/>
													<span
														className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
														style={{ animationDelay: "300ms" }}
													/>
												</div>
											) : (
												<>
													<div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
														<ReactMarkdown
															remarkPlugins={remarkPlugins}
															components={{ a: WikiLink }}
														>
															{msg.content}
														</ReactMarkdown>
													</div>
													{msg.content && !streaming && i > 0 && (
														<button
															type="button"
															className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
															onClick={() => {
																const userMsg = messages[i - 1];
																if (userMsg?.role === "user")
																	handleFileAnswer(
																		userMsg.content,
																		msg.content,
																	);
															}}
														>
															<svg role="img" aria-label="icon">
																<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
																<path d="M14 2v4a2 2 0 0 0 2 2h4" />
															</svg>
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
				<div className="px-8 py-4 border-t shrink-0">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleSend();
						}}
						className="flex gap-2 max-w-3xl mx-auto"
					>
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
								<svg role="img" aria-label="icon">
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
									></path>
								</svg>
							) : (
								<svg role="img" aria-label="icon">
									<path d="m5 12 7-7 7 7" />
									<path d="M12 19V5" />
								</svg>
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
