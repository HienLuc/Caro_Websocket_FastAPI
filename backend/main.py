from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Import router từ file api.py bạn vừa làm
from backend.api import router as api_router

app = FastAPI(
    title="Caro Online WebSocket API",
    description="Backend for Caro (Gomoku) game using FastAPI & WebSocket",
    version="1.0.0"
)

# Cấu hình CORS để Frontend (HTML/JS) có thể gọi API mà không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong thực tế nên giới hạn domain, nhưng đồ án thì để "*" cho tiện
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các Route API (Đăng ký, Đăng nhập, Lịch sử) vào hệ thống
app.include_router(api_router)

@app.get("/")
def root():
    return {
        "status": "Online",
        "message": "Caro Backend is running",
        "author": "Minh Hiếu - System & Data"
    }

# Phần này dành cho bạn Minh Hiền (Socket Core) sẽ viết tiếp các endpoint WebSocket ở đây
# Ví dụ: @app.websocket("/ws/{username}")