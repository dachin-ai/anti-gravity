from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import price_checker, order_loss, failed_delivery, presales, erp_oos, sku_plan, conversion_cleaner, order_match, auth, warehouse_order

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price_checker.router)
app.include_router(order_loss.router)
app.include_router(failed_delivery.router)
app.include_router(presales.router)
app.include_router(erp_oos.router)
app.include_router(sku_plan.router)
app.include_router(conversion_cleaner.router)
app.include_router(order_match.router)
app.include_router(auth.router)
app.include_router(warehouse_order.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI Backend!"}
