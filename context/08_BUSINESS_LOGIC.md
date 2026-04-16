# 8. BUSINESS LOGIC & PRICING

## 💰 Price Tier System

### 16 Price Tiers Overview

Antigravity maintains 16 different price tiers untuk optimal revenue management:

| # | Tier Name | Use Case | Typical Discount | Frequency |
|---|-----------|----------|-----------------|-----------|
| 1 | Warning | Baseline/alert price | 0% | Always |
| 2 | Daily-Discount | Daily routine discount | 5-10% | Daily |
| 3 | Flash-Sale | Quick flash promo | 20-30% | Hourly |
| 4 | Promotion | Strategic promotion | 10-15% | Weekly |
| 5 | Bundle | Multi-item purchase | 5-20% | Varies |
| 6 | Seasonal | Holiday/seasonal | 15-25% | Seasonal |
| 7 | Clearance | Final clearance sale | 30-50% | As needed |
| 8 | VIP | VIP customer exclusive | 10-20% | Ongoing |
| 9 | Bulk | Bulk purchase discount | 5-15% | Ongoing |
| 10 | Regional | Region-specific pricing | 0-20% | Regional |
| 11 | Partner | Partner/affiliate pricing | 10-25% | Partner deals |
| 12 | Loyalty | Loyalty member discount | 5-10% | If loyalty tier |
| 13 | Early-Bird | Early purchase incentive | 10-20% | Limited time |
| 14 | Last-Minute | Last-minute clearance | 40-60% | Hours before close |
| 15 | Competition | Competition matching | 0-10% | Market-driven |
| 16 | Premium | Premium product markup | 20-50% | Premium category |

### Default Audit Price
**Warning Price** (Tier 1) is used as baseline untuk audit comparisons

---

## 🎁 Bundle Discount Strategy

### Bundle Definition
Bundle = Multiple SKUs dalam satu order (Online SKU length > 15)

### Discount Schedule

```python
def get_bundle_discount_rate(sku_count: int) -> float:
    """
    More items = Higher discount incentive
    """
    if sku_count == 1:    return 0.00   # Single item, no bundle discount
    if sku_count == 2:    return 0.05   # 2 items: 5% off
    if sku_count == 3:    return 0.10   # 3 items: 10% off
    if sku_count == 4:    return 0.15   # 4 items: 15% off
    if sku_count >= 5:    return 0.20   # 5+ items: 20% off (max)
```

### Example Bundle Calculation

```
Order #999 (Bundle):
├─ Item 1 (SKU_A): 100,000 × (1 - 0.15) = 85,000    [4-item discount]
├─ Item 2 (SKU_B): 50,000 × (1 - 0.15)  = 42,500
├─ Item 3 (SKU_C): 50,000 × (1 - 0.15)  = 42,500
├─ Item 4 (SKU_D): 50,000 × (1 - 0.15)  = 42,500
└─ Total: 212,500 (vs 250,000 without bundle)
   Savings: 37,500 (15% off)
```

---

## 🎁 Gift Item Handling

### Gift Item Definition
Items dalam category "Gift" atau "$gift"

### Pricing Logic

```python
if category.lower() == "gift":
    is_gift = True
    
    # In single purchase: Full price
    if bundle_size == 1:
        gift_factor = 1.0
    
    # In bundle: Gift worth 50% of normal price
    else:
        gift_factor = 0.5

total_price += item_price * gift_factor
```

### Example

```
Bundle dengan 1 produk asli + 1 gift:
├─ Product A: 100,000 IDR
├─ Gift Item: 50,000 × 0.5 = 25,000 IDR
└─ Total: 125,000 IDR

vs Bundle tanpa gift:
├─ Product A: 100,000 IDR
├─ Product B: 50,000 IDR
└─ Total: 150,000 IDR (lebih mahal)
```

---

## 🏷️ Clearance Item Strategy

### When Clearance Applies
- Clearance price > 0 (có clearance)
- Clearance price becomes floor price (tidak bisa lebih murah)

### Pricing Logic

```python
clearance_value = item_data.get('Clearance')

if clearance_value > 0:
    # Use clearance as minimum
    is_clearance = True
    item_price = clearance_value
    # Ignores all other tiers
else:
    # Use normal tier price
    is_clearance = False
    item_price = item_data.get(price_tier, 0)
```

### Example

```
SKU: CLEAR_001
├─ Warning Price: 500,000 IDR
├─ Daily Discount: 450,000 IDR
├─ Clearance Price: 200,000 IDR ← This is used!
└─ Result: Sold at 200,000 (final clearance price)
   Not affected by tier selection
```

---

## 📊 Profit & Loss Calculation

### Formula

```
Profit/Loss = Selling Price - Cost

For each item:
  Unit Profit = Selling Price - Cost Price

For each order:
  Order Profit = Sum of Unit Profits
  = Sum(Selling Price - Cost Price)
```

### Example Order Calculation

```
Order #12345:
├─ Item A: Sold 100,000 | Cost 60,000 | Profit: +40,000
├─ Item B: Sold  80,000 | Cost 85,000 | Profit: -5,000
├─ Item C: Sold  50,000 | Cost 40,000 | Profit: +10,000
└───────────────────────────────────────
   Order Profit: +45,000 ✅ (Safe)

Order #67890:
├─ Item A: Sold  75,000 | Cost 90,000 | Profit: -15,000
├─ Item B: Sold  40,000 | Cost 45,000 | Profit: -5,000
└───────────────────────────────────────
   Order Profit: -20,000 ⚠️ (Need Review)
```

---

## 💳 Voucher & Discount Strategy

### Voucher Acceptance Rule

