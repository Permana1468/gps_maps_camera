import dynamic from 'next/dynamic';

const CameraApp = dynamic(() => import('@/components/CameraApp'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <div className="max-w-md mx-auto min-h-screen relative overflow-hidden flex flex-col">
        {/* Header */}
        <header className="p-8 pb-4 z-10 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
              <img src="/logo-bogor.png" alt="Logo Bogor" className="w-8 h-auto" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-[#3a5a40] leading-none mb-1">Buat Dokumen Baru</h1>
              <p className="text-xs tracking-[0.2em] text-[#84a59d] font-medium uppercase">Desa Cimanggu I • Cibungbulang</p>
            </div>
          </div>
        </header>

        {/* Camera App Component */}
        <CameraApp />
      </div>
    </main>
  );
}
