"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { 
  Camera, 
  MapPin, 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  Paperclip, 
  Zap, 
  Settings, 
  Grid, 
  Image as ImageIcon, 
  Folder, 
  LayoutGrid,
  Calendar,
  Home,
  Clock,
  Navigation
} from 'lucide-react';

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
    switch (aspectRatio) {
      case '16:9': return { ...base, aspectRatio: 9/16 };
      case '4:3': return { ...base, aspectRatio: 3/4 };
      case '1:1': return { ...base, aspectRatio: 1 };
      case 'Full': default: return base;
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

        // --- STAMP DESIGN (Futuristic DJI/Tesla Style) ---
        const gradientHeight = canvas.height * 0.35;
        const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(0,0,0,0.8)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        const logoImg = new Image();
        logoImg.src = "/logo-bogor.png";
        logoImg.onload = () => {
          const logoSize = baseSize * 0.14;
          const padding = baseSize * 0.05;
          ctx.drawImage(logoImg, padding, canvas.height - logoSize - padding, logoSize, logoSize);
          
          const textStartX = padding + logoSize + (baseSize * 0.04);
          let currentY = canvas.height - logoSize - padding + (baseSize * 0.02);

          // Technical Header
          if (kegiatan) {
            ctx.font = `bold ${baseSize * 0.04}px sans-serif`;
            ctx.fillStyle = "#fbbf24";
            ctx.fillText(kegiatan.toUpperCase(), textStartX, currentY);
            currentY += baseSize * 0.05;
          }

          // Data Rows with Symbols
          ctx.fillStyle = "white";
          
          // Date & Time
          ctx.font = `${baseSize * 0.028}px sans-serif`;
          const now = new Date();
          ctx.fillText(`📅 ${now.toLocaleDateString('id-ID')} | ${now.toLocaleTimeString('id-ID')}`, textStartX, currentY);
          currentY += baseSize * 0.04;

          // GPS
          if (location) {
            ctx.font = `bold ${baseSize * 0.028}px monospace`;
            ctx.fillText(`📍 GPS: ${location.lat.toFixed(6)}°, ${location.lng.toFixed(6)}°`, textStartX, currentY);
            currentY += baseSize * 0.04;
          }

          // Address
          ctx.font = `${baseSize * 0.026}px sans-serif`;
          wrapText(ctx, `🏠 ${address}`, textStartX, currentY, canvas.width - textStartX - padding, baseSize * 0.035);

          setCapturedImage(canvas.toDataURL("image/jpeg", 0.95));
        };
        logoImg.onerror = () => setCapturedImage(canvas.toDataURL("image/jpeg", 0.95));
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
    <div className="h-screen w-screen bg-black relative overflow-hidden text-white flex flex-col font-sans selection:bg-yellow-400 selection:text-black">
      
      {/* Top HUD (DJI Style) */}
      <div className="p-6 flex justify-between items-start z-40 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0">
        <div className="flex gap-5 items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase mb-1">Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-xs font-bold tracking-wider">LIVE</span>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-white/10 mx-1"></div>
          <Zap size={20} className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer" />
          <Paperclip size={20} className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer" />
        </div>

        <div className="flex gap-6 items-center pt-1">
          <RefreshCw size={20} className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer active:rotate-180 transition-transform duration-500" onClick={fetchLocation} />
          <button 
            onClick={toggleAspectRatio} 
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 hover:bg-white/20 transition-all active:scale-95"
          >
            <Settings size={16} className="opacity-80" />
            <span className="text-[10px] font-bold tracking-widest">{aspectRatio}</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
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
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain bg-black transition-opacity duration-500" />
          )}

          {/* Futuristic Overlay HUD */}
          {!capturedImage && (
            <div className="absolute bottom-0 left-0 right-0 z-20 px-8 pb-10 pt-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
              <div className="flex items-end gap-6 pointer-events-auto">
                <div className="relative group shrink-0">
                  <div className="absolute -inset-2 bg-yellow-400/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <img src="/logo-bogor.png" alt="Logo" className="w-20 h-20 object-contain drop-shadow-2xl relative" />
                </div>
                
                <div className="flex-1 flex flex-col justify-end min-w-0 pb-1 space-y-2">
                  {kegiatan && (
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-yellow-400 rounded-full"></div>
                      <p className="text-[14px] font-black truncate uppercase tracking-[0.1em] text-yellow-400 drop-shadow-md">{kegiatan}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2.5 text-white/90">
                      <Calendar size={14} className="text-white/60" />
                      <span className="text-[11px] font-medium tracking-wide">
                        {new Date().toLocaleDateString('id-ID')} <span className="text-white/30 mx-1">|</span> {new Date().toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    
                    {location && (
                      <div className="flex items-center gap-2.5 text-white/90">
                        <Navigation size={14} className="text-white/60" />
                        <span className="text-[11px] font-mono font-bold tracking-tight">
                          {location.lat.toFixed(6)}°, {location.lng.toFixed(6)}°
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2.5 text-white/90">
                      <Home size={14} className="text-white/60 mt-0.5 shrink-0" />
                      <p className="text-[11px] font-medium leading-relaxed line-clamp-2 italic opacity-80">
                        {address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimalist Input */}
              <div className="mt-6 relative pointer-events-auto max-w-sm">
                <input 
                  type="text" 
                  placeholder="ID KEGIATAN / KETERANGAN..."
                  value={kegiatan}
                  onChange={(e) => setKegiatan(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[11px] font-bold outline-none placeholder:text-white/20 uppercase tracking-[0.2em] focus:bg-white/10 focus:border-yellow-400/50 transition-all backdrop-blur-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Futuristic Control Bar */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/5 px-8 pt-8 pb-12 z-50">
        <div className="max-w-md mx-auto flex flex-col gap-8">
          <div className="flex justify-center items-center gap-16">
            {!capturedImage ? (
              <>
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <span className="text-[10px] font-black tracking-tighter">0.5</span>
                </div>
                
                <button 
                  onClick={capture}
                  className="relative group active:scale-95 transition-all duration-200"
                >
                  <div className="absolute -inset-4 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition duration-500"></div>
                  <div className="w-22 h-22 rounded-full border-[3px] border-white/20 flex items-center justify-center p-1.5 relative">
                    <div className="w-full h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)]"></div>
                  </div>
                </button>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black tracking-tighter text-yellow-400">1.0</span>
                  <div className="w-1 h-1 rounded-full bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.6)]"></div>
                </div>
              </>
            ) : (
              <div className="flex gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setCapturedImage(null)}
                  className="flex-1 py-4 rounded-2xl font-black text-xs bg-white/5 border border-white/10 uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95"
                >
                  Ulang
                </button>
                <button 
                  onClick={uploadPhoto}
                  disabled={isUploading || uploadSuccess}
                  className="flex-[2] py-4 rounded-2xl font-black text-xs bg-yellow-400 text-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(250,204,21,0.3)] hover:bg-yellow-300 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={16} /> : uploadSuccess ? <CheckCircle2 size={16} /> : null}
                  {isUploading ? "PROCESS..." : uploadSuccess ? "SUCCESS" : "UPLOAD REPORT"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
