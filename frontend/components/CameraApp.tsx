"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, MapPin, Loader2, RefreshCw, CheckCircle2, Paperclip, Zap, Settings, Grid, Image as ImageIcon, Folder, LayoutGrid } from 'lucide-react';

export default function CameraApp() {
  const webcamRef = useRef<Webcam>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("Mengambil lokasi...");
  const [kegiatan, setKegiatan] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'Full' | '16:9' | '4:3' | '1:1'>('Full');

  const toggleAspectRatio = () => {
    const ratios: ('Full' | '16:9' | '4:3' | '1:1')[] = ['Full', '16:9', '4:3', '1:1'];
    const currentIndex = ratios.indexOf(aspectRatio);
    setAspectRatio(ratios[(currentIndex + 1) % ratios.length]);
  };

  const getVideoConstraints = () => {
    const base = { facingMode: "environment" };
    // For mobile (portrait), width is smaller than height, so 16:9 aspect ratio is actually 9/16 = 0.5625
    switch (aspectRatio) {
      case '16:9': return { ...base, aspectRatio: 9/16 };
      case '4:3': return { ...base, aspectRatio: 3/4 };
      case '1:1': return { ...base, aspectRatio: 1 };
      case 'Full': default: return base; // let it fill the space
    }
  };

  const getWrapperClasses = () => {
    switch (aspectRatio) {
      case '1:1': return 'w-full aspect-square relative overflow-hidden bg-black flex items-center justify-center';
      case '4:3': return 'w-full aspect-[3/4] relative overflow-hidden bg-black flex items-center justify-center';
      case '16:9': return 'w-full aspect-[9/16] relative overflow-hidden bg-black flex items-center justify-center';
      case 'Full': default: return 'absolute inset-0 bg-black overflow-hidden flex items-center justify-center';
    }
  };

  // Fetch Location
  const fetchLocation = useCallback(() => {
    setAddress("Mengambil lokasi...");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
            const data = await response.json();
            setAddress(data.display_name || "Alamat tidak ditemukan");
          } catch (error) {
            console.error("Error fetching address:", error);
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setAddress("Izin lokasi ditolak");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setAddress("Geolocation tidak didukung");
    }
  }, []);

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 60000); 
    return () => clearInterval(interval);
  }, [fetchLocation]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);

        const baseSize = Math.min(canvas.width, canvas.height);

        // --- STAMP DESIGN (Gradient + Logo) ---
        const gradientHeight = canvas.height * 0.35;
        const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        const logoImg = new Image();
        logoImg.src = "/logo-bogor.png";
        logoImg.onload = () => {
          const logoSize = baseSize * 0.15;
          const padding = baseSize * 0.05;
          ctx.drawImage(logoImg, padding, canvas.height - logoSize - padding, logoSize, logoSize);
          
          const textStartX = padding + logoSize + (baseSize * 0.03);
          let currentY = canvas.height - logoSize - padding + (baseSize * 0.03);

          if (kegiatan) {
            ctx.font = `bold ${baseSize * 0.035}px sans-serif`;
            ctx.fillStyle = "#fbbf24";
            ctx.fillText(`📝 ${kegiatan.toUpperCase()}`, textStartX, currentY);
            currentY += baseSize * 0.045;
          }

          ctx.font = `${baseSize * 0.025}px sans-serif`;
          ctx.fillStyle = "white";
          const now = new Date();
          ctx.fillText(`📅 ${now.toLocaleDateString('id-ID')} - ${now.toLocaleTimeString('id-ID')}`, textStartX, currentY);
          currentY += baseSize * 0.035;

          if (location) {
            ctx.font = `${baseSize * 0.025}px sans-serif`;
            ctx.fillText(`📍 Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`, textStartX, currentY);
            currentY += baseSize * 0.035;
          }

          ctx.font = `${baseSize * 0.025}px sans-serif`;
          wrapText(ctx, `🏠 ${address}`, textStartX, currentY, canvas.width - textStartX - padding, baseSize * 0.035);

          setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
        };
        logoImg.onerror = () => {
           // Fallback if logo fails to load
           setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
        };
      }
    };
  }, [location, address, kegiatan]);

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, kegiatan: kegiatan || "Tanpa_Nama" }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setUploadSuccess(true);
        setTimeout(() => {
          setUploadSuccess(false);
          setCapturedImage(null);
          setKegiatan("");
        }, 3000);
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (e) { alert("Kesalahan jaringan."); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden text-white flex flex-col justify-between">
      
      {/* Top Bar Icons */}
      <div className="p-6 flex justify-between items-center z-40 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0">
        <div className="flex gap-6 items-center">
          <Zap size={22} className="opacity-80" />
          <div className="flex items-center gap-1 border border-white/30 rounded-md px-1.5 py-0.5 bg-black/20">
            <Paperclip size={14} />
            <span className="text-[10px] font-bold">+</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <RefreshCw size={22} className="opacity-80 cursor-pointer" onClick={fetchLocation} />
          <button onClick={toggleAspectRatio} className="opacity-80 hover:opacity-100 flex items-center gap-1 bg-black/30 rounded-full px-2 py-1">
            <Settings size={20} />
            <span className="text-[10px] font-bold">{aspectRatio}</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative pt-20 pb-40">
        <div className={getWrapperClasses()}>
          {!capturedImage ? (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={getVideoConstraints()}
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain bg-black" />
          )}

          {/* Info Overlay - HIDE IF CAPTURED */}
          {!capturedImage && (
            <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-6 pt-20 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
              <div className="flex items-end gap-4 pointer-events-auto">
                <img src="/logo-bogor.png" alt="Logo Bogor" className="w-16 h-16 object-contain drop-shadow-md" />
                <div className="flex-1 flex flex-col justify-end min-w-0 pb-1">
                  {kegiatan && (
                    <p className="text-[13px] font-bold truncate uppercase tracking-tight text-[#fbbf24] mb-1 drop-shadow-md">📝 {kegiatan}</p>
                  )}
                  <p className="text-[11px] text-white drop-shadow-md mb-1 font-medium">
                    📅 {new Date().toLocaleDateString('id-ID')} - {new Date().toLocaleTimeString('id-ID')}
                  </p>
                  {location && (
                    <p className="text-[11px] text-white drop-shadow-md mb-1 font-medium">
                      📍 Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                    </p>
                  )}
                  <p className="text-[11px] text-white drop-shadow-md line-clamp-2 leading-snug font-medium">
                    🏠 {address}
                  </p>
                </div>
              </div>
              <input 
                type="text" 
                placeholder="NAMA KEGIATAN..."
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                className="w-full bg-black/20 border-b border-white/30 text-[11px] py-2 outline-none placeholder:text-white/50 uppercase tracking-widest mt-4 px-2 pointer-events-auto"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-6 pb-12 z-50">
        <div className="flex flex-col gap-4">
          {/* Zoom & Shutter */}
          <div className="flex justify-center items-center gap-12">
            {!capturedImage ? (
              <>
                <span className="text-xs font-bold text-yellow-400">1x</span>
                <button 
                  onClick={capture}
                  className="w-20 h-20 rounded-full border-[6px] border-white/30 flex items-center justify-center p-1 group active:scale-90 transition-all"
                >
                  <div className="w-full h-full bg-white rounded-full"></div>
                </button>
                <span className="text-xs font-bold text-white/40">2x</span>
              </>
            ) : (
              <div className="flex gap-4 w-full max-w-sm">
                <button 
                  onClick={() => setCapturedImage(null)}
                  className="flex-1 py-4 rounded-full font-bold text-sm bg-white/10 border border-white/20 uppercase tracking-widest"
                >
                  Ulang
                </button>
                <button 
                  onClick={uploadPhoto}
                  disabled={isUploading || uploadSuccess}
                  className="flex-[2] py-4 rounded-full font-bold text-sm bg-yellow-400 text-black uppercase tracking-widest shadow-lg shadow-yellow-400/20 disabled:opacity-50"
                >
                  {isUploading ? "Mengunggah..." : uploadSuccess ? "BERHASIL!" : "KIRIM LAPORAN"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
