from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from backend.connection_manager import ConnectionManager
from backend.game_logic import GameLogic
from typing import Dict, List
import os
import asyncio # Để chạy timer
from backend.database import record_match, get_user_history

app = FastAPI()
manager = ConnectionManager()
logic = GameLogic()

# 1. QUẢN LÝ SẢNH CHỜ (LOBBY)
lobby_connections: Dict[str, WebSocket] = {}

async def broadcast_lobby(message: dict):
    for connection in list(lobby_connections.values()):
        try: await connection.send_json(message)
        except: pass 

@app.websocket("/ws/lobby/{username}")
async def lobby_endpoint(websocket: WebSocket, username: str):
    await websocket.accept()
    lobby_connections[username] = websocket
    
    online_users = list(lobby_connections.keys())
    await broadcast_lobby({"type": "online_list", "users": online_users})
    
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            
            if action == "challenge_request":
                target_user = data.get("target")
                if target_user in lobby_connections:
                    await lobby_connections[target_user].send_json({
                        "type": "challenge_received", "from": username
                    })
            
            elif action == "challenge_accept":
                opponent = data.get("to")
                room_id = f"{opponent}_VS_{username}"
                start_msg = {"type": "start_game", "room": room_id}
                
                if opponent in lobby_connections:
                    await lobby_connections[opponent].send_json(start_msg)
                await websocket.send_json(start_msg)

    except WebSocketDisconnect:
        if username in lobby_connections: del lobby_connections[username]
        online_users = list(lobby_connections.keys())
        await broadcast_lobby({"type": "online_list", "users": online_users})

# 2. HÀM XỬ LÝ TIMER & GAME
async def start_timer(room_id: str, player_role: str):
    """Đếm ngược 30s, nếu hết giờ thì xử thua"""
    try:
        await asyncio.sleep(30) 
        if room_id in games:
            game = games[room_id]
            # Hết giờ -> Người chơi hiện tại thua
            winner_role = "O" if player_role == "X" else "X"
            
            p1 = game["players"]["X"]
            p2 = game["players"]["O"]
            winner_name = p1 if winner_role == "X" else p2
            
            record_match(p1, p2, winner=winner_name)
            
            await manager.broadcast_to_room({
                "type": "game_over",
                "winner": winner_role,
                "reason": "timeout"
            }, room_id)
            
            game["timer_task"] = None
            
    except asyncio.CancelledError:
        pass

def reset_timer(room_id: str, next_turn: str):
    """Hủy timer cũ, tạo timer mới"""
    if room_id in games:
        old_task = games[room_id].get("timer_task")
        if old_task: old_task.cancel()
        
        task = asyncio.create_task(start_timer(room_id, next_turn))
        games[room_id]["timer_task"] = task

