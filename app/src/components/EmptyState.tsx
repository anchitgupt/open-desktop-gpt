import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center px-4">
			{Icon && (
				<div className="mb-3 rounded-full bg-muted p-3">
					<Icon className="h-6 w-6 text-muted-foreground" />
				</div>
			)}
			<p className="text-sm font-medium text-muted-foreground">{title}</p>
			{description && (
				<p className="text-xs text-muted-foreground/70 mt-1 max-w-[280px]">
					{description}
				</p>
			)}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
