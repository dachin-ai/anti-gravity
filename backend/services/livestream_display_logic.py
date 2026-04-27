import os
import gspread
from database import SessionLocal
from models import LivestreamDisplayItem, LivestreamBaseProduct, FreemirName
from services.product_performance_logic import get_pid_photo_map, get_sku_photo_map, parse_sku_tokens
from services.price_checker_logic import calculate_prices, load_product_database

if os.path.exists("/etc/secrets/credentials.json"):
    CREDENTIALS_FILE = "/etc/secrets/credentials.json"
else:
    CREDENTIALS_FILE = "credentials.json"

LIVESTREAM_DISPLAY_SHEET_URL = os.getenv(
    "LIVESTREAM_DISPLAY_SHEET_URL",
    "https://docs.google.com/spreadsheets/d/1oCAI4EUT1YQQDPxSLcDC097lX4NQWZb64JmN6nY635w/edit?gid=0#gid=0"
)

PRICE_OPTIONS = [
    "Daily-Livestream",
    "DD-Livestream",
    "PD-Livestream",
]

DISPLAY_ROW_ALIASES = {
    "pid": ["pid", "product id", "kode produk"],
    "sequence_no": ["sequence", "sequence_no"],
    "note": ["notes", "remark", "keterangan", "note"],
    "etalase": ["etalase", "display", "showcase", "section", "shelf", "no", "number", "no.", "nomor"],
    "product_name": ["product name", "nama produk", "name", "title"],
}

BASE_ROW_ALIASES = {
    "pid": ["pid", "product id", "kode produk"],
    "product_code": ["product code", "kode produk"],
    "product_name": ["product name", "nama produk", "name", "title"],
    "variation_code": ["variation code", "kode variasi", "variasi kode", "kode varian"],
    "variation_name": ["variation name", "nama variasi", "nama varian"],
    "parent_sku": ["parent sku", "sku induk", "sku parent"],
    "sku": ["sku", "product sku", "system product code", "item code"],
}


def _normalize_header(header: str) -> str:
    return str(header or "").strip().lower()


def _find_column_index(headers: list[str], candidates: list[str]) -> int | None:
    header_map = { _normalize_header(h): idx for idx, h in enumerate(headers) }
    for alias in candidates:
        normalized = alias.lower()
        if normalized in header_map:
            return header_map[normalized]
    return None


