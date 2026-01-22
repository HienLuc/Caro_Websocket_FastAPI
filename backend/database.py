import json
import os
from datetime import datetime

# --- CẤU HÌNH ĐƯỜNG DẪN FILE ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USER_FILE = os.path.join(BASE_DIR, "data.json")
HISTORY_FILE = os.path.join(BASE_DIR, "history.json")

# =======================================================
# 1. XỬ LÝ USER (data.json)
# =======================================================
def load_users():
    if not os.path.exists(USER_FILE):
        return {"users": []}
    try:
        with open(USER_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"users": []}

def save_users(data):
    with open(USER_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# =======================================================
# 2. XỬ LÝ LỊCH SỬ (history.json)
# =======================================================
def load_history():
    # Nếu file chưa tồn tại -> Trả về mảng rỗng
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_history(data_list):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(data_list, f, indent=4, ensure_ascii=False)

# =======================================================
# 3. CÁC HÀM LOGIC CHÍNH (Được gọi từ main.py / api.py)
# =======================================================

def load_data():
    """
    Hàm hỗ trợ cũ: Đọc cả 2 file và gộp lại 
    để các đoạn code chưa sửa kịp vẫn chạy được.
    """
    users_data = load_users()
    history_data = load_history()
    return {
        "users": users_data.get("users", []),
        "history": history_data
    }

def save_data(full_data):
    """
    Hàm lưu thông minh: Tự phân loại dữ liệu để lưu vào đúng file.
    """
    # Nếu có key 'users' -> Lưu vào data.json
    if "users" in full_data:
        save_users({"users": full_data["users"]})
    
    # Nếu có key 'history' -> Lưu vào history.json
    if "history" in full_data:
        save_history(full_data["history"])

def record_match(player1, player2, winner):
    """Ghi nhận kết quả trận đấu mới vào history.json"""
    history = load_history()
    
    match_record = {
        "id": len(history) + 1,
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "player_x": player1,
        "player_o": player2,
        "winner": winner
    }
    
    # Chèn vào đầu danh sách (Mới nhất lên đầu)
    history.insert(0, match_record)
    save_history(history)

def get_user_history(username):
    """Lọc lịch sử đấu của một user từ history.json"""
    history = load_history()
    
    user_matches = [
        m for m in history 
        if m["player_x"] == username or m["player_o"] == username
    ]
    return user_matches