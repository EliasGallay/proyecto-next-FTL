export default function OfertasPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md px-10 py-8 flex flex-col items-center gap-3">
        <span className="text-4xl">📋</span>
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">
          Ofertas laborales
        </p>
        <h1 className="text-2xl font-semibold text-gray-800">
          Listado de ofertas
        </h1>
        <span className="mt-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-mono">
          GET /ofertas
        </span>
      </div>
    </main>
  );
}
