"""
Script untuk menambahkan kolom permission ke tab Account di Google Sheets.
Jalankan dari folder backend: python add_permission_columns.py
"""

import gspread
import os
import sys

# Force UTF-8 output so emoji work on all terminals
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1aS1wpEJ5jIYFYYsZT1U4-gabyb5XwGn4u1-OpRhiucc"
CREDENTIALS_FILE = "credentials.json"

TOOL_KEYS = [
    "price_checker",
    "order_planner",
    "order_review",
    "affiliate_performance",
    "pre_sales",
    "affiliate_analyzer",
    "ads_analyzer",
]

def main():
    print("[*] Connecting to Google Sheets...")
    client = gspread.service_account(filename=CREDENTIALS_FILE)
    sh = client.open_by_url(SPREADSHEET_URL)
    ws = sh.worksheet("Account")

    # Get current headers
    headers = ws.row_values(1)
    print(f"[*] Current headers: {headers}")

    # Find which tool keys are missing
    missing = [tk for tk in TOOL_KEYS if tk not in headers]
    already_exist = [tk for tk in TOOL_KEYS if tk in headers]

    if already_exist:
        print(f"[OK] Already exist: {already_exist}")

    if not missing:
        print("[OK] All permission columns already exist! Nothing to add.")
        print_instructions(headers, ws)
        return

    # Add missing headers after last existing column
    start_col = len(headers) + 1
    print(f"\n[+] Adding {len(missing)} missing columns starting at column {start_col}: {missing}")

    for i, key in enumerate(missing):
        col_idx = start_col + i
        ws.update_cell(1, col_idx, key)
        print(f"    + Added '{key}' at column {col_idx}")

    print("\n[OK] Done! All permission columns added.")
    
    # Re-fetch headers after update
    headers = ws.row_values(1)
    print_instructions(headers, ws)


def print_instructions(headers, ws):
    all_rows = ws.get_all_records()
    print(f"\n[INFO] Sheet Summary:")
    print(f"   Headers : {headers}")
    print(f"   Total users: {len(all_rows)}")
    
    print("\n" + "="*60)
    print("CARA MEMBERIKAN AKSES:")
    print("="*60)
    print("Buka Google Sheets -> tab 'Account'")
    print("Kolom permission: price_checker | order_planner | order_review")
    print("                  affiliate_performance | pre_sales | affiliate_analyzer | ads_analyzer")
    print()
    print("Nilai:  1 = punya akses  |  0 = tidak punya akses")
    print()
    print("Setelah edit -> jalankan sync:")
    print("  POST http://localhost:8000/api/auth/sync-users")
    print("  (atau klik tombol sync di admin panel)")
    print()
    print("Kemudian user harus RE-LOGIN agar permission JWT terupdate.")
    print("="*60)

    if all_rows:
        print("\nUser list:")
        for row in all_rows:
            uname = row.get("Username", "?")
            approval = row.get("Approval", "?")
            perms = {k: row.get(k, "?") for k in ["price_checker","order_planner","order_review","affiliate_performance","pre_sales","affiliate_analyzer","ads_analyzer"]}
            print(f"   [{approval}] {uname}: {perms}")


if __name__ == "__main__":
    main()
