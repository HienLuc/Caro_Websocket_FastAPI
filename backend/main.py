from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from backend.connection_manager import ConnectionManager
from backend.game_logic import GameLogic

app = FastAPI()
manager = ConnectionManager()
logic = GameLogic()

# --- STATE MANAGEMENT ---
games = {} 

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    
    # Tạo phòng nếu chưa có
    if room_id not in games:
        games[room_id] = {
            "board": [[0 for _ in range(15)] for _ in range(15)],
            "turn": "X"
        }
    
    try:
        while True:
            received_data = await websocket.receive_json()
            action = received_data.get("action")
            if room_id not in games:
                 games[room_id] = {
                    "board": [[0 for _ in range(15)] for _ in range(15)],
                    "turn": "X"
                }

            current_game = games[room_id]
            current_board = current_game["board"]
            current_turn = current_game["turn"]

            if action == "move":
                data = received_data.get("data")
                if not data:
                    continue

                x = data["x"]
                y = data["y"]
                player = data["player"]

                if player != current_turn:
                    continue 

                if not logic.check_valid_move(current_board, y, x):
                    continue

                # Cập nhật bàn cờ
                current_board[y][x] = player 

                # Kiểm tra thắng thua
                if logic.check_win(current_board, y, x, player):
                    response = {
                        "type": "game_over",
                        "winner": player,
                        "data": { "x": x, "y": y }
                    }
                    
                    games[room_id] = {
                        "board": [[0 for _ in range(15)] for _ in range(15)],
                        "turn": "X" # Reset lại cho X đi trước (hoặc người thua đi trước tùy bạn)
                    }
                    
                    await manager.broadcast_to_room(response, room_id)
                    
                else:
                    next_turn = "O" if player == "X" else "X"
                    games[room_id]["turn"] = next_turn

                    response = {
                        "type": "update_board",
                        "data": {
                            "x": x, "y": y, "player": player, "next_turn": next_turn
                        }
                    }
                    await manager.broadcast_to_room(response, room_id)

            elif action == "chat":
                response = {
                    "type": "chat_message",
                    "content": received_data.get("message")
                }
                await manager.broadcast_to_room(response, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        if room_id in games and len(manager.active_rooms.get(room_id, [])) == 0:
            del games[room_id]
        
        await manager.broadcast_to_room({"type": "notification", "message": "Đối thủ đã thoát!"}, room_id)