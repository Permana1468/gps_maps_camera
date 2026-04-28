import dynamic from 'next/dynamic';

const CameraApp = dynamic(() => import('@/components/CameraApp'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <CameraApp />
    </main>
  );
}
