from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Response, Depends
from services.permission_guard import require_tool_access
from fastapi.responses import JSONResponse
from database import SessionLocal
import pandas as pd
import io
import json
from services.price_checker_logic import (
    load_product_database,
    calculate_prices,
    generate_breakdown_table,
    clean_sku_list,
    PRICE_TYPES,
    generate_template_file,
    convert_df_to_excel_multisheet,
    sync_google_sheets_to_vps_postgres
)
from pydantic import BaseModel

router = APIRouter(prefix="/api/price-checker", tags=["price-checker"])

db_cache = {
    "price_db": None,
    "name_map": None,
    "link_map": None,
    "last_refresh": None
}

def get_db():
    import time
    # Auto-refresh cache if it's older than 30 minutes
    if not db_cache["price_db"] or (db_cache["last_refresh"] and (time.time() - db_cache["last_refresh"]) > 1800):
        refresh_db()
    return db_cache["price_db"], db_cache["name_map"], db_cache["link_map"]

@router.post("/sync", dependencies=[Depends(require_tool_access("price_checker"))])
def sync_database():
    """Sync Google Sheets to PostgreSQL database"""
    try:
        count = sync_google_sheets_to_vps_postgres()
        global db_cache
        db_cache["price_db"] = None
        db_cache["name_map"] = None
        db_cache["link_map"] = None
        return {
            "success": True,
            "message": f"Successfully synced {count} price records from Google Sheets to PostgreSQL database.",
            "records_synced": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")

@router.get("/refresh", dependencies=[Depends(require_tool_access("price_checker"))])
def refresh_db():
    import time
    global db_cache
    db_cache["price_db"] = None
    db_cache["name_map"] = None
    db_cache["link_map"] = None
    db_cache["last_refresh"] = None
    
    p, n, l = load_product_database()
    if not p:
         raise HTTPException(status_code=500, detail="Failed to connect to spreadsheet")
    db_cache["price_db"] = p
    db_cache["name_map"] = n
    db_cache["link_map"] = l
    db_cache["last_refresh"] = time.time()
    return {"message": "Success", "records": len(p)}

@router.get("/template/{method}", dependencies=[Depends(require_tool_access("price_checker"))])
def get_template(method: str):
    if method not in ["Listing", "SKU"]:
        raise HTTPException(status_code=400, detail="Method must be Listing or SKU")
    file_bytes = generate_template_file(method)
    headers = {
        'Content-Disposition': f'attachment; filename="Price_Checker_{method}_Template.xlsx"'
    }
    return Response(content=file_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)

class DirectInput(BaseModel):
    sku_string: str
    target_price: float

@router.post("/calculate-direct", dependencies=[Depends(require_tool_access("price_checker"))])
def calc_direct(body: DirectInput):
    price_db, name_map, link_map = get_db()
    if not price_db:
        raise HTTPException(status_code=500, detail="Database not loaded")
    
    price_info = calculate_prices(body.sku_string, price_db, name_map, link_map)
    breakdown = generate_breakdown_table(body.sku_string, price_db, name_map)
    
    eval_data = []
    for pt in PRICE_TYPES:
        sys_price = price_info.get(pt, "Invalid")
        if sys_price == "Invalid":
            gap_val = "Invalid"
            status = "🚫"
        else:
            gap_val = body.target_price - float(sys_price)
            status = "✅ Safe" if gap_val >= 0 else "⚠️ Under"
            
        eval_data.append({
            "Tier": pt,
            "SystemPrice": sys_price,
            "TargetPrice": body.target_price,
            "Gap": gap_val,
            "Status": status
        })
        
    return {
        "summary": {
            "bundle_discount": price_info.get("Bundle Discount"),
            "clearance": price_info.get("Mark Clearance"),
            "gift": price_info.get("Mark Gift")
        },
        "items": price_info.get("sku_items", []),
        "breakdown": breakdown,
        "evaluation": eval_data
    }

@router.post("/calculate-batch", dependencies=[Depends(require_tool_access("price_checker"))])
async def calc_batch(method: str = Form(...), file: UploadFile = File(...)):
    if method not in ["Listing", "SKU"]:
        raise HTTPException(status_code=400, detail="Method must be Listing or SKU")
    
    # File size validation for production
    max_file_size = 10 * 1024 * 1024  # 10MB limit for Cloud Run
    file_content = await file.read()
    
    if len(file_content) > max_file_size:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {max_file_size // (1024*1024)}MB"
        )
    
    # Reset file pointer for processing
    await file.seek(0)
    contents = await file.read()
    
    price_db, name_map, link_map = get_db()
    
    try:
        if method == "Listing":
            try:
                df_check = pd.read_excel(io.BytesIO(contents), sheet_name="Check Price")
                df_mass = pd.read_excel(io.BytesIO(contents), sheet_name="Mass Update")
            except Exception as e:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Failed to read Excel file. Please ensure it has 'Check Price' and 'Mass Update' sheets. Error: {str(e)}"
                )
            
            # Row limit validation for production
            max_rows = 1000  # Limit for Cloud Run memory
            if len(df_check) > max_rows:
                raise HTTPException(
                    status_code=413, 
                    detail=f"Too many rows. Maximum {max_rows} rows allowed. Found {len(df_check)} rows."
                )
            
            col_pid, col_var_id, col_camp_price = df_check.columns[:3]
            col_target_price = col_camp_price
            col_mass_pid, col_mass_name, col_mass_mid, col_mass_varname, col_mass_parent, col_mass_sku = df_mass.columns[:6]
            
            df_check[col_pid] = df_check[col_pid].astype(str).str.strip()
            df_check[col_var_id] = df_check[col_var_id].astype(str).str.strip()
            df_mass[col_mass_pid] = df_mass[col_mass_pid].astype(str).str.strip()
            df_mass[col_mass_mid] = df_mass[col_mass_mid].astype(str).str.strip()
            
            df_mass['Final_SKU'] = df_mass[col_mass_sku].fillna("")
            df_mass['Final_SKU'] = df_mass.apply(lambda x: x[col_mass_parent] if x['Final_SKU'] == "" or pd.isna(x['Final_SKU']) else x['Final_SKU'], axis=1)

            pid_name_map = df_mass.drop_duplicates(subset=col_mass_pid).set_index(col_mass_pid)[col_mass_name].to_dict()
            mid_name_map = df_mass.drop_duplicates(subset=col_mass_mid).set_index(col_mass_mid)[col_mass_varname].to_dict()
            mid_sku_map = df_mass.drop_duplicates(subset=col_mass_mid).set_index(col_mass_mid)['Final_SKU'].to_dict()
            
            df_check["PID Name"] = df_check[col_pid].map(pid_name_map)
            df_check["MID Name"] = df_check[col_var_id].map(mid_name_map)
            df_check["SKU"] = df_check[col_var_id].map(mid_sku_map)
            
            df_final = df_check
        else:
            try:
                df_sku = pd.read_excel(io.BytesIO(contents), sheet_name=0) 
            except Exception as e:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Failed to read Excel file. Error: {str(e)}"
                )
            
            # Row limit validation for production
            max_rows = 1000  # Limit for Cloud Run memory
            if len(df_sku) > max_rows:
                raise HTTPException(
                    status_code=413, 
                    detail=f"Too many rows. Maximum {max_rows} rows allowed. Found {len(df_sku)} rows."
                )
            
            df_sku.columns = ["SKU", "Input Price"]
            df_sku["SKU"] = df_sku["SKU"].astype(str).str.strip()
            col_target_price = "Input Price"
            df_final = df_sku

        # PERFORMANCE OPTIMIZATION: Collect all unique SKUs first, then batch fetch photo_map
        all_skus = set()
        for _, row in df_final.iterrows():
            sku_val = row["SKU"]
            skus_list = clean_sku_list(sku_val)
            all_skus.update(skus_list)
        
        # Single DB call for all photo maps
        db = SessionLocal()
        try:
            from services.product_performance_logic import get_sku_photo_map
            photo_map = get_sku_photo_map(db, all_skus)
        except Exception as e:
            print(f"[ERROR] Failed to get photo map: {e}")
            photo_map = {}
        finally:
            db.close()

        # Now process with cached photo_map with error handling
        calc_results = []
        failed_rows = []
        
        for index, row in df_final.iterrows():
            try:
                sku_val = row["SKU"]
                if pd.isna(sku_val) or not str(sku_val).strip():
                    failed_rows.append(index)
                    continue
                    
                price_info = calculate_prices(sku_val, price_db, name_map, link_map, photo_map)
                calc_results.append(price_info)
                
            except Exception as e:
                print(f"[ERROR] Failed to process row {index}: {e}")
                # Add error result for this row
                error_result = {}
                for p_type in PRICE_TYPES:
                    error_result[p_type] = "Invalid"
                calc_results.append(error_result)
                failed_rows.append(index)
        
        price_df = pd.DataFrame(calc_results)
        final_df = pd.concat([df_final, price_df], axis=1)
        
        final_df[col_target_price] = pd.to_numeric(final_df[col_target_price], errors='coerce').fillna(0)
        
        for p_type in PRICE_TYPES:
            def get_gap_value(row):
                sys_price = row[p_type]
                inp_price = row[col_target_price]
                if sys_price == "Invalid": return "Invalid"
                try:
                    val = float(sys_price)
                    return inp_price - val
                except: return "Invalid"
            final_df[f"Gap {p_type}"] = final_df.apply(get_gap_value, axis=1)

        try:
            excel_bytes = convert_df_to_excel_multisheet(final_df, method)
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate Excel file. Error: {str(e)}"
            )
        
        import base64
        import math
        b64_str = base64.b64encode(excel_bytes).decode('utf-8')
        
        total_rows = len(final_df)
        processed_rows = total_rows - len(failed_rows)
        invalid_rows = 0
        
        preview_fields = ["SKU"]
        if method == "Listing":
            preview_fields.extend([col_camp_price, "Warning", "Gap Warning"])
        else:
            preview_fields.extend([col_target_price, "Warning", "Gap Warning"])
            
        if "Gap Warning" in final_df.columns:
            invalid_rows = len(final_df[final_df["Gap Warning"] == "Invalid"])
            
        valid_rows = total_rows - invalid_rows
        preview_cols_exist = [c for c in preview_fields if c in final_df.columns]
        preview_df = final_df[preview_cols_exist].head(10).fillna("")
        preview_list = preview_df.to_dict(orient="records")
        
        # Sanitize any remaining float('nan') or float('inf') which break JSONResponse
        def sanitize_val(v):
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                return ""
            return v
            
        cleaned_preview = [
            {k: sanitize_val(v) for k, v in row.items()} 
            for row in preview_list
        ]
        
        return JSONResponse(content={
            "summary": {
                "total": int(total_rows),
                "processed": int(total_rows - len(failed_rows)),
                "valid": int(valid_rows),
                "invalid": int(invalid_rows),
                "failed": len(failed_rows)
            },
            "preview": cleaned_preview,
            "file_base64": b64_str,
            "processing_info": {
                "file_size_mb": round(len(contents) / (1024*1024), 2),
                "method": method,
                "has_photo_data": len(photo_map) > 0,
                "failed_row_indices": failed_rows[:10] if failed_rows else []
            }
        })

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("ERROR IN CALC BATCH:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
