from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import price_checker, order_loss

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

@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI Backend!"}
