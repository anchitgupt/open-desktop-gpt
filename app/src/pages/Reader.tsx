import { useParams } from "react-router-dom";

export function Reader() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{slug || "Select an article"}</h2>
      <p className="text-muted-foreground">Article content will render here.</p>
    </div>
  );
}
