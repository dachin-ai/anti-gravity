import os
import datetime
import gspread
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
from models import ActivityLog

# Constants for Google Sheets from auth_logic.py
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1GoIpse2K5piWfw5J1urkoZj6KWY3zBo8UX0TAmvUZ1M"
if os.path.exists("/etc/secrets/credentials.json"):
    CREDENTIALS_FILE = "/etc/secrets/credentials.json"
else:
    CREDENTIALS_FILE = "credentials.json"

def main():
    print("Membaca data dari Google Sheets...")
    client = gspread.service_account(filename=CREDENTIALS_FILE)
    sh = client.open_by_url(SPREADSHEET_URL)
    
    ws = None
    all_sheet_names = [s.title for s in sh.worksheets()]
    for candidate in ["Activity Log", "activity log", "ActivityLog", "Activity_Log"]:
        if candidate in all_sheet_names:
            ws = sh.worksheet(candidate)
            break
            
    if not ws:
        print("Tidak ada Sheet bernama 'Activity Log'. Migrasi dibatalkan.")
        return
        
    records = ws.get_all_records()
    print(f"Ditemukan {len(records)} baris data log pada Google Sheets.")
    
    print("Menghubungkan ke Neon PostgreSQL Server...")
    # This will create the `activity_logs` table
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    print("Mentransfer data ke database Neon...")
    count = 0
    
    # Periksa apakah sudah ada data di database
    existing_count = db.query(ActivityLog).count()
    if existing_count > 0:
        print("Perhatian: Sudah ada data pada tabel activity_logs di database.")
        print("Migrasi dibatalkan untuk menghindari duplikasi.")
        db.close()
        return

    # Process each record
    for row in records:
        time_str = str(row.get("Time", ""))
        time_val = None
        if time_str:
            try:
                # Coba parse date string
                time_val = datetime.datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                pass
                
        new_log = ActivityLog(
            time=time_val,
            username=str(row.get("Username", "Unknown")),
            tools=str(row.get("Tools", ""))
        )
        db.add(new_log)
        count += 1
        
        # Batch insert optimization for lots of rows
        if count % 1000 == 0:
            db.commit()
            print(f"  {count} baris tersimpan...")
    
    # Commit the rest
    db.commit()
    db.close()
    
    print(f"Sukses! Total {count} baris Activity Log berhasil dipindahkan ke PostgreSQL!")

if __name__ == "__main__":
    main()
