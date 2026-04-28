"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, MapPin, Loader2, UploadCloud, RefreshCw, CheckCircle2 } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 pb-20">
      <div className="p-4 space-y-4">
        {/* Input Kegiatan */}
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Kegiatan</label>
          <input 
            type="text" 
            placeholder="Contoh: Pembangunan Jalan Desa"
            value={kegiatan}
            onChange={(e) => setKegiatan(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* Location Display */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3 shadow-sm">
          <MapPin className="text-blue-500 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-slate-600 dark:text-slate-300 flex-1">
            {address}
          </div>
          <button onClick={fetchLocation} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <RefreshCw size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Camera / Preview Area */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
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
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white pointer-events-none pt-24">
               <div className="flex items-center gap-3">
                 <img src="/logo-bogor.png" alt="Logo Bogor" className="w-14 h-auto opacity-95 shrink-0" />
                 <div className="space-y-1 flex-1">
                   {kegiatan && <p className="text-amber-400 font-bold text-sm leading-tight">📝 {kegiatan.toUpperCase()}</p>}
                   <p className="text-[11px] font-normal leading-tight">📅 {new Date().toLocaleDateString('id-ID')} - {new Date().toLocaleTimeString('id-ID')}</p>
                   {location && <p className="text-[12px] leading-tight">📍 Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>}
                   <p className="text-[12px] line-clamp-2 leading-tight">🏠 {address}</p>
                 </div>
               </div>
            </div>
          </>
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] absolute bottom-0 w-full">
        {!capturedImage ? (
          <div className="flex justify-center">
            <button 
              onClick={capture}
              className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center border-4 border-blue-200 dark:border-blue-900 shadow-xl active:scale-95 transition-transform"
            >
              <Camera size={32} className="text-white" />
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={() => setCapturedImage(null)}
              className="flex-1 py-3 px-4 rounded-xl font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
            >
              Foto Ulang
            </button>
            <button 
              onClick={uploadPhoto}
              disabled={isUploading || uploadSuccess}
              className="flex-1 py-3 px-4 rounded-xl font-medium bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:bg-blue-700 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <><Loader2 size={20} className="animate-spin"/> Mengunggah...</>
              ) : uploadSuccess ? (
                <><CheckCircle2 size={20}/> Berhasil!</>
              ) : (
                <><UploadCloud size={20}/> Simpan ke Drive</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