```
Reasonable Voucher: 0-3% of selling price
Excessive Voucher: > 3% of selling price (problem!)
```

### Calculation

```python
voucher_percentage = (seller_coupon / setting_price) * 100

Example:
  Selling Price: 100,000 IDR
  Coupon Given:  2,000 IDR
  Voucher %:     2% ✅ (OK)

  Selling Price: 100,000 IDR
  Coupon Given:  5,000 IDR
  Voucher %:     5% ⚠️ (Excessive)
```

### Business Rule
- Generous coupons = Higher loss risk
- > 3% = Flagged untuk review
- Review to prevent abuse/loss

---

## 🏪 Store-Level Metrics

### By Store Analysis

```python
# Group orders by store
store_summary = df.groupby('Store').agg({
    'Product Detail Gross Profit': 'sum',
    'Sales Loss': 'sum',
    'Orders': 'count'
})

# Calculate store performance
for store in stores:
    total_profit = store_summary[store]['Total Net']
    loss_percentage = store_summary[store]['Sales Loss'] / total_profit
    
    if loss_percentage > 0.2:  # >20% loss
        flag_for_review(store)
```

### Example Store Report

```
Store: Jakarta Central
├─ Orders: 25
├─ Total Profit: 500,000 IDR
├─ Sales Loss: -50,000 IDR
├─ Loss %: 10% (acceptable)
└─ Status: Normal ✅

Store: Surabaya Branch
├─ Orders: 15
├─ Total Profit: 200,000 IDR
├─ Sales Loss: -100,000 IDR
├─ Loss %: 33% (high!)
└─ Status: Review Recommended ⚠️
```

---

## 📈 Product-Level Analysis

### SKU Performance

```python
# Group orders by Product (SKU)
product_summary = df.groupby('System Product Code').agg({
    'Product Detail Gross Profit': 'sum',
    'Sales Loss': 'sum',
    'Units Sold': 'sum'
})

# Find problematic products
for sku in skus:
    if product_summary[sku]['Average Profit'] < 0:
        flag_as_unprofitable(sku)
```

### Example Product Report

```
SKU: PROD_001 (Popular Item)
├─ Units Sold: 50
├─ Total Profit: 250,000 IDR
├─ Avg Profit/Unit: 5,000 IDR
└─ Status: Healthy ✅

SKU: PROD_999 (Clearance Item)
├─ Units Sold: 20
├─ Total Profit: -20,000 IDR
├─ Avg Profit/Unit: -1,000 IDR
└─ Status: Loss Maker ⚠️ (Reconsider pricing)
```

---

## 🎯 First-Time vs Repeat Customer

**Not currently tracked, but could be added:**

```python
class CustomerSegment:
    FIRST_TIME = "first_time"      # New customer
    REPEAT = "repeat"              # Existing customer
    VIP = "vip"                    # High-value customer
    
    # Could apply different pricing/discounts per segment
    # Example: 10% off for first-time, normal for repeat
```

---

## 📊 Seasonality & Promotions

### Current Implementation
- Price tiers separate untuk seasonal
- Manual updates required

### Ideal Future
```python
promotion_calendar = {
    "2026-04-17": "Hari Raya Sale (30% off)",
    "2026-04-20": "Birthday Sale (25% off)",
    "2026-06-17": "Mid-Year Clearance (40% off)"
}

# Auto apply discount based on date
def get_price(sku, date):
    if date in promotion_calendar:
        promo = promotion_calendar[date]
        discount = extract_discount_percent(promo)
        return base_price * (1 - discount)
    return base_price
```

---

## 🔄 Cost of Goods Sold (COGS)

### Tracking
```python
class SKU:
    sku: str
    cost_price: float        # What we paid vendor
    supplier: str
    warehouse_location: str
```

### Profit Calculation (Refined)
```
Profit = (Selling Price - Coupon) - Cost Price

Example:
  Customer pays: 100,000 IDR
  We gave coupon: 10,000 IDR
  Net received: 90,000 IDR
  Cost: 60,000 IDR
  Profit: 30,000 IDR
```

---

## 📋 Pricing Rules Summary

1. **Bundle Discount:** 2+ items = 5-20% off
2. **Gift Items:** 50% value in bundles
3. **Clearance:** Floor price (no discounting)
4. **Voucher Limit:** < 3% of price
5. **Loss Alert:** Order profit ≤ 0
6. **Price Gap:** Setting ≥ Brand price

---

## 🧮 Excel Output Columns Explained

### "By Order" sheet columns:

```
Original Order Number       → Unique order ID
Store | 店铺               → Store location
Sales Loss | 销售损失       → Negative profit items
After Sales Loss | 售后损失 → Returns/refunds loss
Total Loss | 总损失          → Sum of losses
Total Profit | 总利润       → Sum of profits
Final Profit | 最终利润     → Net (profit - loss)
First Judge | 第一判断      → Profit-based (Safe/Review)
Second Judge | 第二判断     → Gap/Voucher-based (Safe/Review)
Setting Price | 设定价格    → What customer paid
Brand Price | 品牌价格     → Database reference
Gap | 差价                 → setting - brand
% Voucher | 优惠券比例     → coupon / setting
```

---

## 📚 Related Files

- [ORDER_LOSS_AUDIT.md](05_ORDER_LOSS_AUDIT.md) - Audit algorithm
- [DATABASE.md](02_DATABASE.md) - Price database schema
- [API_ENDPOINTS.md](06_API_ENDPOINTS.md) - Price management API

---

**Next: Read [09_DEPLOYMENT.md](09_DEPLOYMENT.md) untuk understand production deployment**
