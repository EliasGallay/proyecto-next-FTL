export default function EmpresaDashboardPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md px-10 py-8 flex flex-col items-center gap-3">
        <span className="text-4xl">🏢</span>
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">
          Empresa
        </p>
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard empresa
        </h1>
        <span className="mt-2 text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-mono">
          GET /empresa
        </span>
      </div>
    </main>
  );
}
