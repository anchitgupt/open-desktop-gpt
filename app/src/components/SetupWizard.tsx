import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import type { AppConfig } from "@/lib/config-types";

interface SetupWizardProps {
	onComplete: () => void;
}

type Provider = "claude" | "openai" | "gemini" | "ollama";

const MODEL_DEFAULTS: Record<Provider, string> = {
	claude: "claude-sonnet-4-5-20250514",
	openai: "gpt-4o",
	gemini: "gemini-2.5-flash",
	ollama: "llama3.3",
};

const PROVIDER_LABELS: Record<Provider, string> = {
	claude: "Claude",
	openai: "OpenAI",
	gemini: "Gemini",
	ollama: "Ollama",
};

const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
	claude: "Anthropic's Claude models",
	openai: "GPT-4o and friends",
	gemini: "Google's Gemini models",
	ollama: "Local models via Ollama",
};

function ProgressDots({ step, total }: { step: number; total: number }) {
	return (
		<div className="flex items-center justify-center gap-2 mb-6">
			{Array.from({ length: total }).map((_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: static array
					key={i}
					className={`rounded-full transition-all duration-300 ${
						i === step
							? "w-6 h-2 bg-primary"
							: i < step
								? "w-2 h-2 bg-primary/50"
								: "w-2 h-2 bg-muted"
					}`}
				/>
			))}
		</div>
	);
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
	const { toast } = useToast();

	const [step, setStep] = useState(0);
	const [provider, setProvider] = useState<Provider>("claude");
	const [apiKey, setApiKey] = useState("");
	const [model, setModel] = useState(MODEL_DEFAULTS.claude);
	const [ollamaEndpoint, setOllamaEndpoint] = useState(
		"http://localhost:11434",
	);
	const [ingestUrl, setIngestUrl] = useState(
		"https://en.wikipedia.org/wiki/Large_language_model",
	);
	const [testing, setTesting] = useState(false);
	const [ingesting, setIngesting] = useState(false);
	const [ingestDone, setIngestDone] = useState(false);

	function handleProviderChange(p: Provider) {
		setProvider(p);
		setModel(MODEL_DEFAULTS[p]);
	}

	function buildConfig(completed: boolean): AppConfig {
		return {
			llm: {
				provider,
				api_key: apiKey,
				model,
				ollama_endpoint: ollamaEndpoint,
			},
			auto_compile: false,
			setup_completed: completed,
		};
	}

	async function saveAndComplete() {
		const config = buildConfig(true);
		try {
			await invoke("set_config", { config });
		} catch {
			// best-effort save; proceed regardless
		}
		onComplete();
	}

	async function handleSkip() {
		await saveAndComplete();
	}

	async function handleTestConnection() {
		setTesting(true);
		try {
			const config = buildConfig(false);
			const result = await invoke<string>("test_connection", { config });
			toast({ title: "Connection successful", description: result, type: "success" });
		} catch (err) {
			toast({
				title: "Connection failed",
				description: String(err),
				type: "error",
			});
		} finally {
			setTesting(false);
		}
	}

	async function handleIngest() {
		setIngesting(true);
		try {
			const dest = await invoke<string>("ingest_url", { url: ingestUrl });
			await invoke("compile_sources", { rawPaths: [dest] });
			setIngestDone(true);
			toast({
				title: "Article ingested!",
				description: "The article has been compiled into your wiki.",
				type: "success",
			});
		} catch (err) {
			toast({
				title: "Ingest failed",
				description: String(err),
				type: "error",
			});
		} finally {
			setIngesting(false);
		}
	}

	// ── Step 0: Welcome ──────────────────────────────────────────────────────
	function renderWelcome() {
		return (
			<div className="flex flex-col items-center text-center gap-6 py-4">
				<div className="flex flex-col items-center gap-3">
					<div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
						🧠
					</div>
					<h1 className="text-2xl font-bold tracking-tight">Open Desktop GPT</h1>
					<p className="text-muted-foreground text-sm max-w-sm">
						Your local AI-powered knowledge base. Compile articles, research
						topics, and build a wiki that compounds over time.
					</p>
				</div>
				<div className="flex flex-col items-center gap-3 w-full">
					<Button className="w-full" size="lg" onClick={() => setStep(1)}>
						Let&apos;s get you set up
					</Button>
					<button
						type="button"
						onClick={handleSkip}
						className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
					>
						Skip setup
					</button>
				</div>
			</div>
		);
	}

	// ── Step 1: Provider ─────────────────────────────────────────────────────
	function renderProvider() {
		const providers: Provider[] = ["claude", "openai", "gemini", "ollama"];
		return (
			<div className="flex flex-col gap-5">
				<div>
					<h2 className="text-lg font-semibold">Choose your AI provider</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Select the model provider you&apos;d like to use.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3">
					{providers.map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => handleProviderChange(p)}
							className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
								provider === p
									? "border-primary bg-primary/5"
									: "border-border bg-background hover:bg-muted"
							}`}
						>
							<span className="font-medium text-sm">{PROVIDER_LABELS[p]}</span>
							<span className="text-xs text-muted-foreground">
								{PROVIDER_DESCRIPTIONS[p]}
							</span>
						</button>
					))}
				</div>

				<div className="flex flex-col gap-3">
					{provider === "ollama" ? (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="ollama-endpoint">Ollama endpoint</Label>
							<Input
								id="ollama-endpoint"
								value={ollamaEndpoint}
								onChange={(e) => setOllamaEndpoint(e.target.value)}
								placeholder="http://localhost:11434"
							/>
						</div>
					) : (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="api-key">API key</Label>
							<Input
								id="api-key"
								type="password"
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								placeholder={`Enter your ${PROVIDER_LABELS[provider]} API key`}
							/>
						</div>
					)}

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="model">Model</Label>
						<Input
							id="model"
							value={model}
							onChange={(e) => setModel(e.target.value)}
							placeholder="Model name"
						/>
					</div>
				</div>

				<div className="flex items-center justify-between gap-3 pt-1">
					<Button variant="ghost" onClick={() => setStep(0)}>
						Back
					</Button>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							onClick={handleTestConnection}
							disabled={testing}
						>
							{testing ? "Testing…" : "Test Connection"}
						</Button>
						<Button onClick={() => setStep(2)}>Continue</Button>
					</div>
				</div>
			</div>
		);
	}

	// ── Step 2: Try it ───────────────────────────────────────────────────────
	function renderTryIt() {
		return (
			<div className="flex flex-col gap-5">
				<div>
					<h2 className="text-lg font-semibold">Try it out</h2>
					<p className="text-muted-foreground text-sm mt-1">
						Ingest a web article to see your knowledge base in action.
					</p>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="ingest-url">Article URL</Label>
					<Input
						id="ingest-url"
						value={ingestUrl}
						onChange={(e) => setIngestUrl(e.target.value)}
						placeholder="https://..."
					/>
				</div>

				{ingestDone && (
					<div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
						Article ingested and compiled into your wiki!
					</div>
				)}

				<div className="flex items-center justify-between gap-3 pt-1">
					<Button variant="ghost" onClick={() => setStep(1)}>
						Back
					</Button>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setStep(3)}
							className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
						>
							Skip
						</button>
						<Button onClick={handleIngest} disabled={ingesting || ingestDone}>
							{ingesting
								? "Ingesting…"
								: ingestDone
									? "Done!"
									: "Ingest & Compile"}
						</Button>
						{ingestDone && (
							<Button onClick={() => setStep(3)}>Continue</Button>
						)}
					</div>
				</div>
			</div>
		);
	}

	// ── Step 3: Done ─────────────────────────────────────────────────────────
	function renderDone() {
		const features = [
			{
				icon: "📊",
				title: "Dashboard",
				desc: "Browse your compiled wiki articles at a glance.",
			},
			{
				icon: "💬",
				title: "Q&A",
				desc: "Ask questions grounded in your knowledge base.",
			},
			{
				icon: "➕",
				title: "Add Sources",
				desc: "Drag in articles, PDFs, and repos to grow your wiki.",
			},
		];

		return (
			<div className="flex flex-col items-center text-center gap-6 py-2">
				<div className="flex flex-col items-center gap-3">
					<div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center text-2xl">
						✅
					</div>
					<h2 className="text-xl font-bold">You&apos;re all set!</h2>
					<p className="text-muted-foreground text-sm max-w-xs">
						Your knowledge base is ready. Here&apos;s what you can do next:
					</p>
				</div>

				<div className="grid grid-cols-3 gap-3 w-full">
					{features.map((f) => (
						<div
							key={f.title}
							className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3 text-left"
						>
							<span className="text-xl">{f.icon}</span>
							<span className="font-medium text-sm">{f.title}</span>
							<span className="text-xs text-muted-foreground">{f.desc}</span>
						</div>
					))}
				</div>

				<Button className="w-full" size="lg" onClick={saveAndComplete}>
					Get Started
				</Button>
			</div>
		);
	}

	const steps = [
		renderWelcome,
		renderProvider,
		renderTryIt,
		renderDone,
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<div className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl border border-border bg-background p-6">
				<ProgressDots step={step} total={steps.length} />
				{steps[step]()}
			</div>
		</div>
	);
}
