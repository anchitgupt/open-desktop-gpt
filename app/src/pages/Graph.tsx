import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useTauriCommand } from "@/hooks/useTauriCommand";

interface GraphNode {
	slug: string;
	title: string;
	category: string;
	word_count: number;
}

interface GraphEdge {
	source: string;
	target: string;
}

interface GraphData {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

// Color palette for categories
const CATEGORY_COLORS = [
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#84cc16",
	"#f97316",
	"#6366f1",
];

export function Graph() {
	const navigate = useNavigate();
	const { data, loading } = useTauriCommand<GraphData>("get_graph_data");
	const graphRef = useRef<any>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

	// Track container size for responsive graph
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				setDimensions({
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				});
			}
		});

		observer.observe(el);
		// Set initial dimensions
		setDimensions({
			width: el.clientWidth || 800,
			height: el.clientHeight || 600,
		});

		return () => observer.disconnect();
	}, []);

	const categoryColorMap = useMemo(() => {
		const map = new Map<string, string>();
		if (!data) return map;
		const categories = [...new Set(data.nodes.map((n) => n.category))];
		categories.forEach((cat, i) =>
			map.set(cat, CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
		);
		return map;
	}, [data]);

	const graphData = useMemo(() => {
		if (!data) return { nodes: [], links: [] };
		return {
			nodes: data.nodes.map((n) => ({ id: n.slug, ...n })),
			links: data.edges.map((e) => ({ source: e.source, target: e.target })),
		};
	}, [data]);

	const handleNodeClick = useCallback(
		(node: any) => navigate(`/wiki/${node.id}`),
		[navigate],
	);

	if (loading) {
		return (
			<div className="p-8">
				<Skeleton className="h-8 w-48 mb-4" />
				<Skeleton className="h-[500px] rounded-lg" />
			</div>
		);
	}

	if (!data || data.nodes.length === 0) {
		return (
			<div className="flex items-center justify-center h-full">
				<EmptyState
					title="No articles to visualize"
					description="Add and compile some sources to see the knowledge graph."
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="px-8 py-5 border-b shrink-0">
				<h2 className="text-lg font-semibold tracking-tight">
					Knowledge Graph
				</h2>
				<p className="text-xs text-muted-foreground mt-0.5">
					{data.nodes.length} articles · {data.edges.length} connections
				</p>
			</div>

			{/* Legend */}
			<div className="px-8 py-2 border-b shrink-0 flex flex-wrap gap-3">
				{Array.from(categoryColorMap.entries()).map(([cat, color]) => (
					<div
						key={cat}
						className="flex items-center gap-1.5 text-xs text-muted-foreground"
					>
						<span
							className="w-2.5 h-2.5 rounded-full shrink-0"
							style={{ backgroundColor: color }}
						/>
						{cat}
					</div>
				))}
			</div>

			{/* Graph canvas */}
			<div ref={containerRef} className="flex-1 overflow-hidden">
				<ForceGraph2D
					ref={graphRef}
					graphData={graphData}
					nodeLabel="title"
					nodeColor={(node: any) =>
						categoryColorMap.get(node.category) || "#6b7280"
					}
					nodeRelSize={4}
					nodeVal={(node: any) => Math.max(1, Math.sqrt(node.word_count / 100))}
					linkColor={() => "rgba(107, 114, 128, 0.25)"}
					linkWidth={1}
					onNodeClick={handleNodeClick}
					backgroundColor="transparent"
					width={dimensions.width}
					height={dimensions.height}
				/>
			</div>
		</div>
	);
}
