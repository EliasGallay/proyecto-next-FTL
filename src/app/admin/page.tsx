export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md px-10 py-8 flex flex-col items-center gap-3">
        <span className="text-4xl">⚙️</span>
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">
          Administración
        </p>
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard municipal
        </h1>
        <span className="mt-2 text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-mono">
          GET /admin
        </span>
      </div>
    </main>
  );
}
