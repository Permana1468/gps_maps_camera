import dynamic from 'next/dynamic';

const CameraApp = dynamic(() => import('@/components/CameraApp'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md mx-auto bg-white dark:bg-slate-800 min-h-screen shadow-xl relative overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-md z-10 relative flex items-center gap-3">
          <img src="/logo-bogor.png" alt="Logo Bogor" className="w-10 h-auto drop-shadow-md" />
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">DESA CIMANGGU I</h1>
            <p className="text-blue-100 text-xs font-medium">KECAMATAN CIBUNGBULANG</p>
          </div>
        </header>

        {/* Camera App Component */}
        <CameraApp />
      </div>
    </main>
  );
}
