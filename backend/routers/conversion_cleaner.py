from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import traceback
import base64
import math

from services.conversion_cleaner_logic import process_conversion_data, export_conversion_excel

router = APIRouter(prefix="/api/conversion-cleaner", tags=["Conversion Cleaner"])


@router.post("/calculate")
async def calculate_conversion(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename.lower()

        final_df, summaries, date_info, stats = process_conversion_data(content, filename)

        excel_bytes = export_conversion_excel(final_df, summaries, date_info)
        b64_str = base64.b64encode(excel_bytes).decode('utf-8')

        # Sanitize summaries for JSON (ensure all values are native Python types)
        def sanitize(obj):
            if isinstance(obj, dict):
                return {k: sanitize(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [sanitize(i) for i in obj]
            elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return 0
            return obj

        preview = final_df.head(10).fillna("").to_dict(orient="records")

        return JSONResponse({
            "stats": sanitize(stats),
            "summaries": sanitize(summaries),
            "preview": preview,
            "file_base64": b64_str
        })

    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
