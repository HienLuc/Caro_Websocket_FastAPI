# backend/connection_manager.py
from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        # List này chứa tất cả các socket đang kết nối
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Chấp nhận kết nối và lưu vào danh sách"""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Server: Có người mới vào. Tổng số người: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Xóa kết nối khi người dùng thoát"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print("Server: Có người đã thoát.")

    async def broadcast(self, data: dict):
        """Gửi dữ liệu JSON cho TẤT CẢ mọi người (Loa phường)"""
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception as e:
                print(f"Lỗi gửi tin: {e}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Gửi tin nhắn riêng cho 1 người (nếu cần sau này)"""
        await websocket.send_text(message)