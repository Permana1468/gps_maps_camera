@echo off
echo ==============================================
echo Menjalankan GPS Maps Camera Server...
echo ==============================================

echo [1/2] Menjalankan Backend Flask (Port 5000)
cd backend
start cmd /k "py app.py"
cd ..

echo [2/2] Menjalankan Frontend Next.js (Port 3000)
cd frontend
start cmd /k "npm run dev"
cd ..

echo Selesai! Server sedang berjalan di dua jendela baru.
echo Buka http://localhost:3000 di browser Anda.
