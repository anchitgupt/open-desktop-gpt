import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import type { WikiStats } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function Dashboard() {
  const { data: stats, loading } = useTauriCommand<WikiStats>("get_stats");
  const { data: uncompiled } = useTauriCommand<string[]>("list_uncompiled");
  const { data: recentCompilations } = useTauriCommand<Record<string, unknown>[]>("get_recent_compilations", { limit: 10 });

  if (loading || !stats) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.article_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Words</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total_words.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.categories.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uncompiled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{uncompiled?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {stats.article_count === 0 && (
        <EmptyState
          title="No articles yet"
          description="Add your first source to get started. Paste a URL or drop a file into the sidebar."
        />
      )}

      {stats.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Articles by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.categories}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {stats.orphans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Orphan Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              These articles are not linked from any other article:
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.orphans.map((slug) => (
                <Badge key={slug} variant="outline">{slug}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(recentCompilations ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Compilations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {recentCompilations!.map((entry, i) => (
                <li key={i} className="flex justify-between text-muted-foreground">
                  <span>{String(entry.dest ?? entry.url ?? "unknown")}</span>
                  <span className="text-xs">{String(entry.timestamp ?? "").slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {(uncompiled?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uncompiled Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {uncompiled!.map((path) => (
                <li key={path} className="text-muted-foreground">{path}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
