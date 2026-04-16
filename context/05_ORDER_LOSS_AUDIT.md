# 5. ORDER LOSS AUDIT LOGIC (CORE)

## 🎯 What is Order Loss Audit?

**Purpose:** Analyze order profitability by comparing:
- **Setting Price:** What customer actually paid
- **Brand Price:** Price from internal database
- **Alert:** When setting price < brand price (loss detected)

**Output:** Excel report with breakdown by order, product, store + 2-judge classification

---

## 📊 Audit Algorithm Overview

### Input
- Excel file with Shopee orders (114 rows × 22 columns = 60 orders)
- Price database (214 SKU with 16 price tiers)

### Processing
1. Load & clean data
2. Map columns (with whitespace handling!)
3. Aggregate orders
4. Lookup prices
5. Calculate profit/loss
6. Apply judging rules
7. Generate Excel

### Output
```json
{
  "total_orders": 60,
  "total_transactions": 114,
  "safe_orders": 9,
  "review_orders": 51,
  "sales_loss": -1040312,
  "total_profit": 868517,
  "final_profit": -171795
}
```

---

## 🔍 First Judge Logic

### Rule: Profit vs Loss

```
Calculate: Total Profit per order
           = Sum of (Product Detail Gross Profit) for all items

IF profit > 0:
    → "Safe | 安全" (No loss detected)

ELSE (profit ≤ 0):
    → "Need Review | 需要审查" (Loss detected, needs investigation)
```

### Example

```
Order #12345:
├─ Item 1: Profit = +50,000 IDR
├─ Item 2: Profit = -10,000 IDR
├─ Item 3: Profit = +5,000 IDR
└─ Total Profit = +45,000 IDR
    → Result: "Safe | 安全" ✅

Order #67890:
├─ Item 1: Profit = -30,000 IDR
├─ Item 2: Profit = -20,000 IDR
└─ Total Profit = -50,000 IDR
    → Result: "Need Review | 需要审查" ⚠️
```

### Code Implementation

```python
# File: order_loss_logic.py

def process_data_grouped(df, group_col):
    """Group by order and calculate totals"""
    
    # Separate losses and profits
    temp['Loss_Val'] = temp['Product Detail Gross Profit'].apply(
        lambda x: x if x < 0 else 0
    )
    temp['Profit_Val'] = temp['Product Detail Gross Profit'].apply(
        lambda x: x if x >= 0 else 0
    )
    
    # Group by order
    grouped = temp.groupby(group_col).agg({
        'Loss_Val': 'sum',
        'Profit_Val': 'sum',
        'Product Detail Gross Profit': 'sum'
    }).reset_index()
    
    # First Judge: Based on final profit
    grouped['First Judge | 第一判断'] = grouped['Final Profit | 最终利润'].apply(
        lambda x: "Need Review | 需要审查" if float(x) <= 0 else "Safe | 安全"
    )
    
    return grouped
```

---

## 🔎 Second Judge Logic

### Rule: Price Gap + Voucher Percentage

```
Calculate 1: Gap = Setting Price - Brand Price
             (Usually positive if no issue)
             (Negative if setting < brand, problem!)

Calculate 2: Voucher % = Seller Coupon / Setting Price
             (Usually 0-5%)
             (> 3% is excessive, problem!)

Judgment:
IF gap < 0 OR voucher% > 3%:
    → "Need Review | 需要审查" (Needs investigation)
ELSE:
    → "Safe | 安全" (OK)
```

### Formula Breakdown

```
gap = setting_price - brand_price

Example 1:
  Setting Price: 100,000 IDR (what customer paid)
  Brand Price:    80,000 IDR (from database)
  Gap:            +20,000 IDR (healthy margin)
  Result: OK ✅

Example 2:
  Setting Price:  60,000 IDR
  Brand Price:    80,000 IDR
  Gap:            -20,000 IDR (selling below cost!)
  Result: ⚠️ PROBLEM


voucher% = coupon / setting_price

Example 1:
  Coupon:         5,000 IDR
  Setting Price: 100,000 IDR
  Voucher%:       5% (reasonable)
  Result: OK ✅

Example 2:
  Coupon:         10,000 IDR
  Setting Price: 100,000 IDR
  Voucher%:       10% (too high!)
  Result: ⚠️ PROBLEM
```

### Code Implementation

