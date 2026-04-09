from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
import traceback
import base64

from services.price_checker_logic import load_product_database
from services.order_loss_logic import run_order_loss_audit

router = APIRouter(prefix="/api/order-loss", tags=["Order Loss"])

@router.post("/calculate")
async def calculate_order_loss(
    file: UploadFile = File(...),
    price_type: str = Form("Warning")
):
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        # Robust reading
        if filename.endswith('.csv'):
            try:
                df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
            except:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding='latin-1')
                except:
                    df = pd.read_csv(io.BytesIO(content), encoding='gbk')
        else:
            try:
                df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
            except Exception:
                df = pd.read_excel(io.BytesIO(content))
            
        # load google sheets db
        price_db, _, _ = load_product_database()
        
        if not price_db:
            raise HTTPException(status_code=500, detail="Failed to connect to Google Sheets Database.")
            
        summary, excel_bytes = run_order_loss_audit(df, price_db, price_type)
        
        return JSONResponse({
            "summary": summary,
            "file_base64": base64.b64encode(excel_bytes).decode('utf-8')
        })
        
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")
