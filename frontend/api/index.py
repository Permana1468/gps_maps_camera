import os
import io
import json
import base64
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

app = Flask(__name__)
CORS(app)

SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_drive_service():
    creds = None
    # 1. Coba baca dari Environment Variable (Untuk Vercel)
    token_json_str = os.environ.get('GOOGLE_TOKEN_JSON')
    if token_json_str:
        try:
            creds_data = json.loads(token_json_str)
            creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
        except Exception as e:
            print(f"Error loading token from env: {e}")

    # 2. Jika gagal, coba baca dari file lokal (Untuk Testing Lokal)
    if not creds and os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # Refresh token jika sudah kadaluarsa
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception as e:
            print(f"Error refreshing token: {e}")
            return None
            
    if not creds:
        return None
        
    return build('drive', 'v3', credentials=creds)

@app.route('/api/upload', methods=['POST'])
def upload_image():
    try:
        data = request.json
        image_data = data.get('image')
        nama_kegiatan = data.get('kegiatan', 'Tanpa_Nama')
        folder_id = os.environ.get('DRIVE_FOLDER_ID')

        if not image_data:
            return jsonify({'status': 'error', 'message': 'Tidak ada data gambar'}), 400

        # Bersihkan header base64 jika ada
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Tambahkan padding jika hilang
        missing_padding = len(image_data) % 4
        if missing_padding:
            image_data += '=' * (4 - missing_padding)
            
        img_bytes = base64.b64decode(image_data)
        
        service = get_drive_service()
        if not service:
            return jsonify({'status': 'error', 'message': 'Gagal autentikasi Google Drive. Pastikan token sudah benar.'}), 500
             
        if not folder_id:
            return jsonify({'status': 'error', 'message': 'DRIVE_FOLDER_ID belum diatur di Environment Variables.'}), 500

        # Buat metadata file
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        file_name = f"Laporan_{nama_kegiatan.replace(' ', '_')}_{timestamp}.jpg"
        
        file_metadata = {
            'name': file_name,
            'parents': [folder_id]
        }
        
        media = MediaIoBaseUpload(io.BytesIO(img_bytes), mimetype='image/jpeg', resumable=True)
        
        # Upload
        file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
        
        return jsonify({
            'status': 'success', 
            'message': 'Foto berhasil disimpan ke Google Drive!',
            'url': file.get('webViewLink')
        }), 200
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Untuk Vercel, kita perlu mengekspos 'app'
if __name__ == '__main__':
    app.run(debug=True, port=5000)
