#!/usr/bin/env python3
"""
Sync Google Sheets → Neon Database
Syncs price and product name data from Google Sheets to the new Neon database
"""

import os
import gspread
import pandas as pd
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys

# Setup database connection (uses same DATABASE_URL as the backend)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dena_admin:AntiGrav2026Secure@35.198.222.19:5432/antigravity_db")

# Google Sheets config
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1aS1wpEJ5jIYFYYsZT1U4-gabyb5XwGn4u1-OpRhiucc"

if os.path.exists("/etc/secrets/credentials.json"):
    CREDENTIALS_FILE = "/etc/secrets/credentials.json"
else:
    CREDENTIALS_FILE = "credentials.json"

print("=" * 70)
print("🔄 GOOGLE SHEETS → NEON DATABASE SYNC")
print("=" * 70)
print()

# Step 1: Connect to Google Sheets
print("[1/4] Connecting to Google Sheets...")
try:
    client = gspread.service_account(filename=CREDENTIALS_FILE)
    sh = client.open_by_url(SPREADSHEET_URL)
    print("✓ Connected to Google Sheets")
except Exception as e:
    print(f"✗ Failed to connect: {e}")
    sys.exit(1)

# Step 2: Read data from Google Sheets
print("[2/4] Reading data from Google Sheets...")
try:
    # Get price sheet
    price_sheet = sh.worksheet("Price")
    price_data = price_sheet.get_all_values()
    print(f"✓ Found price data: {len(price_data)} rows")
    
    # Get product names sheet
    try:
        name_sheet = sh.worksheet("All_Name")
        name_data = name_sheet.get_all_values()
        print(f"✓ Found product names: {len(name_data)} rows")
    except:
        name_data = []
        print("⚠ Product names sheet not found (optional)")

    # Get AT2 sheet (Mark: New/Old/Clearance/etc.)
    try:
        at2_sheet = sh.worksheet("AT2")
        at2_data = at2_sheet.get_all_values()
        print(f"✓ Found AT2 mark data: {len(at2_data)} rows")
    except:
        at2_data = []
        print("⚠ AT2 sheet not found (mark will be empty)")
        
except Exception as e:
    print(f"✗ Failed to read sheets: {e}")
    sys.exit(1)

# Step 3: Connect to Neon database
print("[3/4] Connecting to Neon database...")
try:
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    # Verify connection
    db.execute(text("SELECT 1"))
    print("✓ Connected to Neon database")
except Exception as e:
    print(f"✗ Failed to connect to database: {e}")
    sys.exit(1)

# Step 4: Sync data
print("[4/4] Syncing data...")

