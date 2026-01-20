import json
import os
from datetime import datetime

# Xác định đường dẫn file data.json
DB_FILE = os.path.join(os.path.dirname(__file__), "data.json")

def load_data():
    if not os.path.exists(DB_FILE):
        return {"users": [], "history": []}
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"users": [], "history": []}

def save_data(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

#HÀM LƯU LỊCH SỬ
def record_match(player1, player2, winner):
    db = load_data()
    match_record = {
        "id": len(db.get("history", [])) + 1,
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "player_x": player1,
        "player_o": player2,
        "winner": winner
    }
    if "history" not in db:
        db["history"] = []
    db["history"].insert(0, match_record)
    save_data(db)

#HÀM LẤY LỊCH SỬ
def get_user_history(username):
    db = load_data()
    history = db.get("history", [])
    user_matches = [
        m for m in history 
        if m["player_x"] == username or m["player_o"] == username
    ]
    return user_matches