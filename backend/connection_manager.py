from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        #Dùng Dictionary để quản lý theo phòng
        # Cấu trúc: { "room_id_1": [socket_A, socket_B], "room_id_2": [socket_C] }
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        """Chấp nhận kết nối và đưa user vào đúng phòng"""
        await websocket.accept()
        
        # Nếu phòng chưa tồn tại thì tạo phòng mới
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = []
            
        # Thêm user vào danh sách của phòng đó
        self.active_rooms[room_id].append(websocket)
        
        count = len(self.active_rooms[room_id])
        print(f"Server: Phòng {room_id} có thêm người. Tổng: {count} người")

    def disconnect(self, websocket: WebSocket, room_id: str):
        """Xóa kết nối khỏi phòng cụ thể"""
        if room_id in self.active_rooms:
            # Xóa socket khỏi danh sách phòng
            if websocket in self.active_rooms[room_id]:
                self.active_rooms[room_id].remove(websocket)
                print(f"Server: Một user đã thoát khỏi phòng {room_id}")
            
            # Nếu phòng trống rỗng (không còn ai) thì xóa luôn key phòng để giải phóng RAM
            if len(self.active_rooms[room_id]) == 0:
                del self.active_rooms[room_id]
                print(f"Server: Phòng {room_id} đã đóng cửa do không còn ai.")

    async def broadcast_to_room(self, data: dict, room_id: str):
        """Chỉ gửi dữ liệu cho những người TRONG CÙNG PHÒNG"""
        if room_id in self.active_rooms:
            for connection in self.active_rooms[room_id]:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    print(f"Lỗi gửi tin trong phòng {room_id}: {e}")