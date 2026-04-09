from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
import traceback
import base64

from services.sku_plan_logic import process_sku_plan, export_sku_plan_excel

router = APIRouter(prefix="/api/sku-plan", tags=["SKU Monthly Plan"])

@router.post("/calculate")
async def calculate_sku_plan(
    file: UploadFile = File(...),
    target_date: str = Form(...),
    brand: str = Form("freemir")
):
    try:
        content = await file.read()
        
        try:
            xls = pd.ExcelFile(io.BytesIO(content), engine='openpyxl')
        except Exception:
            xls = pd.ExcelFile(io.BytesIO(content))
            
        required_sheets = ['SKU Target', 'SKU Grade']
        for sheet in required_sheets:
            if sheet not in xls.sheet_names:
                raise ValueError(f"Sheet '{sheet}' is missing. Need exactly 'SKU Target' and 'SKU Grade'.")
                
        df_grade = pd.read_excel(xls, sheet_name='SKU Grade')
        df_target = pd.read_excel(xls, sheet_name='SKU Target', header=0)
        
        result_df, err = process_sku_plan(df_target, df_grade, target_date, brand)
        if err:
            raise ValueError(err)
            
        excel_bytes = export_sku_plan_excel(result_df)
        b64_str = base64.b64encode(excel_bytes).decode('utf-8')
        
        # Top 10 records for UI preview
        preview_list = result_df.head(10).to_dict(orient="records")
        
        return JSONResponse({
            "summary": {
                "total_rows": len(result_df),
                "unique_skus": result_df['SKU'].nunique(),
                "unique_stores": result_df['店铺/Store'].nunique(),
                "total_goals": int(result_df['月目标/Monthly goal'].sum())
            },
            "preview": preview_list,
            "file_base64": b64_str
        })
        
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed processing SKU Plan: {str(e)}")
