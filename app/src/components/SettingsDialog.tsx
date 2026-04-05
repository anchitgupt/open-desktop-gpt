import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppConfig } from "@/lib/config-types";

const PROVIDERS = [
	{ value: "claude", label: "Claude (Anthropic)" },
	{ value: "openai", label: "OpenAI" },
	{ value: "gemini", label: "Gemini (Google)" },
	{ value: "ollama", label: "Ollama (Local)" },
];

function GearIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	);
}

export function SettingsDialog() {
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [config, setConfig] = useState<AppConfig | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open) {
			invoke<AppConfig>("get_config").then(setConfig).catch(console.error);
		}
	}, [open]);

	async function handleSave() {
		if (!config) return;
		setSaving(true);
		try {
			await invoke("set_config", { config });
			setOpen(false);
			toast({ title: "Settings saved", type: "success" });
		} catch (err) {
			console.error(err);
			toast({ title: "Failed to save settings", description: String(err), type: "error" });
		} finally {
			setSaving(false);
		}
	}

	function updateLlm(field: string, value: string) {
		if (!config) return;
		setConfig({ ...config, llm: { ...config.llm, [field]: value } });
	}

	const isOllama = config?.llm.provider === "ollama";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button variant="ghost" size="icon-sm" aria-label="Open settings" />
				}
			>
				<GearIcon />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
				{config ? (
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="provider">LLM Provider</Label>
							<select
								id="provider"
								value={config.llm.provider}
								onChange={(e) => updateLlm("provider", e.target.value)}
								className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								{PROVIDERS.map((p) => (
									<option key={p.value} value={p.value}>
										{p.label}
									</option>
								))}
							</select>
						</div>

						{!isOllama && (
							<div className="space-y-1.5">
								<Label htmlFor="api-key">API Key</Label>
								<Input
									id="api-key"
									type="password"
									placeholder="sk-..."
									value={config.llm.api_key}
									onChange={(e) => updateLlm("api_key", e.target.value)}
								/>
							</div>
						)}

						<div className="space-y-1.5">
							<Label htmlFor="model">Model</Label>
							<Input
								id="model"
								type="text"
								placeholder="e.g. claude-3-5-sonnet-latest"
								value={config.llm.model}
								onChange={(e) => updateLlm("model", e.target.value)}
							/>
						</div>

						{isOllama && (
							<div className="space-y-1.5">
								<Label htmlFor="ollama-endpoint">Ollama Endpoint</Label>
								<Input
									id="ollama-endpoint"
									type="text"
									placeholder="http://localhost:11434"
									value={config.llm.ollama_endpoint}
									onChange={(e) => updateLlm("ollama_endpoint", e.target.value)}
								/>
							</div>
						)}

						<div className="flex items-center justify-between">
							<div>
								<Label>Auto-compile on ingest</Label>
								<p className="text-xs text-muted-foreground">
									Automatically compile sources when added
								</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-pressed={config.auto_compile}
								onClick={() =>
									setConfig({ ...config, auto_compile: !config.auto_compile })
								}
								className={`w-10 h-5 rounded-full transition-colors ${config.auto_compile ? "bg-foreground" : "bg-muted"}`}
							>
								<span
									className={`block w-4 h-4 rounded-full bg-background shadow transition-transform ${config.auto_compile ? "translate-x-5" : "translate-x-0.5"}`}
								/>
							</button>
						</div>

						<Button onClick={handleSave} disabled={saving} className="w-full">
							{saving ? "Saving..." : "Save"}
						</Button>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">Loading...</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
