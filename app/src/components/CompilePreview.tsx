import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProposedChange {
	filename: string;
	content: string;
	is_new: boolean;
	existing_content: string | null;
}

interface CompilePreviewProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	changes: ProposedChange[];
	rawPaths: string[];
	onApplied: () => void;
}

export function CompilePreview({
	open,
	onOpenChange,
	changes,
	rawPaths,
	onApplied,
}: CompilePreviewProps) {
	const [selected, setSelected] = useState<Set<number>>(
		new Set(changes.map((_, i) => i)),
	);
	const [applying, setApplying] = useState(false);

	function toggleFile(index: number) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(index)) next.delete(index);
			else next.add(index);
			return next;
		});
	}

	async function handleApply() {
		const approved = changes.filter((_, i) => selected.has(i));
		if (approved.length === 0) return;
		setApplying(true);
		try {
			await invoke("apply_changes", { changes: approved, rawPaths });
			onOpenChange(false);
			onApplied();
		} catch (err) {
			console.error("Apply failed:", err);
		} finally {
			setApplying(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Compilation Preview</DialogTitle>
				</DialogHeader>
				<p className="text-xs text-muted-foreground">
					{changes.length} file(s) will be created or updated. Uncheck to skip.
				</p>
				<ScrollArea className="flex-1 mt-2">
					<div className="space-y-3">
						{changes.map((change, i) => (
							<div
								key={i}
								className={`border rounded-lg p-3 transition-opacity ${selected.has(i) ? "" : "opacity-40"}`}
							>
								<div className="flex items-center gap-2 mb-2">
									<input
										type="checkbox"
										checked={selected.has(i)}
										onChange={() => toggleFile(i)}
										className="rounded"
									/>
									<span className="text-sm font-medium font-mono">
										{change.filename}
									</span>
									<span
										className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
											change.is_new
												? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
												: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
										}`}
									>
										{change.is_new ? "NEW" : "UPDATE"}
									</span>
								</div>
								<pre className="text-xs bg-muted rounded-md p-2 max-h-40 overflow-auto font-mono whitespace-pre-wrap">
									{change.content.slice(0, 500)}
									{change.content.length > 500 ? "..." : ""}
								</pre>
							</div>
						))}
					</div>
				</ScrollArea>
				<div className="flex justify-end gap-2 mt-4 pt-3 border-t">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleApply}
						disabled={applying || selected.size === 0}
					>
						{applying ? "Applying..." : `Apply ${selected.size} change(s)`}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
