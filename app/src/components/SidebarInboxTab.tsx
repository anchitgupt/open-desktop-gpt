import { ScrollArea } from "@/components/ui/scroll-area";
import { UncompiledList } from "./UncompiledList";

interface SidebarInboxTabProps {
	uncompiled: string[];
	onRefresh: () => void;
}

export function SidebarInboxTab({
	uncompiled,
	onRefresh,
}: SidebarInboxTabProps) {
	const isEmpty = uncompiled.length === 0;

	return (
		<div className="flex flex-col h-full">
			<ScrollArea className="flex-1">
				<div className="px-2 py-2">
					{isEmpty ? (
						<div className="flex flex-col items-center gap-2 py-8 text-center">
							<svg role="img" aria-label="icon">
								<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
								<polyline points="22 4 12 14.01 9 11.01" />
							</svg>
							<p className="text-xs text-muted-foreground">
								All sources compiled
							</p>
						</div>
					) : (
						<UncompiledList paths={uncompiled} onCompiled={onRefresh} />
					)}
				</div>
			</ScrollArea>

			<div className="mx-2 mb-2 mt-1 text-center">
				<p className="text-[10px] text-muted-foreground/50">
					Use "+ Add source" to ingest files
				</p>
			</div>
		</div>
	);
}
