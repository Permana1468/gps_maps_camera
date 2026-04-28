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
    const interval = setInterval(fetchLocation, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [fetchLocation]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    // Create an image object to draw on canvas
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Add a dark gradient overlay at the bottom for text readability
        const gradientHeight = 180;
        const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(0,0,0,0.8)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        // Styling for stamps
        const padding = 30;
        const logoSize = 100;
        
        // --- 1. DRAW LOGO (BOTTOM LEFT) ---
        const logoImg = new Image();
        logoImg.src = "/logo-bogor.png";
        logoImg.onload = () => {
          ctx.drawImage(logoImg, padding, canvas.height - logoSize - padding, logoSize, logoSize);
          
          // --- 2. DRAW TEXT (NEXT TO LOGO) ---
          const textStartX = padding + logoSize + 20;
          let currentY = canvas.height - logoSize - padding + 15;

          // A. Nama Kegiatan (Highlight)
          if (kegiatan) {
            ctx.font = "bold 28px sans-serif";
            ctx.fillStyle = "#fbbf24"; // Amber color
            ctx.fillText(`📝 ${kegiatan.toUpperCase()}`, textStartX, currentY);
            currentY += 40;
          }

          // B. Tanggal & Jam
          ctx.font = "22px sans-serif";
          ctx.fillStyle = "white";
          const now = new Date();
          const dateStr = now.toLocaleDateString('id-ID');
          const timeStr = now.toLocaleTimeString('id-ID');
          ctx.fillText(`📅 ${dateStr} - ${timeStr}`, textStartX, currentY);
          currentY += 35;

          // C. Koordinat
          if (location) {
            ctx.font = "24px sans-serif";
            ctx.fillText(`📍 Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`, textStartX, currentY);
            currentY += 35;
          }

          // D. Alamat (Wrap Text)
          ctx.font = "22px sans-serif";
          wrapText(ctx, `🏠 ${address}`, textStartX, currentY, canvas.width - textStartX - padding, 30);

          setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
        };
      }
    };
  }, [location, address, kegiatan]);

  // Helper for text wrapping on canvas
  const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, y);
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: capturedImage,
          kegiatan: kegiatan || "Tanpa_Nama",
        }),
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
        alert("Gagal upload: " + result.message);
      }
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black relative overflow-hidden text-white font-sans">
      
      {/* Top Bar Icons */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-40 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex gap-6 items-center">
          <Grid size={22} className="opacity-80" />
          <Zap size={22} className="opacity-80" />
          <div className="flex items-center gap-1 border border-white/30 rounded-md px-1.5 py-0.5 bg-black/20">
            <Paperclip size={14} />
            <span className="text-[10px] font-bold">+</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <div className="w-6 h-6 border-2 border-white/40 rounded-sm"></div>
          <RefreshCw size={22} className="opacity-80" />
          <Settings size={22} className="opacity-80" />
        </div>
      </div>

      {/* Full Screen Webcam / Preview */}
      <div className="absolute inset-0 z-0">
        {!capturedImage ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "environment" }}
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain bg-black" />
        )}
      </div>

      {/* Pro Info Overlay (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-32">
        <div className="px-4 flex flex-col gap-4">
          
          {/* Tabs Area */}
          <div className="flex justify-center gap-6 text-[11px] font-bold tracking-widest text-white/60 mb-2">
            <span>BERBAGI LOKASI</span>
            <span className="text-yellow-400 border-b-2 border-yellow-400 pb-1">FOTO</span>
            <span>VIDEO</span>
            <span>PELAPORAN</span>
          </div>

          {/* Main Info Display */}
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-xl flex gap-4 items-center border border-white/10">
            {/* Mini Map Placeholder */}
            <div className="w-24 h-24 bg-slate-800 rounded-lg overflow-hidden shrink-0 relative border border-white/20">
              <img src="https://www.google.com/maps/vt/pb=!1m4!1m3!1i14!2i8484!3i10565!2m3!1e0!2sm!3i420120488!3m8!2sen!3sus!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!5f2" className="w-full h-full object-cover opacity-60" alt="map" />
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="text-red-500" size={24} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-white/20 text-[8px] text-center py-0.5">Google</div>
            </div>

            {/* Location & Meta Text */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold truncate leading-tight uppercase tracking-tight">Kec. Cibungbulang, Jawa Barat</p>
                <span className="text-xs">🇮🇩</span>
              </div>
              <p className="text-[10px] text-white/70 line-clamp-2 leading-tight italic">{address}</p>
              {location && (
                <p className="text-[10px] font-mono text-white/90">
                  Lat {location.lat.toFixed(6)}° Long {location.lng.toFixed(6)}°
                </p>
              )}
              <p className="text-[10px] text-white/60">
                {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID')} GMT +07:00
              </p>
              
              {/* Kegiatan Input (Minimalist) */}
              <input 
                type="text" 
                placeholder="NAMA KEGIATAN..."
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                className="w-full bg-white/10 border-b border-white/20 text-[10px] py-1 outline-none placeholder:text-white/30 uppercase tracking-widest mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pro Shutter & Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-md pt-4 pb-8">
        <div className="flex flex-col gap-6">
          
          {/* Zoom & Camera Buttons */}
          <div className="flex justify-center items-center gap-12">
             {!capturedImage ? (
               <>
                 <span className="text-xs font-bold text-yellow-400 bg-black/40 px-2 py-1 rounded-full border border-yellow-400/30">1x</span>
                 <button 
                  onClick={capture}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 group active:scale-95 transition-transform"
                >
                  <div className="w-full h-full bg-white rounded-full group-hover:bg-slate-200 transition-colors"></div>
                </button>
                <span className="text-xs font-bold text-white/60">2x</span>
               </>
             ) : (
               <div className="flex gap-6 w-full px-12">
                  <button 
                    onClick={() => setCapturedImage(null)}
                    className="flex-1 py-3 px-4 rounded-full font-bold text-xs bg-white/10 border border-white/20 uppercase tracking-widest"
                  >
                    Ulang
                  </button>
                  <button 
                    onClick={uploadPhoto}
                    disabled={isUploading || uploadSuccess}
                    className="flex-[2] py-3 px-4 rounded-full font-bold text-xs bg-yellow-400 text-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {isUploading ? "Mengunggah..." : uploadSuccess ? "Berhasil!" : "Kirim Laporan"}
                  </button>
               </div>
             )}
          </div>

          {/* Bottom Icons Nav */}
          <div className="flex justify-around items-center px-4">
            <div className="flex flex-col items-center gap-1 opacity-60">
              <ImageIcon size={20} />
              <span className="text-[8px] uppercase tracking-tighter">Pratinjau</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-60">
              <MapPin size={20} />
              <span className="text-[8px] uppercase tracking-tighter">Lokasi</span>
            </div>
            <div className="w-10"></div> {/* Spacer for Shutter */}
            <div className="flex flex-col items-center gap-1 opacity-60">
              <Folder size={20} />
              <span className="text-[8px] uppercase tracking-tighter">Default</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-60">
              <LayoutGrid size={20} />
              <span className="text-[8px] uppercase tracking-tighter">Template</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
