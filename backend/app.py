import os
import io
import base64
import uuid
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for Next.js frontend
CORS(app)

SCOPES = ['https://www.googleapis.com/auth/drive.file']
TOKEN_FILE = 'token.json'
FOLDER_ID = os.getenv('DRIVE_FOLDER_ID', '')

def get_drive_service():
    creds = None
    # Token.json stores the user's access and refresh tokens
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            return None
            
    service = build('drive', 'v3', credentials=creds)
    return service

@app.route('/upload', methods=['POST'])
def upload_image():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({'status': 'error', 'message': 'No image data provided'}), 400

    # Extract base64 image data
    image_data = data['image']
    nama_kegiatan = data.get('nama', 'Tanpa_Nama')
    
    try:
        # Strip the data:image/jpeg;base64, part if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
            
        # Add padding if necessary
        image_data += "=" * ((4 - len(image_data) % 4) % 4)
        
        img_bytes = base64.b64decode(image_data)
        
        # Save to Google Drive if credentials exist
        service = get_drive_service()
        if not service:
             return jsonify({'status': 'error', 'message': 'Google Drive credentials not found on server.'}), 500
             
        if not FOLDER_ID:
             return jsonify({'status': 'error', 'message': 'DRIVE_FOLDER_ID is not configured.'}), 500

        # Create file metadata
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        file_name = f"Laporan_{nama_kegiatan.replace(' ', '_')}_{timestamp}.jpg"
        
        file_metadata = {
            'name': file_name,
            'parents': [FOLDER_ID]
        }
        
        media = MediaIoBaseUpload(io.BytesIO(img_bytes), mimetype='image/jpeg', resumable=True)
        
        # Upload file
        file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
        
        return jsonify({
            'status': 'success', 
            'message': 'Foto berhasil diunggah ke Google Drive',
            'file_id': file.get('id'),
            'url': file.get('webViewLink')
        }), 200
        
    except Exception as e:
        print(f"Error uploading: {str(e)}")
        return jsonify({'status': 'error', 'message': f'Gagal mengunggah foto: {str(e)}'}), 500

if __name__ == '__main__':
    # Run server
    app.run(debug=True, port=5000)
