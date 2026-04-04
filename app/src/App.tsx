import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-60 border-r p-4">
        <h1 className="text-lg font-bold">Knowledge GPT</h1>
      </aside>
      <main className="flex-1 p-4">
        <Button>Test Button</Button>
      </main>
    </div>
  );
}

export default App;