# 3. QUẢN LÝ BÀN CỜ (WEBSOCKET GAME)
games = {} 

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    
    if room_id not in games:
        games[room_id] = {
            "board": [[0]*15 for _ in range(15)],
            "turn": "X",
            "players": {"X": None, "O": None},
            "timer_task": None,
            "history": []
        }
    
    game = games[room_id]
    current_username = None 

    try:
        while True:
            received_data = await websocket.receive_json()
            action = received_data.get("action")
            
            if action == "join":
                current_username = received_data.get("data", {}).get("username", "Guest")
                role = "Spectator"
                
                if game["players"]["X"] is None:
                    game["players"]["X"] = current_username; role = "X"
                elif game["players"]["O"] is None:
                    game["players"]["O"] = current_username; role = "O"
                    reset_timer(room_id, "X")
                elif game["players"]["X"] == current_username: role = "X"
                elif game["players"]["O"] == current_username: role = "O"

                await websocket.send_json({"type": "player_assigned", "player": role})
                
                # Sync bàn cờ
                current_board_data = [{"x": c, "y": r, "player": ("X" if cell==1 else "O")} 
                                      for r, row in enumerate(game["board"]) for c, cell in enumerate(row) if cell!=0]
                await websocket.send_json({"type": "sync_board", "data": current_board_data, "current_turn": game["turn"]})

            elif action == "move":
                data = received_data.get("data")
                if data:
                    x, y, player_role = data["x"], data["y"], data["player"]
                    if game["turn"] == player_role:
                        player_id = 1 if player_role == "X" else 2
                        
                        if logic.is_valid_move(game["board"], y, x):
                            game["board"][y][x] = player_id
                            
                            # Lưu lịch sử để Undo
                            game["history"].append({"x": x, "y": y, "player": player_role})

                            if logic.check_win(game["board"], y, x, player_id):
                                # Hủy timer
                                if game.get("timer_task"): game["timer_task"].cancel()
                                
                                p1, p2 = game["players"]["X"], game["players"]["O"]
                                record_match(p1, p2, winner=current_username)
                                
                                await manager.broadcast_to_room({
                                    "type": "game_over", "winner": player_role, 
                                    "data": {"x": x, "y": y, "player": player_role}
                                }, room_id)
                            else:
                                next_turn = "O" if player_role == "X" else "X"
                                game["turn"] = next_turn
                                
                                # Reset timer cho người tiếp theo
                                reset_timer(room_id, next_turn)
                                
                                await manager.broadcast_to_room({
                                    "type": "update_board",
                                    "data": {"x": x, "y": y, "player": player_role, "next_turn": next_turn}
                                }, room_id)
            
            elif action == "chat":
                 await manager.broadcast_to_room({
                    "type": "chat", "message": received_data.get("message"), "sender": received_data.get("sender")
                }, room_id)

            elif action == "resign":
                if game.get("timer_task"): game["timer_task"].cancel()
                
                loser_role = None
                if game["players"]["X"] == current_username: loser_role = "X"
                elif game["players"]["O"] == current_username: loser_role = "O"
                
                if loser_role:
                    winner_role = "O" if loser_role == "X" else "X"
                    p1, p2 = game["players"]["X"], game["players"]["O"]
                    winner_name = p1 if winner_role == "X" else p2
                    
                    record_match(p1, p2, winner=winner_name)
                    
                    await manager.broadcast_to_room({
                        "type": "game_over", "winner": winner_role, "reason": "surrender"
                    }, room_id)

            #XIN HÒA
            elif action == "offer_draw":
                await manager.broadcast_to_room({"type": "draw_offer", "from": current_username}, room_id)
            
            elif action == "accept_draw":
                if game.get("timer_task"): game["timer_task"].cancel()
                
                p1, p2 = game["players"]["X"], game["players"]["O"]
                record_match(p1, p2, winner="Draw")
                
                await manager.broadcast_to_room({"type": "game_over", "winner": "Draw", "reason": "draw"}, room_id)

            #UNDO (ĐI LẠI)
            elif action == "request_undo":
                # 1. Kiểm tra xem có nước đi nào trong lịch sử chưa
                if not game["history"]:
                    await manager.broadcast_to_room({
                        "type": "chat", 
                        "message": "Chưa có nước đi nào để hoàn tác!", 
                        "sender": "Hệ thống"
                    }, room_id)
                    continue

                # 2. Xác định vai trò của người đang XIN đi lại
                requester_role = None
                if game["players"]["X"] == current_username: requester_role = "X"
                elif game["players"]["O"] == current_username: requester_role = "O"

                # 3. Lấy nước đi cuối cùng
                last_move = game["history"][-1] # Lấy phần tử cuối list

                # 4. KIỂM TRA CHẶT CHẼ:
                if last_move["player"] == requester_role:
                    # Gửi yêu cầu cho đối thủ xác nhận
                    await manager.broadcast_to_room({
                        "type": "undo_request", 
                        "from": current_username
                    }, room_id)
                else:
                    error_msg = {
                        "type": "chat",
                        "message": "Không thể đi lại! Đối thủ đã đánh rồi.",
                        "sender": "Hệ thống"
                    }
                    await websocket.send_json(error_msg)

            elif action == "accept_undo":
                if len(game["history"]) > 0:
                    last_move = game["history"].pop()
                    lx, ly = last_move["x"], last_move["y"]
                    game["board"][ly][lx] = 0 
                    
                    prev_turn = last_move["player"]
                    game["turn"] = prev_turn
                    
                    reset_timer(room_id, prev_turn)
                    
                    await manager.broadcast_to_room({
                        "type": "undo_update",
                        "x": lx, "y": ly,
                        "next_turn": prev_turn
                    }, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        if game.get("timer_task"): game["timer_task"].cancel()
        
        leaver_role = None
        if current_username:
            if game["players"]["X"] == current_username:
                leaver_role = "X"; game["players"]["X"] = None
            elif game["players"]["O"] == current_username:
                leaver_role = "O"; game["players"]["O"] = None
        
        if room_id in games and len(manager.active_rooms.get(room_id, [])) > 0:
            if leaver_role:
                 await manager.broadcast_to_room({"type": "opponent_left", "leaver": leaver_role}, room_id)
        
        if room_id in games and len(manager.active_rooms.get(room_id, [])) == 0:
            del games[room_id]

# 4. CẤU HÌNH API & STATIC FILES
@app.get("/api/history/{username}")
async def history_api(username: str):
    return get_user_history(username)

current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(current_dir, "frontend")

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    print(" CẢNH BÁO: Không tìm thấy thư mục frontend!")