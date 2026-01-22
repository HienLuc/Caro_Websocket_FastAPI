from fastapi import APIRouter
from backend.models import User, LoginRequest, ApiResponse, GameHistory
from backend.database import load_data, save_data

router = APIRouter(prefix="/api/system", tags=["System & Data"])

@router.post("/register", response_model=ApiResponse)
async def register(user_data: User):
    db = load_data()
    # Kiem tra ten dang nhap da ton tai chua
    if any(u["username"] == user_data.username for u in db["users"]):
        return ApiResponse(success=False, message="Tên người dùng đã tồn tại!")
    
    # Them user moi
    db["users"].append(user_data.dict())
    
    # CHI LUU PHAN USERS (De ghi vao data.json)
    save_data({"users": db["users"]})
    
    return ApiResponse(success=True, message="Đăng ký thành công!")

@router.post("/login", response_model=ApiResponse)
async def login(login_data: LoginRequest):
    db = load_data()
    # Tim user trong danh sach
    user = next((u for u in db["users"] if u["username"] == login_data.username), None)
    
    # Kiem tra mat khau
    if not user or user["password"] != login_data.password:
        return ApiResponse(success=False, message="Sai tài khoản hoặc mật khẩu!")
    
    return ApiResponse(success=True, message="Đăng nhập thành công!", data=user)

@router.post("/save-history")
async def save_match_history(history: GameHistory):
    """API để lưu lại kết quả sau mỗi trận đấu"""
    db = load_data()
    
    # Them lich su moi
    db["history"].append(history.dict())
    
    # CHI LUU PHAN HISTORY (De ghi vao history.json)
    save_data({"history": db["history"]})
    
    return {"status": "success"}

@router.get("/leaderboard")
async def get_leaderboard():
    """Lấy danh sách xếp hạng theo số trận thắng"""
    db = load_data()
    # Sap xep user theo win_count giam dan
    sorted_users = sorted(db["users"], key=lambda x: x["win_count"], reverse=True)
    
    # Lay top 10
    return sorted_users[:10]