# 13. UI CHANGELOG & CATATAN TEKNIS

> Terakhir diupdate: 20 April 2026

---

## Session 20 April 2026 — UI Overhaul + Bug Fix

### Bug Fix yang Diselesaikan

#### 1. `TOOLS_CATALOG has already been declared` (build error)
- **Penyebab**: Kode lama ter-append setelah `export default Dashboard;` sehingga konstanta dideklarasi dua kali
- **Fix**: Potong file di baris pertama `export default Dashboard;`, hapus duplikat

#### 2. Blank page setelah edit MainLayout
- **Penyebab**: `Avatar` dan `Button` dihapus dari imports tapi masih dipakai di topbar
- **Fix**: Tambahkan kembali `Avatar, Button` ke import dari `antd`

#### 3. Wajan SVG hover glitch (animasi restart saat hover)
- **Penyebab**: CSS `animation-duration: 2s` pada `:hover` merestart animasi dari awal
- **Fix**: Hapus perubahan duration pada hover; hover hanya `scale(1.12)` + brighter glow via `transition`

#### 4. Price Checker — harga kelebihan nol (10x lipat)
- **Penyebab**: Fungsi `parse_idr_price()` di `backend/services/price_checker_logic.py` menggunakan regex `re.sub(r'[^\d]', '', val_str)` yang menghapus titik desimal. Nilai `15000.0` dari Neon DB (JSON float) dikonversi ke string `"15000.0"` lalu titiknya dihapus → `"150000"` (10x lipat)
- **Fix**: Cek `isinstance(val, (int, float))` terlebih dahulu, return langsung. Jika string, coba `float(val_str)` dulu sebelum fallback ke strip-digit

---

### Fitur & Perubahan UI Baru

#### Galaxy Background (`frontend/src/index.css`)
- `body::before`: Galaksi spiral diagonal (~-32deg rotate), core terang di tengah, 4 spiral arms, outer halo
- **Warm sun glow** di pojok kiri bawah: radial gradient amber/orange `rgba(251,191,36,0.18)` + corona `rgba(255,237,180,0.22)`
- Accent nebula pink di pojok kanan atas
- `body::after`: Star-field 5 layer dengan ukuran prima (353, 521, 211, 151, 631px) agar tidak terlihat sebagai grid
- Tidak ada konstellasi (dihapus per permintaan)

#### Wajan SVG Mascot (`frontend/src/layout/MainLayout.jsx`)
- Menggantikan spatula sebelumnya di topbar
- SVG animate: `@keyframes rotate-wajan` + `@keyframes pulse-wajan`
- Hover: `scale(1.12)` + glow, tidak ada perubahan animation-duration

#### Panda Mascot (`frontend/src/components/Panda.jsx`)
- **Posisi**: `position: fixed`, bottom-right viewport, strip lebar 260px
- **Default state**: Duduk (mata ngantuk, kaki melebar ke samping)
- **Klik**: Toggle duduk ↔ jalan
- **Jalan**: Bolak-balik dalam strip, balik arah saat mentok tepi
- **Outline**: SVG `<filter>` dengan `feMorphology dilate radius=1.3` → outline putih tipis dari shape SVG (bukan CSS glow)
- **SVG overflow**: `overflow="visible"` pada kedua SVG agar telinga/kepala tidak ter-clip
- **Tab hidden**: `visibilitychange` event — panda hilang saat tab minimize/hidden, muncul kembali saat aktif
- CSS animations di `frontend/src/index.css`:
  - `.panda-leg-l` / `.panda-leg-r`: `@keyframes panda-leg-l/r` rotate -24deg ↔ 24deg, 0.46s
  - `.panda-walk`: `@keyframes panda-bob` translateY 0 ↔ -2px, 0.46s

#### PageHeader Component (`frontend/src/components/PageHeader.jsx`)
- Reusable header untuk semua halaman tool
- Props: `title`, `subtitle`, `accent` (default `#6366f1`), `actions`
- Visual: left accent bar 3px + title + subtitle + optional action buttons kanan
- Dipakai oleh: PriceChecker, OrderLossReview, PreSalesEstimation, WarehouseOrder, TikTokAds, AffiliateAnalyzer, ShopeeAffiliate

