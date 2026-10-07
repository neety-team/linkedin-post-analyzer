import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = `Error de la API ${res.status}`;
    try { msg = JSON.parse(text).error || msg; } catch {}
    throw new Error(msg);
  }
  if (!text) return undefined as T;
  return JSON.parse(text);
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const lastPath = useRef(path);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    lastPath.current = path;

    setLoading(true);
    setError(null);

    apiFetch<T>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [path]);

  const refetch = () => {
    if (!lastPath.current) return;
    setLoading(true);
    setError(null);
    apiFetch<T>(lastPath.current)
      .then(setData)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return { data, loading, error, refetch };
}

// One-shot GET, for fetches that aren't a component's data source and so
// don't want useApi's loading/error state — e.g. enriching a single row on
// demand.
export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch(path, { method: 'DELETE' });
}
