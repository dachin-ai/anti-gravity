from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
import traceback
import base64

from services.order_match_logic import process_order_matching, export_order_match_excel

router = APIRouter(prefix="/api/order-match", tags=["Order Match Checker"])


@router.post("/calculate")
async def calculate_order_match(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename.lower()

        # Robust reading
        if filename.endswith('.csv'):
            df_raw = None
            for enc in ['utf-8', 'latin-1', 'gbk']:
                try:
                    df_raw = pd.read_csv(io.BytesIO(content), encoding=enc)
                    break
                except:
                    continue
            if df_raw is None:
                raise ValueError("Cannot read CSV file. Try re-saving as UTF-8.")
        else:
            try:
                df_raw = pd.read_excel(io.BytesIO(content), engine='openpyxl')
            except:
                df_raw = pd.read_excel(io.BytesIO(content))

        df_sheet1, df_sheet2, metrics = process_order_matching(df_raw)

        excel_bytes = export_order_match_excel(df_sheet1, df_sheet2)
        b64_str = base64.b64encode(excel_bytes).decode('utf-8')

        # Build preview: show up to 20 rows from sheet1
        preview_s1 = df_sheet1.head(20).to_dict(orient='records')
        preview_s2 = df_sheet2.head(20).to_dict(orient='records')
        columns_s1 = df_sheet1.columns.tolist()
        columns_s2 = df_sheet2.columns.tolist()

        return JSONResponse({
            "metrics": metrics,
            "preview_sheet1": preview_s1,
            "columns_sheet1": columns_s1,
            "preview_sheet2": preview_s2,
            "columns_sheet2": columns_s2,
            "file_base64": b64_str,
        })

    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
