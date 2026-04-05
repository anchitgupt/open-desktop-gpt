import { CheckCircle } from "lucide-react";
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
							<CheckCircle className="h-8 w-8 text-muted-foreground/40" />
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
