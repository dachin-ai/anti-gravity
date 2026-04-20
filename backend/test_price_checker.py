#!/usr/bin/env python3
import os
os.environ['DATABASE_URL'] = 'postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

from services.price_checker_logic import load_product_database, calculate_prices

# Load database
price_db, name_map, link_map = load_product_database()

print(f'✓ Loaded {len(price_db)} SKUs from Neon')
print()

# Test with sample SKU
sku = 'FR0208A47801'
if sku in price_db:
    print(f'✅ SKU FOUND: {sku}')
    info = price_db[sku]
    print(f'  Category: {info.get("Category")}')
    
    # Calculate price
    result = calculate_prices(sku, price_db, name_map, link_map)
    print()
    print('✅ Price calculation result:')
    for tier, price in list(result.items())[:5]:
        print(f'  {tier}: {price}')
    print('  ...')
else:
    print(f'❌ SKU NOT found: {sku}')
    print(f'Available SKUs: {list(price_db.keys())[:5]}')
