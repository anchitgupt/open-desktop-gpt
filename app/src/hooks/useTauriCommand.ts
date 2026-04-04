import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function useTauriCommand<T>(command: string, args?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    invoke<T>(command, args)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, JSON.stringify(args)]);

  return { data, loading, error, refetch: () => {
    setLoading(true);
    invoke<T>(command, args)
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }};
}
