from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from services.shopee_affiliate_logic import get_shopee_stores, process_and_save_upload
from models import ShopeeAffConversion, ShopeeAffProduct, ShopeeAffCreator

router = APIRouter()

@router.get("/stores")
def fetch_stores():
    stores = get_shopee_stores()
    return {"stores": stores}

@router.post("/upload")
async def upload_shopee_csv(
    file: UploadFile = File(...),
    file_type: str = Form(...),
    store_id: str = Form(...),
    manual_date: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    valid_types = ['conversion', 'product', 'creator']
    if file_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Must be one of {valid_types}.")
        
    contents = await file.read()
    result = process_and_save_upload(db, contents, file.filename, file_type, store_id, manual_date)
    
    if not result.get("succeed"):
        raise HTTPException(status_code=400, detail=result.get("message"))
        
    return result

@router.get("/checker-matrix")
def get_checker_matrix(month: str, year: str, db: Session = Depends(get_db)):
    """
    Returns a matrix indicating which dates and stores have data for Product, Creator, and Conversion.
    """
    from sqlalchemy import func, cast, String
    from calendar import monthrange
    import datetime
    
    year_int = int(year)
    month_int = int(month)
    _, num_days = monthrange(year_int, month_int)
    
    # 1. Fetch Products
    # date, store_id, count
    st_prod = db.query(ShopeeAffProduct.date, ShopeeAffProduct.store_id, func.count(ShopeeAffProduct.id)).filter(
        func.extract('year', ShopeeAffProduct.date) == year_int,
        func.extract('month', ShopeeAffProduct.date) == month_int
    ).group_by(ShopeeAffProduct.date, ShopeeAffProduct.store_id).all()
    
    # 2. Fetch Creator
    st_creator = db.query(ShopeeAffCreator.date, ShopeeAffCreator.store_id, func.count(ShopeeAffCreator.id)).filter(
        func.extract('year', ShopeeAffCreator.date) == year_int,
        func.extract('month', ShopeeAffCreator.date) == month_int
    ).group_by(ShopeeAffCreator.date, ShopeeAffCreator.store_id).all()
    
    # 3. Fetch Conversion
    # We will use order_time to map to date.
    st_conv = db.query(
        func.date(ShopeeAffConversion.order_time), 
        ShopeeAffConversion.store_id, 
        func.count(ShopeeAffConversion.order_id)
    ).filter(
        func.extract('year', ShopeeAffConversion.order_time) == year_int,
        func.extract('month', ShopeeAffConversion.order_time) == month_int
    ).group_by(func.date(ShopeeAffConversion.order_time), ShopeeAffConversion.store_id).all()
    
    matrix = {}
    # Init empty matrix
    for day in range(1, num_days + 1):
        date_str = f"{year_int}-{month_int:02d}-{day:02d}"
        matrix[date_str] = {}
        
    # Helper to fill logic
    def check_presence(records, key_name):
        for r_date, r_store, qty in records:
            if not r_date or not r_store:
                continue
            date_str = r_date.strftime('%Y-%m-%d') if isinstance(r_date, datetime.date) else r_date
            if date_str in matrix:
                if r_store not in matrix[date_str]:
                    matrix[date_str][r_store] = {"product": False, "creator": False, "conversion": False}
                if qty > 0:
                    matrix[date_str][r_store][key_name] = True

    check_presence(st_prod, "product")
    check_presence(st_creator, "creator")
    check_presence(st_conv, "conversion")
    
    # Restructure for UI
    # Response format: [{"date": "2026-04-01", "stores": {"FR02OS001": {"product": True, "creator": False, "conversion": True}}}]
    output = []
    # Sort dates
    for d in sorted(matrix.keys()):
        row = {"date": d, "stores": matrix[d]}
        output.append(row)
        
    # Also return all distinct stores involved this month, or available stores
    
    return {"matrix": output}

@router.get("/analytics")
def get_analytics(start_date: str, end_date: str, store_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Fetch top product & top creator aggregated across selected date and store.
    """
    from sqlalchemy import func
    
    base_prod = db.query(ShopeeAffProduct.product_name, func.sum(ShopeeAffProduct.gmv).label('total_gmv')).filter(
        ShopeeAffProduct.date >= start_date,
        ShopeeAffProduct.date <= end_date
    )
    
    base_creator = db.query(
        ShopeeAffCreator.affiliate_username, 
        func.max(ShopeeAffCreator.affiliate_name).label('aff_name'),
        func.sum(ShopeeAffCreator.gmv).label('total_gmv')
    ).filter(
        ShopeeAffCreator.date >= start_date,
        ShopeeAffCreator.date <= end_date
    )
    
    if store_id and store_id != 'ALL':
        base_prod = base_prod.filter(ShopeeAffProduct.store_id == store_id)
        base_creator = base_creator.filter(ShopeeAffCreator.store_id == store_id)
        
    top_products = base_prod.group_by(ShopeeAffProduct.product_name).order_by(func.sum(ShopeeAffProduct.gmv).desc()).limit(15).all()
    top_creators = base_creator.group_by(ShopeeAffCreator.affiliate_username).order_by(func.sum(ShopeeAffCreator.gmv).desc()).limit(15).all()
    
    return {
        "topProducts": [{"name": p[0], "gmv": p[1]} for p in top_products],
        "topCreators": [{"username": c[0], "name": c[1], "gmv": c[2]} for c in top_creators]
    }
