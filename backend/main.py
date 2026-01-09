from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from backend.connection_manager import ConnectionManager
from backend.game_logic import GameLogic

app = FastAPI()
manager = ConnectionManager()
logic = GameLogic()

# --- STATE MANAGEMENT (Quản lý trạng thái các phòng) ---
# Cấu trúc: { "room_id": { "board": [[0]...], "turn": "X" } }
games = {} 

@app.get("/")
def read_root():
    return {"message": "Chào mừng đến với Caro API!"}

@app.websocket("/ws/{room_id}") # <--- Nhớ thêm room_id vào đường dẫn
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    
    # 3. Nếu phòng này chưa có bàn cờ -> Tạo mới ngay
    if room_id not in games:
        games[room_id] = {
            "board": [[0 for _ in range(15)] for _ in range(15)], # Tạo ma trận 15x15 rỗng
            "turn": "X" # Mặc định X đi trước
        }
    
    try:
        while True:
            received_data = await websocket.receive_json()
            action = received_data.get("action")
            
            # Lấy trạng thái game hiện tại của phòng này
            current_game = games[room_id]
            current_board = current_game["board"]
            current_turn = current_game["turn"]

            if action == "move":
                data = received_data.get("data")
                x = data["x"] # Cột
                y = data["y"] # Hàng (Row)
                player = data["player"] # "X" hoặc "O"

                # --- 4. ÁP DỤNG LOGIC THẬT ---
                
                # A. Kiểm tra lượt đi (Có phải lượt của người này không?)
                if player != current_turn:
                    continue 

                # B. Kiểm tra nước đi hợp lệ (dùng code BE2)
                if not logic.check_valid_move(current_board, y, x):
                    print(f"Nước đi lỗi tại {x}, {y}")
                    continue # Bỏ qua, không làm gì

                # C. Cập nhật bàn cờ (Ghi vào RAM server)
                current_board[y][x] = player 

                # D. Kiểm tra thắng thua (dùng code BE2)
                if logic.check_win(current_board, y, x, player):
                    # -- TRƯỜNG HỢP CÓ NGƯỜI THẮNG --
                    response = {
                        "type": "game_over",
                        "winner": player,
                        "data": { "x": x, "y": y }
                    }
                    # Reset game (nếu muốn) hoặc xóa phòng
                    del games[room_id] 
                else:
                    # -- TRƯỜNG HỢP CHƯA THẮNG -> ĐỔI LƯỢT --
                    next_turn = "O" if player == "X" else "X"
                    games[room_id]["turn"] = next_turn # Cập nhật lượt mới vào RAM

                    response = {
                        "type": "update_board",
                        "data": {
                            "x": x,
                            "y": y,
                            "player": player,
                            "next_turn": next_turn
                        }
                    }

                # E. Gửi phản hồi cho cả phòng
                await manager.broadcast_to_room(response, room_id)

            elif action == "chat":
                response = {
                    "type": "chat_message",
                    "content": received_data.get("message")
                }
                await manager.broadcast_to_room(response, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        # Nếu phòng trống thì xóa data game đi cho nhẹ RAM
        if room_id in games and len(manager.active_rooms.get(room_id, [])) == 0:
            del games[room_id]
        
        await manager.broadcast_to_room({"type": "notification", "message": "Đối thủ đã thoát!"}, room_id)