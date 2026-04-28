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

        // --- STAMP DESIGN (PRO STYLE) ---
        const boxHeight = canvas.height * 0.22;
        const boxY = canvas.height - boxHeight - 20;
        const boxX = 20;
        const boxWidth = canvas.width - 40;
        const borderRadius = 20;

        // Draw Translucent Box
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
        ctx.fill();

        // Draw Mini Map Placeholder
        const mapSize = boxHeight - 30;
        const mapX = boxX + 15;
        const mapY = boxY + 15;
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.roundRect(mapX, mapY, mapSize, mapSize, 10);
        ctx.fill();
        
        // Mock Map Lines
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        for(let i=0; i<5; i++) {
          ctx.beginPath(); ctx.moveTo(mapX, mapY + (i*mapSize/5)); ctx.lineTo(mapX+mapSize, mapY + (i*mapSize/5)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(mapX + (i*mapSize/5), mapY); ctx.lineTo(mapX + (i*mapSize/5), mapY+mapSize); ctx.stroke();
        }
        
        // Draw Red Pin
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(mapX + mapSize/2, mapY + mapSize/2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Text Content
        const textX = mapX + mapSize + 20;
        let textY = mapY + 25;

        // Title
        ctx.font = "bold 24px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText("KEC. CIBUNGBULANG, JAWA BARAT", textX, textY);
        
        textY += 30;
        ctx.font = "italic 16px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        wrapText(ctx, address, textX, textY, boxWidth - mapSize - 60, 20);

        textY += 45;
        ctx.font = "bold 18px monospace";
        ctx.fillStyle = "white";
        if (location) {
          ctx.fillText(`Lat ${location.lat.toFixed(6)}° Long ${location.lng.toFixed(6)}°`, textX, textY);
        }

        textY += 25;
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        const now = new Date();
        ctx.fillText(`${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')} GMT +07:00`, textX, textY);

        if (kegiatan) {
          textY += 30;
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = "#fbbf24";
          ctx.fillText(`KEGIATAN: ${kegiatan.toUpperCase()}`, textX, textY);
        }

        setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
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

    <div className="h-screen w-screen bg-black relative overflow-hidden text-white flex flex-col justify-between">
      
      {/* Top Bar Icons */}
      <div className="p-6 flex justify-between items-center z-40 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0">
        <div className="flex gap-6 items-center">
          <button onClick={toggleAspectRatio} className="opacity-80 hover:opacity-100 flex items-center justify-center border border-white/50 rounded px-2 py-1 min-w-[3rem]">
            <span className="text-xs font-bold">{aspectRatio}</span>
          </button>
          <Zap size={22} className="opacity-80" />
          <div className="flex items-center gap-1 border border-white/30 rounded-md px-1.5 py-0.5 bg-black/20">
            <Paperclip size={14} />
            <span className="text-[10px] font-bold">+</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <RefreshCw size={22} className="opacity-80 cursor-pointer" />
          <Settings size={22} className="opacity-80 cursor-pointer" />
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
            <div className="absolute bottom-4 left-0 right-0 z-20 px-4 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl flex gap-4 items-center border border-white/10 pointer-events-auto shadow-2xl">
                {/* Mini Map */}
                <div className="w-20 h-20 bg-slate-800 rounded-2xl overflow-hidden shrink-0 relative border border-white/20">
                  <img src="https://www.google.com/maps/vt/pb=!1m4!1m3!1i14!2i8484!3i10565!2m3!1e0!2sm!3i420120488!3m8!2sen!3sus!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!5f2" className="w-full h-full object-cover opacity-60" alt="map" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin className="text-red-500" size={20} />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <p className="text-[12px] font-bold truncate uppercase tracking-tight text-white mb-0.5">Kec. Cibungbulang, Jawa Barat</p>
                  <p className="text-[10px] text-white/80 line-clamp-2 leading-snug italic mb-1">{address}</p>
                  {location && (
                    <p className="text-[10px] font-mono text-white/90 mb-0.5">
                      Lat {location.lat.toFixed(6)}° Long {location.lng.toFixed(6)}°
                    </p>
                  )}
                  <p className="text-[9px] text-white/60 mb-1">
                    {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID')} GMT +07:00
                  </p>
                  <input 
                    type="text" 
                    placeholder="NAMA KEGIATAN..."
                    value={kegiatan}
                    onChange={(e) => setKegiatan(e.target.value)}
                    className="w-full bg-white/5 border-b border-white/10 text-[10px] py-1 outline-none placeholder:text-white/40 uppercase tracking-widest mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-6 pb-8 z-50">
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