try:
    # Clear existing data
    db.execute(text("DELETE FROM freemir_price"))
    db.execute(text("DELETE FROM freemir_name"))
    db.commit()
    # Ensure mark column exists (safe migration)
    db.execute(text("ALTER TABLE freemir_name ADD COLUMN IF NOT EXISTS mark VARCHAR"))
    db.commit()
    print("✓ Cleared existing data")
    
    # Sync price data
    if price_data:
        cols = price_data[0]
        df = pd.DataFrame(price_data[1:], columns=cols)
        df = df[df.iloc[:, 0].astype(str).str.strip() != ""]  # Remove empty rows
        
        sku_col = cols[0]
        cat_col = "Category" if "Category" in cols else None
        clear_col = "Clearance" if "Clearance" in cols else None
        
        price_count = 0
        for _, row in df.iterrows():
            sku = str(row[sku_col]).strip()
            category = str(row[cat_col]) if cat_col and cat_col in row else ""
            clearance = str(row[clear_col]) if clear_col and clear_col in row else ""
            
            # Extract price columns (dynamic based on sheet)
            prices_dict = {}
            for col in cols:
                if col not in [sku_col, cat_col, clear_col]:
                    try:
                        prices_dict[col] = float(str(row[col]).replace(",", ""))
                    except:
                        pass
            
            # Insert into database
            sql = text("""
            INSERT INTO freemir_price (sku, category, clearance, prices)
            VALUES (:sku, :category, :clearance, :prices)
            ON CONFLICT (sku) DO UPDATE
            SET category = EXCLUDED.category, clearance = EXCLUDED.clearance, prices = EXCLUDED.prices
            """)
            db.execute(sql, {"sku": sku, "category": category, "clearance": clearance, "prices": json.dumps(prices_dict)})
            price_count += 1
        
        db.commit()
        print(f"✓ Synced {price_count} price records")
    
    # Sync product name data (vectorized + filtered)
    if name_data:
        cols = name_data[0]
        df = pd.DataFrame(name_data[1:], columns=cols)

        sku_col = cols[0]
        # All_Name sheet: col A=SKU, col B=English name, col C=Image URL
        name_col = next((c for c in ["English name", "Product Name", "Name"] if c in cols), (cols[1] if len(cols) > 1 else None))
        link_col = next((c for c in ["Image", "Link"] if c in cols), (cols[2] if len(cols) > 2 else None))

        # Build SKU → Mark/Name/Link maps from AT2 sheet
        mark_map = {}
        at2_name_map = {}
        at2_link_map = {}
        if at2_data and len(at2_data) > 1:
            at2_cols = [str(c).strip() for c in at2_data[0]]
            try:
                sku_idx  = next(i for i,v in enumerate(at2_cols) if v.lower() == 'sku')
            except StopIteration:
                sku_idx = 2 if len(at2_cols) > 2 else None
            try:
                mark_idx = next(i for i,v in enumerate(at2_cols) if v.lower() == 'mark')
            except StopIteration:
                mark_idx = 1 if len(at2_cols) > 1 else None
            try:
                name_idx = next(i for i,v in enumerate(at2_cols) if v.lower() in ('name', 'product name', 'item name', 'display name'))
            except StopIteration:
                name_idx = 3 if len(at2_cols) > 3 else None
            try:
                link_idx = next(i for i,v in enumerate(at2_cols) if v.lower() in ('link', 'url', 'product url', 'product_link', 'product link', 'detail url'))
            except StopIteration:
                link_idx = 4 if len(at2_cols) > 4 else None

            for row in at2_data[1:]:
                if sku_idx is None:
                    continue
                sku_value = str(row[sku_idx]).strip() if len(row) > sku_idx else ''
                if not sku_value:
                    continue
                if mark_idx is not None and len(row) > mark_idx:
                    mark_map[sku_value] = str(row[mark_idx]).strip()
                if name_idx is not None and len(row) > name_idx:
                    at2_name_map[sku_value] = str(row[name_idx]).strip()
                if link_idx is not None and len(row) > link_idx:
                    at2_link_map[sku_value] = str(row[link_idx]).strip()

        print(f"✓ Built mark map: {len(mark_map)} SKUs")
        print(f"✓ Built AT2 name map: {len(at2_name_map)} SKUs")
        print(f"✓ Built AT2 link map: {len(at2_link_map)} SKUs")

        skus  = df[sku_col].astype(str).str.strip()
        raw_names = df[name_col].fillna('').astype(str).str.strip() if name_col and name_col in df.columns else pd.Series([''] * len(df))
        raw_links = df[link_col].fillna('').astype(str).str.strip() if link_col and link_col in df.columns else pd.Series([''] * len(df))
        names = []
        links = []
        for i, sku in skus.items():
            if sku and sku in at2_name_map:
                names.append(at2_name_map[sku])
            else:
                names.append(raw_names.iloc[i] if i in raw_names.index else '')
            if sku and sku in at2_link_map:
                links.append(at2_link_map[sku])
            else:
                links.append(raw_links.iloc[i] if i in raw_links.index else '')
        names = pd.Series(names)
        links = pd.Series(links)

        # Only sync SKUs that exist in freemir_price to keep the table small
        result = db.execute(text("SELECT sku FROM freemir_price"))
        valid_skus = {r[0] for r in result.fetchall()}

        mask = skus.isin(valid_skus)
        marks_series = skus.map(mark_map).fillna('')
        records = list(zip(skus[mask], names[mask], links[mask], marks_series[mask]))

        name_count = 0
        if records:
            sql = text("""
                INSERT INTO freemir_name (sku, product_name, link, mark)
                VALUES (:sku, :product_name, :link, :mark)
                ON CONFLICT (sku) DO UPDATE
                SET product_name = EXCLUDED.product_name, link = EXCLUDED.link, mark = EXCLUDED.mark
            """)
            for sku, name, link, mark in records:
                db.execute(sql, {"sku": sku, "product_name": name, "link": link, "mark": mark or None})
            db.commit()
            name_count = len(records)
            print(f"✓ Synced {name_count} product name records (filtered from {len(df)} total)")
    
except Exception as e:
    db.rollback()
    print(f"✗ Sync failed: {e}")
    sys.exit(1)
finally:
    db.close()

print()
print("=" * 70)
print("✓ SYNC COMPLETED SUCCESSFULLY!")
print("=" * 70)
print()
print("Summary:")
print(f"  - Price records: {price_count if price_data else 0}")
print(f"  - Product names: {name_count if name_data else 0}")
print()
print("Next: Test Price Checker API endpoint!")
print()
