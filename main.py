from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from backend.connection_manager import ConnectionManager
from backend.game_logic import GameLogic
from typing import Dict, List

app = FastAPI()
manager = ConnectionManager()
logic = GameLogic() # Instance logic dùng chung (vì class này stateless)

# ==========================================
# 1. QUẢN LÝ SẢNH CHỜ (LOBBY)
# ==========================================
lobby_connections: Dict[str, WebSocket] = {}

async def broadcast_lobby(message: dict):
    """Gửi tin nhắn cho tất cả mọi người trong sảnh"""
    for connection in list(lobby_connections.values()):
        try:
            await connection.send_json(message)
        except:
            pass 

@app.websocket("/ws/lobby/{username}")
async def lobby_endpoint(websocket: WebSocket, username: str):
    await websocket.accept()
    lobby_connections[username] = websocket
    
    # Gửi danh sách online
    online_users = list(lobby_connections.keys())
    await broadcast_lobby({"type": "online_list", "users": online_users})
    
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            
            # --- XỬ LÝ THÁCH ĐẤU ---
            if action == "challenge_request":
                target_user = data.get("target")
                if target_user in lobby_connections:
                    await lobby_connections[target_user].send_json({
                        "type": "challenge_received",
                        "from": username
                    })
            
            elif action == "challenge_accept":
                opponent = data.get("to")
                room_id = f"{opponent}_VS_{username}"
                
                start_msg = {"type": "start_game", "room": room_id}
                
                if opponent in lobby_connections:
                    await lobby_connections[opponent].send_json(start_msg)
                
                await websocket.send_json(start_msg)

    except WebSocketDisconnect:
        if username in lobby_connections:
            del lobby_connections[username]
        online_users = list(lobby_connections.keys())
        await broadcast_lobby({"type": "online_list", "users": online_users})


# ==========================================
# 2. QUẢN LÝ BÀN CỜ (GAME ROOM)
# ==========================================
games = {} 

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    
    if room_id not in games:
        games[room_id] = {
            "board": [[0 for _ in range(15)] for _ in range(15)],
            "turn": "X",
            "players": {"X": None, "O": None}
        }
    
    game_state = games[room_id]
    current_username = None 

    try:
        while True:
            received_data = await websocket.receive_json()
            action = received_data.get("action")
            
            # --- XỬ LÝ JOIN GAME ---
            if action == "join":
                current_username = received_data.get("data", {}).get("username", "Guest")
                role = "Spectator"
                
                if game_state["players"]["X"] is None:
                    game_state["players"]["X"] = current_username
                    role = "X"
                elif game_state["players"]["O"] is None:
                    game_state["players"]["O"] = current_username
                    role = "O"
                elif game_state["players"]["X"] == current_username:
                    role = "X" 
                elif game_state["players"]["O"] == current_username:
                    role = "O" 

                await websocket.send_json({"type": "player_assigned", "player": role})

                # Gửi lại bàn cờ hiện tại (SYNC)
                current_board_data = []
                for r in range(15):
                    for c in range(15):
                        cell_val = game_state["board"][r][c]
                        if cell_val != 0:
                            p_char = "X" if cell_val == 1 else "O"
                            current_board_data.append({"x": c, "y": r, "player": p_char})
                
                await websocket.send_json({
                    "type": "sync_board", 
                    "data": current_board_data,
                    "current_turn": game_state["turn"]
                })

            # --- XỬ LÝ ĐÁNH CỜ (MOVE) ---
            elif action == "move":
                data = received_data.get("data")
                if data:
                    x, y, player_role = data["x"], data["y"], data["player"]
                    
                    if game_state["turn"] == player_role:
                        player_id = 1 if player_role == "X" else 2
                        board = game_state["board"]

                        if logic.is_valid_move(board, y, x):
                            board[y][x] = player_id
                            
                            if logic.check_win(board, y, x, player_id):
                                await manager.broadcast_to_room({
                                    "type": "game_over",
                                    "winner": player_role,
                                    "data": {"x": x, "y": y, "player": player_role}
                                }, room_id)
                            else:
                                next_turn = "O" if player_role == "X" else "X"
                                game_state["turn"] = next_turn
                                await manager.broadcast_to_room({
                                    "type": "update_board",
                                    "data": {"x": x, "y": y, "player": player_role, "next_turn": next_turn}
                                }, room_id)
            
            # --- XỬ LÝ CHAT ---
            elif action == "chat":
                 await manager.broadcast_to_room({
                    "type": "chat",
                    "message": received_data.get("message"),
                    "sender": received_data.get("sender")
                }, room_id)

            # --- XỬ LÝ ĐẦU HÀNG ---
            elif action == "resign":
                loser_role = None
                if game_state["players"]["X"] == current_username: loser_role = "X"
                elif game_state["players"]["O"] == current_username: loser_role = "O"
                
                if loser_role:
                    winner_role = "O" if loser_role == "X" else "X"
                    await manager.broadcast_to_room({
                        "type": "game_over",
                        "winner": winner_role,
                        "reason": "surrender"
                    }, room_id)

            # --- (MỚI) YÊU CẦU CHƠI LẠI ---
            elif action == "request_restart":
                await manager.broadcast_to_room({
                    "type": "restart_request",
                    "from": current_username
                }, room_id)

            # --- (MỚI) XÁC NHẬN CHƠI LẠI (RESET GAME) ---
            elif action == "confirm_restart":
                # Reset bàn cờ về 0
                game_state["board"] = [[0 for _ in range(15)] for _ in range(15)]
                game_state["turn"] = "X" # Reset lượt về X
                
                # Gửi lệnh reset cho tất cả client trong phòng
                await manager.broadcast_to_room({
                    "type": "reset_game",
                    "new_turn": "X"
                }, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        
        leaver_role = None
        if current_username:
            if game_state["players"]["X"] == current_username:
                leaver_role = "X"
                game_state["players"]["X"] = None
            elif game_state["players"]["O"] == current_username:
                leaver_role = "O"
                game_state["players"]["O"] = None
        
        if room_id in games and len(manager.active_rooms.get(room_id, [])) > 0:
            if leaver_role:
                 await manager.broadcast_to_room({
                    "type": "opponent_left",
                    "leaver": leaver_role
                }, room_id)
        
        if room_id in games and len(manager.active_rooms.get(room_id, [])) == 0:
            del games[room_id]