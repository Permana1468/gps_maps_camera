"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, MapPin, Loader2, UploadCloud, RefreshCw, CheckCircle2, Paperclip, ChevronDown } from 'lucide-react';

export default function CameraApp() {
  const webcamRef = useRef<Webcam>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("Mengambil lokasi...");
  const [kegiatan, setKegiatan] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Fetch Location
  const fetchLocation = useCallback(() => {
    setAddress("Mengambil lokasi...");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });

          try {
            // Reverse geocoding
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
            const data = await res.json();
            setAddress(data.display_name || "Alamat tidak ditemukan");
          } catch (e) {
            setAddress(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
          }
        },
        (error) => {
          console.error(error);
          setAddress("Akses lokasi ditolak atau gagal.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setAddress("Geolokasi tidak didukung di browser ini.");
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Capture Image and Stamp
  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
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
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Add a dark gradient overlay at the bottom for text readability
        const gradientHeight = 180;
        const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        // Load Logo Bogor
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = "/logo-bogor.png";
        logoImg.onload = () => {
          const logoSize = 60;
          const logoRatio = logoImg.height / logoImg.width;
          const logoW = logoSize;
          const logoH = logoSize * logoRatio;
          drawTexts(logoW, logoH, logoImg);
        };
        logoImg.onerror = () => {
          drawTexts(0, 0, null);
        };

        const drawTexts = (logoW: number, logoH: number, logoImg: HTMLImageElement | null) => {
          const textX = 20 + logoW + (logoW ? 15 : 0);
          let currentY = canvas.height - 120; // Start Y position

          if (logoImg) {
            // Draw logo so it aligns nicely with the text block
            // We use currentY as a reference to make it perfectly centered alongside the text
            const textBlockApproxHeight = (kegiatan ? 25 : 0) + 20 + (location ? 20 : 0) + 30;
            const logoY = currentY - 15 + (textBlockApproxHeight / 2) - (logoH / 2);
            ctx.drawImage(logoImg, 20, logoY, logoW, logoH);
          }

          // Text settings
          ctx.textAlign = "left";
          
          // Activity Name
          if (kegiatan) {
            ctx.fillStyle = "#fbbf24"; // Amber 400
            ctx.font = "bold 16px Inter, sans-serif";
            ctx.fillText(`📝 ${kegiatan.toUpperCase()}`, textX, currentY);
            currentY += 25;
          }

          // Timestamp
          ctx.fillStyle = "#ffffff";
          const now = new Date();
          const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const timeStr = now.toLocaleTimeString('id-ID');
          ctx.font = "normal 12px Inter, sans-serif";
          ctx.fillText(`📅 ${dateStr} - ${timeStr}`, textX, currentY);
          currentY += 20;
          
          // Coordinates
          if (location) {
            ctx.font = "13px Inter, sans-serif";
            ctx.fillText(`📍 Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`, textX, currentY);
            currentY += 20;
          }
          
          // Address (wrap text if too long)
          ctx.font = "13px Inter, sans-serif";
          const maxWidth = canvas.width - textX - 20;
          wrapText(ctx, `🏠 ${address}`, textX, currentY, maxWidth, 18);

          const stampedImage = canvas.toDataURL("image/jpeg", 0.9);
          setCapturedImage(stampedImage);
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
      // Send to Flask Backend
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
      alert("Terjadi kesalahan jaringan saat menghubungi server.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background Layer - Simplified */}
      <div className="absolute inset-0 bg-[#fdfdfd] z-0"></div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* Floating Header & Form Card */}
        <div className="px-6 pt-6 pb-2 space-y-4">
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-4 shadow-sm border border-white/50">
            {/* Toggle Header */}
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="w-full flex items-center justify-between p-2"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                  <img src="/logo-bogor.png" alt="Logo Bogor" className="w-6 h-auto" />
                </div>
                <div>
                  <h1 className="text-lg font-serif text-[#3a5a40] leading-none mb-0.5">Buat Dokumen</h1>
                  <p className="text-[10px] tracking-[0.1em] text-[#84a59d] font-medium uppercase">Desa Cimanggu I</p>
                </div>
              </div>
              <div className={`transition-transform duration-300 ${isFormOpen ? 'rotate-180' : ''}`}>
                <ChevronDown className="text-[#84a59d]" size={20} />
              </div>
            </button>

            {/* Collapsible Form */}
            <div className={`overflow-hidden transition-all duration-300 ${isFormOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="px-2 pb-2 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] tracking-[0.2em] font-bold text-[#84a59d] uppercase ml-1">Keterangan Kegiatan</label>
                  <input 
                    type="text" 
                    placeholder="Tulis nama kegiatan..."
                    value={kegiatan}
                    onChange={(e) => setKegiatan(e.target.value)}
                    className="w-full py-2 px-1 text-base font-medium border-b border-slate-100 focus:border-[#52796f] outline-none transition-all placeholder:text-slate-200 bg-transparent"
                  />
                </div>

                {/* Location Display */}
                <div className="flex items-start gap-3">
                  <MapPin className="text-[#84a59d] mt-1 shrink-0" size={14} />
                  <div className="text-[12px] text-slate-500 flex-1 leading-snug italic">
                    {address}
                  </div>
                  <button onClick={fetchLocation} className="p-1 hover:bg-slate-50 rounded-full transition-colors text-[#84a59d]">
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Camera Area */}
        <div className="flex-1 relative mt-2 px-4 pb-4">
          <div className="w-full h-full bg-[#111] rounded-[40px] overflow-hidden shadow-2xl relative">
            {!capturedImage ? (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }}
                  className="w-full h-full object-cover"
                />
                {/* Dynamic Overlay Preview */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent text-white pointer-events-none">
                   <div className="flex items-end gap-4">
                     <img src="/logo-bogor.png" alt="Logo Bogor" className="w-10 h-auto opacity-95 shrink-0" />
                     <div className="space-y-0.5 flex-1 pb-1">
                       {kegiatan && <p className="text-[#fbbf24] font-bold text-[12px] leading-tight mb-0.5 uppercase tracking-wider">📝 {kegiatan}</p>}
                       <p className="text-[9px] opacity-80 leading-tight">📅 {new Date().toLocaleDateString('id-ID')} - {new Date().toLocaleTimeString('id-ID')}</p>
                       {location && (
                         <p className="text-[10px] opacity-90 leading-tight">
                           📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                         </p>
                       )}
                       <p className="text-[10px] line-clamp-1 opacity-90 leading-tight">🏠 {address.split(',')[0]}</p>
                     </div>
                   </div>
                </div>
              </>
            ) : (
              <img src={capturedImage || ""} alt="Captured" className="w-full h-full object-cover" />
            )}
          </div>
        </div>
      </div>

      {/* Controls - Floating at bottom */}
      <div className="absolute bottom-8 left-0 right-0 px-8 z-30 flex justify-center">
        {!capturedImage ? (
          <button 
            onClick={capture}
            className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform group border border-white/30"
          >
            <div className="w-16 h-16 bg-[#3a5a40] rounded-full flex items-center justify-center shadow-lg">
              <Camera size={28} className="text-white" />
            </div>
          </button>
        ) : (
          <div className="bg-white/90 backdrop-blur-2xl rounded-full p-1.5 flex gap-1.5 border border-white shadow-2xl w-full max-w-sm">
            <button 
              onClick={() => setCapturedImage(null)}
              className="flex-1 py-4 px-6 rounded-full font-medium text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw size={16} />
              Ulang
            </button>
            <button 
              onClick={uploadPhoto}
              disabled={isUploading || uploadSuccess}
              className="flex-[1.5] py-4 px-6 rounded-full font-medium bg-[#354f52] text-white shadow-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2 text-sm disabled:opacity-70"
            >
              {isUploading ? (
                <><Loader2 size={16} className="animate-spin"/> Tunggu...</>
              ) : uploadSuccess ? (
                <><CheckCircle2 size={16}/> Berhasil!</>
              ) : (
                <><Paperclip size={16} /> Simpan Dokumen</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
