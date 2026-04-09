import pandas as pd
import numpy as np
import time
import re

# generate fake data
N = 30000
df = pd.DataFrame(np.random.randint(0,100,size=(N, 40)))
df[1] = 'to ship'
df[9] = 2  # QTY
df[6] = '12345678901+12345678902' # SKU strings
df[38] = 'WH_A'

STATUS_IDX = 1
SKU_IDX = 6
QTY_IDX = 9
WH_IDX = 38

clean_orders = df.copy()

print("Testing iterrows...")
start = time.time()
sku_data = {}
for _, row in clean_orders.iterrows():
    qty = row[QTY_IDX]
    raw_sku_str = str(row[SKU_IDX])
    wh_name = str(row[WH_IDX])
    tokens = re.split(r'[+\-/\s,|]+', raw_sku_str)
    for t in tokens:
        if len(t) >= 11:
            if t not in sku_data:
                sku_data[t] = {'Total QTY': 0}
            sku_data[t]['Total QTY'] += qty
            sku_data[t][wh_name] = sku_data[t].get(wh_name, 0) + qty
print("iterrows time:", time.time() - start)

print("Testing itertuples...")
start = time.time()
sku_data = {}
for row in clean_orders.itertuples(index=False, name=None):
    qty = row[QTY_IDX]
    raw_sku_str = str(row[SKU_IDX])
    wh_name = str(row[WH_IDX])
    tokens = re.split(r'[+\-/\s,|]+', raw_sku_str)
    for t in tokens:
        if len(t) >= 11:
            if t not in sku_data:
                sku_data[t] = {'Total QTY': 0}
            sku_data[t]['Total QTY'] += qty
            sku_data[t][wh_name] = sku_data[t].get(wh_name, 0) + qty
print("itertuples time:", time.time() - start)
