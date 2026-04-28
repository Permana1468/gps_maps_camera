import os
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# Izin akses penuh ke Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def main():
    creds = None
    # Jika sudah pernah login, token akan disimpan di token.json
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # Jika belum login atau token kadaluarsa
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Menggunakan credentials.json (OAuth Client ID) yang Anda buat di Cloud Console
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Simpan token untuk digunakan nanti
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    
    print("\n[BERHASIL] Token Anda sudah disimpan di file 'token.json'")

if __name__ == '__main__':
    main()
