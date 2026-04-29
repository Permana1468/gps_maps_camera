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
  Navigation,
  RotateCcw
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
  
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [orientation, setOrientation] = useState(0);

  // Orientation Listener
  useEffect(() => {
    const handleOrientation = () => {
      if (typeof window !== "undefined" && window.screen.orientation) {
        setOrientation(window.screen.orientation.angle);
      }
    };
    window.addEventListener("orientationchange", handleOrientation);
    handleOrientation();
    return () => window.removeEventListener("orientationchange", handleOrientation);
  }, []);

  const toggleAspectRatio = () => {
    const ratios: ('Full' | '16:9' | '4:3' | '1:1')[] = ['Full', '16:9', '4:3', '1:1'];
    const currentIndex = ratios.indexOf(aspectRatio);
    setAspectRatio(ratios[(currentIndex + 1) % ratios.length]);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  const toggleFlash = async () => {
    const stream = webcamRef.current?.video?.srcObject as MediaStream;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = (track as any).getCapabilities?.();

    if (capabilities?.torch) {
      const nextState = !isFlashOn;
      try {
        await track.applyConstraints({ advanced: [{ torch: nextState }] } as any);
        setIsFlashOn(nextState);
      } catch (e) { console.error("Flash error:", e); }
    } else {
      alert("Flash tidak didukung di perangkat ini.");
    }
  };

  const getVideoConstraints = () => {
    const base = { facingMode };
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
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        },
        (error) => setAddress("Izin lokasi ditolak"),
        { enableHighAccuracy: true }
      );
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

        // --- MATCHING UI STAMP DESIGN ---
        const gradientHeight = canvas.height * 0.4;
        const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, "rgba(0,0,0,0.5)");
        gradient.addColorStop(1, "rgba(0,0,0,0.9)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        const logoImg = new Image();
        logoImg.src = "/logo-bogor.png";
        logoImg.onload = () => {
          const logoSize = baseSize * 0.16;
          const padding = baseSize * 0.08;
          const textPaddingLeft = baseSize * 0.05;
          ctx.drawImage(logoImg, padding, canvas.height - logoSize - padding - (baseSize * 0.08), logoSize, logoSize);
          
          const textStartX = padding + logoSize + textPaddingLeft;
          let currentY = canvas.height - logoSize - padding - (baseSize * 0.06);

          if (kegiatan) {
            ctx.font = `bold ${baseSize * 0.04}px sans-serif`;
            ctx.fillStyle = "#fbbf24";
            ctx.fillText(kegiatan.toUpperCase(), textStartX, currentY);
            currentY += baseSize * 0.05;
          }

          ctx.fillStyle = "white";
          
          // Date
          ctx.font = `${baseSize * 0.028}px sans-serif`;
          const now = new Date();
          ctx.fillText(`📅 ${now.toLocaleDateString('id-ID')} | ${now.toLocaleTimeString('id-ID')}`, textStartX, currentY);
          currentY += baseSize * 0.045;

          // GPS
          if (location) {
            ctx.font = `bold ${baseSize * 0.028}px monospace`;
            ctx.fillText(`📍 ${location.lat.toFixed(6)}°, ${location.lng.toFixed(6)}°`, textStartX, currentY);
            currentY += baseSize * 0.045;
          }

          // Address
          ctx.font = `${baseSize * 0.028}px sans-serif`;
          wrapText(ctx, `🏠 ${address}`, textStartX, currentY, canvas.width - textStartX - padding, baseSize * 0.038);

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
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
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
    <div className="h-screen w-screen bg-black relative overflow-hidden text-white flex flex-col font-sans">
      
      {/* HUD Bar - Minimalist */}
      <div className="p-6 flex justify-between items-center z-40 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-xs font-black tracking-[0.2em]">LIVE</span>
          </div>
          <div className="w-[1px] h-4 bg-white/20 mx-1"></div>
          <Zap 
            size={22} 
            className={`transition-all cursor-pointer ${isFlashOn ? "text-yellow-400 fill-yellow-400" : "opacity-70"}`} 
            onClick={toggleFlash}
          />
          <RefreshCw 
            size={22} 
            className="opacity-70 hover:opacity-100 transition-all cursor-pointer" 
            onClick={toggleCamera} 
          />
        </div>

        <div className="flex gap-6 items-center">
          <button 
            onClick={toggleAspectRatio} 
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 hover:bg-white/20 transition-all active:scale-95"
          >
            <Settings size={18} className="opacity-80" />
            <span className="text-[11px] font-black tracking-[0.1em]">{aspectRatio}</span>
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
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain bg-black" />
          )}

          {/* Futuristic Overlay HUD */}
          {!capturedImage && (
            <div className="absolute bottom-0 left-0 right-0 z-20 px-8 pb-14 pt-32 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none transition-transform duration-300">
              <div className="flex items-end gap-6 pointer-events-auto">
                <img src="/logo-bogor.png" alt="Logo" className="w-20 h-20 object-contain drop-shadow-2xl relative mb-2" />
                
                <div className="flex-1 flex flex-col justify-end min-w-0 pb-1 space-y-2.5">
                  {kegiatan && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-yellow-400 rounded-full"></div>
                      <p className="text-[15px] font-black truncate uppercase tracking-[0.05em] text-yellow-400 drop-shadow-md">{kegiatan}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="flex items-center gap-3 text-white">
                      <Calendar size={14} className="opacity-60" />
                      <span className="text-[12px] font-bold tracking-tight">
                        {new Date().toLocaleDateString('id-ID')} <span className="opacity-30 mx-1">|</span> {new Date().toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    
                    {location && (
                      <div className="flex items-center gap-3 text-white">
                        <MapPin size={14} className="opacity-60" />
                        <span className="text-[12px] font-mono font-black tracking-tighter">
                          {location.lat.toFixed(6)}°, {location.lng.toFixed(6)}°
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3 text-white">
                      <Home size={14} className="opacity-60 mt-0.5 shrink-0" />
                      <p className="text-[12px] font-bold leading-snug line-clamp-2 opacity-90">
                        {address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimalist Input */}
              <div className="mt-8 relative pointer-events-auto">
                <input 
                  type="text" 
                  placeholder="ID KEGIATAN / KETERANGAN..."
                  value={kegiatan}
                  onChange={(e) => setKegiatan(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-[12px] font-black outline-none placeholder:text-white/30 uppercase tracking-[0.1em] focus:bg-white/15 focus:border-yellow-400/50 transition-all backdrop-blur-md"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transparent Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-14 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-md flex justify-center items-center pointer-events-auto">
          {!capturedImage ? (
            <button 
              onClick={capture}
              className="relative group active:scale-90 transition-all duration-200"
            >
              <div className="absolute -inset-6 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition duration-500"></div>
              <div className="w-24 h-24 rounded-full border-[4px] border-white/40 flex items-center justify-center p-2 relative">
                <div className="w-full h-full bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.5)]"></div>
              </div>
            </button>
          ) : (
            <div className="flex gap-6 w-full px-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <button 
                onClick={() => setCapturedImage(null)}
                className="flex-1 py-5 rounded-2xl font-black text-sm bg-white/10 border border-white/20 uppercase tracking-[0.2em] hover:bg-white/20 transition-all active:scale-95 backdrop-blur-md"
              >
                Ulang
              </button>
              <button 
                onClick={uploadPhoto}
                disabled={isUploading || uploadSuccess}
                className="flex-[2] py-5 rounded-2xl font-black text-sm bg-yellow-400 text-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(250,204,21,0.4)] hover:bg-yellow-300 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isUploading ? <Loader2 className="animate-spin" size={20} /> : uploadSuccess ? <CheckCircle2 size={20} /> : null}
                {isUploading ? "PROCESS..." : uploadSuccess ? "SUCCESS" : "UPLOAD REPORT"}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
