import json
import os

# Tự động xác định đường dẫn đến file data.json cùng thư mục
DB_FILE = os.path.join(os.path.dirname(__file__), "data.json")

def load_data():
    """Đọc dữ liệu từ file JSON"""
    if not os.path.exists(DB_FILE):
        return {"users": [], "history": []}
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"users": [], "history": []}

def save_data(data):
    """Ghi dữ liệu vào file JSON"""
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def update_user_stats(username: str, is_winner: bool):
    """Hàm bổ trợ để cập nhật thắng/thua cho user"""
    db = load_data()
    for user in db["users"]:
        if user["username"] == username:
            if is_winner:
                user["win_count"] += 1
            else:
                user["loss_count"] += 1
            break
    save_data(db)