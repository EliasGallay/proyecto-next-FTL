"use client";

import { useEffect, useState } from "react";

export default function SaludoPage() {
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    fetch("/api/saludo")
      .then((r) => r.json())
      .then((data) => setMensaje(data.mensaje));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md px-10 py-8 flex flex-col items-center gap-3">
        <span className="text-4xl">👋</span>
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">
          Respuesta de la API
        </p>
        <p className="text-2xl font-semibold text-gray-800">
          {mensaje || "Cargando..."}
        </p>
        <span className="mt-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-mono">
          GET /api/saludo
        </span>
      </div>
    </main>
  );
}
