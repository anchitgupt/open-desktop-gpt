import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/qa", label: "Q&A" },
  ];

  return (
    <aside className="w-60 border-r flex flex-col">
      <div className="p-4">
        <h1 className="text-lg font-bold">Knowledge GPT</h1>
      </div>
      <Separator />
      <nav className="p-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
              location.pathname === item.to
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
          <span>Uncompiled</span>
          <Badge variant="secondary">0</Badge>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-2">
        <p className="px-3 py-2 text-xs text-muted-foreground">No articles yet</p>
      </ScrollArea>
    </aside>
  );
}
