# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from backend.connection_manager import ConnectionManager

# Khởi tạo App và Manager
app = FastAPI()
manager = ConnectionManager()

# --- MOCK DATA (Dữ liệu giả để test khi chưa có Database & Logic thật) ---
# Giả vờ đây là trạng thái game đang lưu trong RAM
fake_current_turn = "X" 

@app.get("/")
def read_root():
    return {"message": "Chào mừng đến với Caro API!"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global fake_current_turn # Dùng biến toàn cục để test (sau này sẽ bỏ)
    
    await manager.connect(websocket)
    
    try:
        while True:
            # 1. Nhận dữ liệu JSON từ Client gửi lên
            received_data = await websocket.receive_json()
            
            print(f"Nhận được tin: {received_data}")

            action = received_data.get("action")
            
            # --- XỬ LÝ GIẢ LẬP (MOCKING) ---
            
            if action == "move":
                move_data = received_data.get("data")
                x = move_data["x"]
                y = move_data["y"]
                

                next_turn = "O" if fake_current_turn == "X" else "X"
                
                response = {
                    "type": "update_board",
                    "data": {
                        "x": x,
                        "y": y,
                        "player": fake_current_turn,
                        "next_turn": next_turn  
                    }
                }
                
                fake_current_turn = next_turn
                await manager.broadcast(response)

            elif action == "chat":
                # Nếu là chat thì broadcast lại y chang lời nhắn
                chat_msg = received_data.get("message")
                response = {
                    "type": "chat_message",
                    "content": chat_msg
                }
                await manager.broadcast(response)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # Báo cho mọi người biết có người thoát
        await manager.broadcast({"type": "notification", "message": "Đối thủ đã mất kết nối!"})