```python
def evaluate_second_judge(setting_price, brand_price, pct_voucher):
    """
    IMPORTANT: Must convert to float before comparison!
    (Pandas Series comparison causes ambiguous error)
    """
    
    # Convert to scalar float
    pct = float(pct_voucher) if pd.notna(pct_voucher) else 0
    sp = float(setting_price) if pd.notna(setting_price) else 0
    bp = float(brand_price) if pd.notna(brand_price) else 0
    
    # Rule 1: Voucher > 3%?
    if pct > 0.03:
        return "Need Review | 需要审查"
    
    # Rule 2: Setting < Brand (negative gap)?
    elif sp < bp:
        return "Need Review | 需要审查"
    
    else:
        return "Safe | 安全"

# Usage in apply:
order_metrics['Second Judge | 第二判断'] = order_metrics.apply(
    lambda x: evaluate_second_judge(
        x['Setting Price | 设定价格'],
        x['Brand Price | 品牌价格'],
        x['% Voucher | 优惠券比例']
    ),
    axis=1
)
```

---

## 💰 Price Lookup System

### Setting Price (What Customer Paid)

**Priority:** (First found wins)

```
1. Order allocated amount (订单分摊金额)
   └─ If available → USE THIS

2. Product Detail Amount After Discount (商品明细优惠后金额)
   └─ If allocated not found → USE THIS

3. Fallback: 0
   └─ If nothing found → SKIP AUDIT
```

### Brand Price (Database Reference)

**Lookup:** By System SKU in price table

```python
def get_order_brand_details(sys_codes_list, online_skus_list, price_db, price_type):
    """
    price_type: "Warning" (default), "Daily-Discount", etc.
    """
    
    total_brand_price = 0.0
    
    for sys_code, online_sku in zip(sys_codes_list, online_skus_list):
        is_bundle = len(online_sku) > 15  # Multi-item bundle?
        
        if is_bundle:
            # Bundle: Multiple SKUs → apply discount
            skus = clean_sku_list(sys_code)
            disc_rate = get_bundle_discount_rate(len(skus))
            
            for sku in skus:
                item_data = price_db.get(sku)
                if not item_data:
                    return [0, "-", "-"]  # Price data missing
                
                item_price = float(item_data.get(price_type, 0))
                total_brand_price += item_price * (1 - disc_rate)
        else:
            # Single item
            item_data = price_db.get(sys_code)
            if not item_data:
                return [0, "-", "-"]
            
            item_price = float(item_data.get(price_type, 0))
            total_brand_price += item_price
    
    return [int(round(total_brand_price)), mark_gift, mark_clearance]
```

---

## 🎁 Special Cases

### Bundle Discount

When order has multiple SKUs:

```python
def get_bundle_discount_rate(sku_count):
    """
    Multi-SKU bundles get automatic discount
    """
    if sku_count == 1: return 0.00   # No discount
    if sku_count == 2: return 0.05   # 5% off
    if sku_count == 3: return 0.10   # 10% off
    if sku_count == 4: return 0.15   # 15% off
    if sku_count >= 5: return 0.20   # 20% off (max)
```

### Gift Items

Marked with special "Has Gift" flag, pricing adjusted:

```python
if category.lower() == "gift":
    is_gift = True
    gift_factor = 0.5  # Gift worth 50% of normal price in bundle
else:
    is_gift = False
    gift_factor = 1.0

total_price += item_price * gift_factor
```

### Clearance Items

Special handling for clearance items:

```python
clearance_val = item_data.get('Clearance')

if clearance_val >= 1:  # Is clearance active?
    # Use clearance as floor price
    is_clearance = True
    item_price = clearance_val
else:
    # Use normal tier price
    is_clearance = False
    item_price = item_data.get(price_type, 0)
```

---

## 🔧 Data Cleaning & Handling

### Critical: Column Name Whitespace

⚠️ **MOST COMMON ERROR:** Leading/trailing spaces in Excel column names

```python
# CRITICAL FIX
df.columns = df.columns.str.strip()  # Must be first step!

# Why? Excel export can have:
# "  Store | 店铺  "  (with spaces)
# Instead of:
# "Store | 店铺"     (clean)
```

### Currency Cleaning

Convert currency strings to integers:

```python
def clean_currency_strict(x):
    try:
        x_str = str(x).strip()
    except:
        return 0
    
    if x_str in ['', 'nan', 'None']:
        return 0
    
    # Remove all non-numeric characters (except minus, dot)
    s = re.sub(r'[^\d\.\,\-]', '', x_str.upper())
    
    # Handle 1000 separator or decimal
    if '.' in s:
        s = s.split('.')[0]  # Take before decimal
    if ',' in s:
        s = s.split(',')[0]  # Take before comma
    
    try:
        return int(s) if s and s != '-' else 0
    except (ValueError, TypeError):
        return 0
```

### Example