#### Dashboard Redesign (`frontend/src/pages/Dashboard.jsx`)
- Hero section: gradient text + floating orbs, background panel `rgba(99,102,241,0.1)`
- Category headers berwarna per suite: Freemir (#6366f1), Shopee (#f97316), TikTok (#ec4899)
- Cards: top-border accent warna, icon glow, hover glow per suite (`card-freemir/shopee/tiktok`)
- Launch button: ghost outline per suite color (bukan solid button)
- `TOOLS_CATALOG` dengan AntD icons (tidak ada emoji)

#### Emoji → AntD Icons (semua halaman tool)
Semua emoji section header diganti icon Ant Design yang relevan:
- `PriceChecker`: `DownloadOutlined, UploadOutlined, FileTextOutlined, BarChartOutlined, AppstoreOutlined, RiseOutlined, UnorderedListOutlined, BarcodeOutlined, ThunderboltOutlined`
- `OrderLossReview`: `SettingOutlined, UnorderedListOutlined, FolderOpenOutlined, BarChartOutlined, FundOutlined`
- `PreSalesEstimation`: `SettingOutlined, FolderOpenOutlined, FileTextOutlined, TableOutlined`
- `WarehouseOrder`: `SettingOutlined, ShoppingOutlined, InboxOutlined, CalendarOutlined, BarChartOutlined, TableOutlined`
- `TikTokAds`: `InfoCircleOutlined, FolderOpenOutlined, BarChartOutlined`
- `ShopeeAffiliate`: `CalendarOutlined, InfoCircleOutlined` (dropdown labels + info box)

---

### File yang Diubah / Dibuat

| File | Status | Keterangan |
|---|---|---|
| `frontend/src/index.css` | Modified | Galaxy bg, star-field, panda CSS keyframes, wajan animations |
| `frontend/src/layout/MainLayout.jsx` | Modified | Wajan SVG, Panda import + render, AntD menu icons |
| `frontend/src/components/PageHeader.jsx` | **BARU** | Shared page header component |
| `frontend/src/components/Panda.jsx` | **BARU** | Animated panda mascot |
| `frontend/src/pages/Dashboard.jsx` | Modified | Full redesign: galaxy hero, colorful cards, outline buttons |
| `frontend/src/pages/PriceChecker.jsx` | Modified | PageHeader, emoji→icons, tab label icons |
| `frontend/src/pages/OrderLossReview.jsx` | Modified | PageHeader (accent #f97316), emoji→icons |
| `frontend/src/pages/PreSalesEstimation.jsx` | Modified | PageHeader (accent #ec4899), emoji→icons |
| `frontend/src/pages/WarehouseOrder.jsx` | Modified | PageHeader (accent #6366f1), emoji→icons |
| `frontend/src/pages/TikTokAds.jsx` | Modified | PageHeader (accent #ec4899), emoji→icons |
| `frontend/src/pages/AffiliateAnalyzer.jsx` | Modified | PageHeader (accent #ec4899) |
| `frontend/src/pages/ShopeeAffiliate.jsx` | Modified | PageHeader (accent #f97316), emoji→icons |
| `backend/services/price_checker_logic.py` | Modified | Fix `parse_idr_price()` — 10x price inflation bug |

---

### Commits Hari Ini

```
8081ecf  ui: remove constellations, panda starts sitting (click to walk)
7baff70  fix: parse_idr_price mangled float values causing 10x price inflation
e73f65c  ui: panda mascot, galaxy bg, colorful dashboard, emoji->icons cleanup, PageHeader component
```

---

### Arsitektur Saat Ini (Update)

| Komponen | Platform | Notes |
|---|---|---|
| **Frontend** | Google Cloud Run (asia-southeast1) | Auto-deploy via Cloud Build dari push ke `main` |
| **Backend** | Render.com (`render-anti-gravity.onrender.com`) | Auto-deploy dari push ke `main` |
| **Database** | Neon PostgreSQL (NEW) | `ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb` |
| **Price Data** | Neon — tabel `freemir_prices` + `freemir_names` | Di-sync dari Google Sheets via tombol Sync Prices |

> **PENTING**: Database sudah migrasi ke Neon. VPS PostgreSQL (34.126.76.58) sudah tidak dipakai.
> Neon connection string ada di `backend/.env`:
> ```
> DATABASE_URL=postgresql://neondb_owner:npg_e1Jl3rWoTcAR@ep-withered-butterfly-ao66aczs-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
> ```
