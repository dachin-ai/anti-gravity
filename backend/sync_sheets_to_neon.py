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

# Setup database connection (uses environment variable if available)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")

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
        name_sheet = sh.worksheet("Name")
        name_data = name_sheet.get_all_values()
        print(f"✓ Found product names: {len(name_data)} rows")
    except:
        name_data = []
        print("⚠ Product names sheet not found (optional)")
        
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
    
    # Sync product name data
    if name_data:
        cols = name_data[0]
        df = pd.DataFrame(name_data[1:], columns=cols)
        df = df[df.iloc[:, 0].astype(str).str.strip() != ""]  # Remove empty rows
        
        sku_col = cols[0]
        name_col = "Product Name" if "Product Name" in cols else (cols[1] if len(cols) > 1 else None)
        link_col = "Link" if "Link" in cols else (cols[2] if len(cols) > 2 else None)
        
        name_count = 0
        for _, row in df.iterrows():
            sku = str(row[sku_col]).strip()
            name = str(row[name_col]) if name_col and name_col in row else ""
            link = str(row[link_col]) if link_col and link_col in row else ""
            
            # Insert into database
            sql = text("""
            INSERT INTO freemir_name (sku, product_name, link)
            VALUES (:sku, :product_name, :link)
            ON CONFLICT (sku) DO UPDATE
            SET product_name = EXCLUDED.product_name, link = EXCLUDED.link
            """)
            db.execute(sql, {"sku": sku, "product_name": name, "link": link})
            name_count += 1
        
        db.commit()
        print(f"✓ Synced {name_count} product name records")
    
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