```
Input: "IDR 1,234,567"
Output: 1234567

Input: "5.000,50"  (European format)
Output: 5000

Input: ""
Output: 0

Input: "N/A"
Output: 0
```

---

## 📊 Data Aggregation

### Group by Order Number

One order = Multiple items (rows in Excel)

```
Order #123:
├─ Row 1: Item A, Profit: 50,000
├─ Row 2: Item B, Profit: -10,000
└─ Aggregate: Total Profit: 40,000

Order #124:
├─ Row 3: Item C, Profit: -5,000
└─ Aggregate: Total Profit: -5,000
```

### Group Calculations

```python
# For "By Order" summary:
agg_dict = {
    'Product Detail Gross Profit': 'sum',      # Sum profits
    'Product Detail Amount After Discount': 'sum',  # Total amount
    'Seller Coupon': 'first',                 # Coupon value
    'Store': 'first',                         # Store name
    'System Product Code': lambda x: list(x)  # All SKUs in order
}

grouped = df.groupby('Original Order Number').agg(agg_dict)
```

---

## 📈 Excel Output

### 4 Sheets

1. **Raw Data Filtered**
   - Original data with cleaning applied
   - For raw inspection

2. **By Order** (Main summary)
   - Grouped by order number
   - First & Second Judge results
   - Diagnostic reasons

3. **By Product**
   - Grouped by SKU
   - Which products are problem items

4. **By Store**
   - Grouped by store name
   - Store-level performance

### Formatting

```python
# Header
fmt_head = workbook.add_format({
    'bold': True,
    'bg_color': '#4f46e5',          # Blue background
    'font_color': 'white',
    'border': 1,
    'align': 'center'
})

# Conditional formatting
# Loss items: Red background
fmt_loss = workbook.add_format({'bg_color': '#ffebee', 'font_color': '#c62828'})

# Profit items: Green background
fmt_profit = workbook.add_format({'bg_color': '#e8f5e9', 'font_color': '#1b5e20'})

# Apply to data
ws.conditional_format(rng, {
    'type': 'cell',
    'criteria': '<',
    'value': 0,
    'format': fmt_loss
})
```

---

## 🐛 Known Issues & Solutions

### Issue 1: "Truth Value of Series is Ambiguous"

**Problem:**
```python
# WRONG - Causes error
if pct_voucher > 0.03:  # Pandas Series can't be used in if
```

**Solution:**
```python
# CORRECT - Convert to scalar first
pct = float(pct_voucher) if pd.notna(pct_voucher) else 0
if pct > 0.03:  # Now safe
```

### Issue 2: Excel Column Mapping Fails

**Problem:**
```
Sheet has: "  Store | 店铺  " (with spaces)
Code looks for: "Store | 店铺"
Result: Column not found!
```

**Solution:**
```python
# First line of processing
df.columns = df.columns.str.strip()  # Remove spaces!
```

### Issue 3: DataFrame vs Series Type Ambiguity

**Problem:**
```python
# aggregation returns DataFrame instead of Series
col_val = order_metrics['Order allocated amount']
# type(col_val) = DataFrame (unexpected!)
order_metrics['Setting Price'] = col_val.astype(float)  # Error!
```

**Solution:**
```python
# Check type and extract
col_val = order_metrics['Order allocated amount']
if isinstance(col_val, pd.DataFrame):
    col_val = col_val.iloc[:, 0]  # Extract first column
order_metrics['Setting Price'] = col_val.astype(float)
```

---

## 🧪 Test Data

### Test File Used (Real Data)

```
File: 待审核订单 (2).xlsx
Rows: 114 transactions
Columns: 22 (including Store, SKU, Profit, Discount, Coupon)
Orders: 60 unique order numbers
```

### Test Results

```
✓ File loaded successfully
✓ Price database loaded: 214 items
✓ AUDIT COMPLETED SUCCESSFULLY!

Summary:
  total_orders: 60
  safe_orders: 9
  review_orders: 51
  sales_loss: -1,040,312 IDR
  total_profit: 868,517 IDR
  final_profit: -171,795 IDR

✓ Excel file saved: audit_result.xlsx (4 sheets)
```

---

## 📚 Related Files

- [BUSINESS_LOGIC.md](08_BUSINESS_LOGIC.md) - Price tiers & rules
- [CODE_WALKTHROUGH.md](12_CODE_WALKTHROUGH.md) - Detailed function walkthrough
- [TROUBLESHOOTING.md](11_TROUBLESHOOTING.md) - Common issues
- [API_ENDPOINTS.md](06_API_ENDPOINTS.md) - Audit API endpoint

---

**Next: Read [API_ENDPOINTS.md](06_API_ENDPOINTS.md) untuk understand all REST endpoints**