def _parse_price(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if text == "" or text.lower() in ("nan", "none", "null"):
        return None
    try:
        return float(text.replace(',', '').replace('Rp', '').replace('IDR', '').strip())
    except ValueError:
        digits = ''.join(ch for ch in text if ch.isdigit() or ch == '.' or ch == ',')
        digits = digits.replace(',', '')
        try:
            return float(digits) if digits else None
        except ValueError:
            return None


def _parse_int(value: object) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    text = str(value).strip()
    if text == "":
        return None
    try:
        return int(float(text))
    except ValueError:
        digits = ''.join(ch for ch in text if ch.isdigit())
        return int(digits) if digits else None


def _get_sheet_client():
    return gspread.service_account(filename=CREDENTIALS_FILE)


def _split_key(title: str) -> tuple[str, str, str]:
    key = title
    if title.lower().endswith("_display"):
        key = title[:-8]
    if title.lower().endswith("_base"):
        key = title[:-5]
    parts = key.split("_", 1)
    store = parts[0].strip() if parts else key.strip()
    etalase = parts[1].strip() if len(parts) > 1 else ""
    return store, etalase, key


def _build_header_indices(headers: list[str], alias_map: dict) -> dict:
    return {key: _find_column_index(headers, aliases) for key, aliases in alias_map.items()}


def _normalize_row(row: list, index: int) -> str:
    return str(row[index]).strip() if index is not None and len(row) > index else ""


def _get_display_row(row: list, indices: dict) -> dict:
    return {
        "pid": _normalize_row(row, indices.get("pid")),
        "etalase": _normalize_row(row, indices.get("etalase")),
        "sequence_no": _parse_int(_normalize_row(row, indices.get("sequence_no"))),
        "notes": _normalize_row(row, indices.get("note")),
        "product_name": _normalize_row(row, indices.get("product_name")),
    }


def _get_base_row(row: list, indices: dict, store: str) -> dict:
    pid = _normalize_row(row, indices.get("pid"))
    sku = _normalize_row(row, indices.get("sku"))
    parent_sku = _normalize_row(row, indices.get("parent_sku"))
    return {
        "store": store,
        "pid": pid,
        "product_code": _normalize_row(row, indices.get("product_code")),
        "product_name": _normalize_row(row, indices.get("product_name")),
        "variation_code": _normalize_row(row, indices.get("variation_code")),
        "variation_name": _normalize_row(row, indices.get("variation_name")),
        "parent_sku": parent_sku,
        "sku": sku or parent_sku,
    }


def _fetch_worksheet_rows(sh, worksheet_name: str) -> list[list[str]]:
    ws = sh.worksheet(worksheet_name)
    return ws.get_all_values()


def sync_livestream_display_sheet(sheet_url: str | None = None) -> int:
    if not sheet_url:
        sheet_url = LIVESTREAM_DISPLAY_SHEET_URL
    if not sheet_url:
        raise ValueError("LIVESTREAM_DISPLAY_SHEET_URL is not configured and no sheet_url was provided.")

    client = _get_sheet_client()
    sh = client.open_by_url(sheet_url)
    worksheet_titles = [ws.title for ws in sh.worksheets()]

    display_titles = [t for t in worksheet_titles if t.lower().endswith("_display")]
    base_titles = {t[:-5]: t for t in worksheet_titles if t.lower().endswith("_base")}
    if not display_titles:
        raise ValueError("No display worksheet was found. Expected a tab ending with _display.")

    display_items = []
    base_products = []

    for display_title in display_titles:
        store, etalase, display_key = _split_key(display_title)
        rows = _fetch_worksheet_rows(sh, display_title)
        if not rows or len(rows) < 2:
            continue

        headers = [str(cell).strip() for cell in rows[0]]
        display_indices = _build_header_indices(headers, DISPLAY_ROW_ALIASES)
        if display_indices["pid"] is None:
            raise ValueError(f"Display sheet '{display_title}' must contain a PID column.")

        for row in rows[1:]:
            display = _get_display_row(row, display_indices)
            if not display["pid"]:
                continue
            row_etalase = display["etalase"].strip() if display["etalase"] else ""
            if not row_etalase and not etalase:
                raise ValueError(
                    f"Display row in sheet '{display_title}' is missing an etalase value. "
                    "Please add an explicit etalase column or name the tab using '<store>_<etalase>_display'."
                )
            display_items.append({
                "store": store,
                "etalase": row_etalase or etalase,
                "pid": display["pid"],
                "sequence_no": display["sequence_no"],
                "notes": display["notes"],
                "product_name": display["product_name"],
                "sort_order": display["sequence_no"],
            })

        base_title = base_titles.get(display_key)
        if base_title:
            base_rows = _fetch_worksheet_rows(sh, base_title)
            if base_rows and len(base_rows) > 1:
                base_headers = [str(cell).strip() for cell in base_rows[0]]
                base_indices = _build_header_indices(base_headers, BASE_ROW_ALIASES)
                if base_indices["pid"] is None or base_indices["sku"] is None:
                    raise ValueError(f"Base sheet '{base_title}' must contain PID and SKU columns.")
                for row in base_rows[1:]:
                    product = _get_base_row(row, base_indices, store)
                    if not product["pid"]:
                        continue
                    base_products.append(product)

    if not display_items:
        raise ValueError("No display rows were found in any livestream display sheet.")

    if not base_products:
        raise ValueError("No base product rows were found. Please provide matching _base tabs.")

    db = SessionLocal()
    try:
        db.query(LivestreamDisplayItem).delete()
        db.query(LivestreamBaseProduct).delete()
        db.commit()
        db.bulk_insert_mappings(LivestreamDisplayItem, display_items)
        db.bulk_insert_mappings(LivestreamBaseProduct, base_products)
        db.commit()
        return len(display_items)
    finally:
        db.close()


def get_price_options() -> list[str]:
    return PRICE_OPTIONS


def get_stores() -> list[str]:
    db = SessionLocal()
    try:
        rows = db.query(LivestreamDisplayItem.store).distinct().order_by(LivestreamDisplayItem.store).all()
        return [row[0] for row in rows if row and row[0]]
    finally:
        db.close()


def get_etalases(store: str | None = None) -> list[str]:
    db = SessionLocal()
    try:
        query = db.query(LivestreamDisplayItem.etalase).distinct()
        if store:
            query = query.filter(LivestreamDisplayItem.store == store)
        rows = query.all()
        etalases = [row[0] for row in rows if row and row[0]]
        def _as_int_or_str(value):
            try:
                return int(value)
            except Exception:
                return value
        return [str(v) for v in sorted(etalases, key=_as_int_or_str)]
    finally:
        db.close()


def get_items(store: str, etalase: str, price_type: str | None = None) -> list[dict]:
    db = SessionLocal()
    try:
        rows = db.query(LivestreamDisplayItem).filter(
            LivestreamDisplayItem.store == store,
            LivestreamDisplayItem.etalase == etalase
        ).order_by(LivestreamDisplayItem.sort_order.nulls_last(), LivestreamDisplayItem.sequence_no.nulls_last(), LivestreamDisplayItem.pid).all()

        pids = {row.pid for row in rows if row.pid}
        base_rows = db.query(LivestreamBaseProduct).filter(
            LivestreamBaseProduct.store == store,
            LivestreamBaseProduct.pid.in_(pids)
        ).all()
        base_map: dict[str, list[dict]] = {}
        for row in base_rows:
            if not row.pid:
                continue
            base_map.setdefault(row.pid, []).append({
                "sku": row.sku,
                "parent_sku": row.parent_sku,
                "variation_name": row.variation_name,
                "variation_code": row.variation_code,
                "product_name": row.product_name,
            })

        price_db, name_map, link_map = load_product_database()
        required_price_type = price_type or PRICE_OPTIONS[0]
        if required_price_type not in PRICE_OPTIONS:
            required_price_type = PRICE_OPTIONS[0]

        all_sku_tokens = set()
        for variants in base_map.values():
            for variant in variants:
                for token in parse_sku_tokens(variant.get("sku", "")):
                    all_sku_tokens.add(token)
                for token in parse_sku_tokens(variant.get("parent_sku", "")):
                    all_sku_tokens.add(token)

        # Ensure livestream token labels/photos use the latest DB rows from All_Name
        # even when the shared price-checker cache is stale in memory.
        if all_sku_tokens:
            latest_names = db.query(FreemirName).filter(FreemirName.sku.in_(all_sku_tokens)).all()
            for row in latest_names:
                if row.product_name:
                    name_map[row.sku] = row.product_name
                if row.link:
                    link_map[row.sku] = row.link

        photo_map = get_sku_photo_map(db, all_sku_tokens)
        pid_photo_map = get_pid_photo_map(db, pids, store)

        items = []
        for row in rows:
            variant_items = []
            for variant in base_map.get(row.pid, []):
                variant_sku = variant.get("sku") or variant.get("parent_sku")
                if not variant_sku:
                    continue
                sku_tokens = parse_sku_tokens(variant_sku)
                token_photos = [
                    {
                        "sku": token,
                        "photo": link_map.get(token) or photo_map.get(token),
                        "name": name_map.get(token) or "",
                    }
                    for token in sku_tokens
                ]
                price_info = calculate_prices(variant_sku, price_db, name_map, link_map) if variant_sku else None
                variant_items.append({
                    "mid_code": variant.get("variation_code"),
                    "mid_name": variant.get("variation_name"),
                    "sku_string": variant_sku,
                    "sku_tokens": sku_tokens,
                    "token_photos": token_photos,
                    "product_name": variant.get("product_name"),
                    "price_info": price_info,
                    "price": price_info.get(required_price_type) if price_info else None,
                })

            display_name = row.product_name or (variant_items[0]["product_name"] if variant_items else None)
            items.append({
                "store": row.store,
                "etalase": row.etalase,
                "pid": row.pid,
                "sequence_no": row.sequence_no,
                "notes": row.notes,
                "sort_order": row.sort_order,
                "display_name": display_name,
                "price_type": required_price_type,
                "image_url": pid_photo_map.get(row.pid),
                "mids": variant_items,
            })
        return items
    finally:
        db.close()
