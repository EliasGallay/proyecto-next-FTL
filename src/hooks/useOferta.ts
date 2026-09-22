"use client";

import { useEffect, useState } from "react";

interface Oferta {
  id: string;
}

interface UseOfertaResult {
  data: Oferta | null;
  loading: boolean;
  error: string | null;
}

export function useOferta(id: string): UseOfertaResult {
  const [data, setData] = useState<Oferta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/ofertas/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d: Oferta) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}
