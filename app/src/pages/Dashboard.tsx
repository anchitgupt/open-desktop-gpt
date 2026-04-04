import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import type { WikiStats } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

export function Dashboard() {
  const { data: stats, loading } = useTauriCommand<WikiStats>("get_stats");
  const { data: uncompiled } = useTauriCommand<string[]>("list_uncompiled");
  const { data: recentCompilations } = useTauriCommand<Record<string, unknown>[]>("get_recent_compilations", { limit: 10 });

  if (loading || !stats) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        <div className="space-y-1">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Your knowledge base at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Articles</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{stats.article_count}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Words</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{stats.total_words.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Categories</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{stats.categories.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Uncompiled</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{uncompiled?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {stats.article_count === 0 && (
        <EmptyState
          title="No articles yet"
          description="Add your first source to get started. Paste a URL or drop a file into the sidebar."
        />
      )}

      {/* Chart */}
      {stats.categories.length > 0 && (
        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Articles by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.categories} barCategoryGap="30%">
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Bar dataKey="count" fill="hsl(220, 70%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Health / Activity section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Compilations */}
        {(recentCompilations ?? []).length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Compilations</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ul className="divide-y divide-border/50">
                {recentCompilations!.map((entry, i) => {
                  const dest = String(entry.dest ?? entry.url ?? "unknown");
                  const date = String(entry.timestamp ?? "").slice(0, 10);
                  return (
                    <li key={i} className="flex justify-between items-center py-2 gap-3">
                      <span className="text-xs text-foreground truncate min-w-0">{dest}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{date}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Orphan Articles */}
        {stats.orphans.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Orphan Articles</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xs text-muted-foreground mb-3">
                Not linked from any other article:
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.orphans.map((slug) => (
                  <Link
                    key={slug}
                    to={`/wiki/${slug}`}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {slug}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
