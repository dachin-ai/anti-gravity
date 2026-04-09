from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
import traceback
import base64

from services.price_checker_logic import load_product_database
from services.failed_del_logic import process_failed_delivery

router = APIRouter(prefix="/failed-delivery", tags=["Failed Delivery"])

@router.post("/calculate")
async def calculate_failed_delivery(
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        # Robust reading
        if filename.endswith('.csv'):
            try:
                df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
            except:
                df = pd.read_csv(io.BytesIO(content), encoding='latin-1')
        else:
            try:
                df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
            except Exception:
                df = pd.read_excel(io.BytesIO(content))
                
        # The first row is actually a description in TikTok export.
        if df.shape[0] < 2:
            raise ValueError("File has no data rows. Must be TikTok Order SKU List.")
            
        df = df.iloc[1:].copy()
        df.reset_index(drop=True, inplace=True)
            
        # load google sheets db for name mapping
        _, name_map, _ = load_product_database()
        
        summary, excel_bytes = process_failed_delivery(df, name_map)
        
        return JSONResponse({
            "summary": summary,
            "file_base64": base64.b64encode(excel_bytes).decode('utf-8')
        })
        
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
