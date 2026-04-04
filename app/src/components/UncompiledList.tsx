import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CompilePreview } from "./CompilePreview";
import { useToast } from "@/hooks/useToast";

interface UncompiledListProps {
	paths: string[];
	onCompiled: () => void;
}

export function UncompiledList({ paths, onCompiled }: UncompiledListProps) {
	const { toast } = useToast();
	const [compiling, setCompiling] = useState<string | null>(null);
	const [previewChanges, setPreviewChanges] = useState<any[]>([]);
	const [previewPaths, setPreviewPaths] = useState<string[]>([]);
	const [previewOpen, setPreviewOpen] = useState(false);

	async function handleCompilePreview(path: string) {
		setCompiling(path);
		try {
			const result = await invoke<{ changes: any[] }>("compile_preview", {
				rawPaths: [path],
			});
			setPreviewChanges(result.changes);
			setPreviewPaths([path]);
			setPreviewOpen(true);
		} catch (err) {
			console.error("Preview failed:", err);
			toast({ title: "Preview failed", description: String(err), type: "error" });
		} finally {
			setCompiling(null);
		}
	}

	async function handleCompileAll() {
		setCompiling("all");
		try {
			await invoke("compile_sources", { rawPaths: paths });
			toast({ title: "Article compiled", type: "success" });
			onCompiled();
		} catch (err) {
			console.error("Compile all failed:", err);
			toast({ title: "Compile failed", description: String(err), type: "error" });
		} finally {
			setCompiling(null);
		}
	}

	if (paths.length === 0) return null;

	return (
		<>
			<div className="space-y-1">
				{paths.length > 1 && (
					<Button
						variant="outline"
						size="sm"
						className="w-full mb-1"
						onClick={handleCompileAll}
						disabled={compiling !== null}
					>
						{compiling === "all"
							? "Compiling..."
							: `Compile All (${paths.length})`}
					</Button>
				)}
				{paths.map((path) => {
					const filename = path.split("/").pop() ?? path;
					return (
						<div
							key={path}
							className="flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-accent"
						>
							<span
								className="truncate flex-1 text-muted-foreground"
								title={path}
							>
								{filename}
							</span>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 px-2 text-xs"
								onClick={() => handleCompilePreview(path)}
								disabled={compiling !== null}
							>
								{compiling === path ? "..." : "Compile"}
							</Button>
						</div>
					);
				})}
			</div>

			<CompilePreview
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				changes={previewChanges}
				rawPaths={previewPaths}
				onApplied={onCompiled}
			/>
		</>
	);
}
