Nhóm 5 - Đồ Án Lập Trình Game Caro Online

Dự án xây dựng trò chơi Caro (Gomoku) thời gian thực, sử dụng kiến trúc **Client-Server** với giao thức **WebSockets** để đảm bảo tốc độ phản hồi tức thì.

---

## Thành Viên & Phân Chia Trách Nhiệm

Mô hình team: **1 Network - 2 Backend Logic - 2 Frontend**

| STT | Thành Viên | MSSV | Role (Vai Trò) | Nhiệm vụ chi tiết | File phụ trách |
|:---:|:---|:---:|:---|:---|:---|
| 1 | Lục Sỹ Minh Hiền | 084205000722 | **Socket Core** | Quản lý kết nối mạng, Connection Manager, điều phối luồng tin nhắn giữa 2 người chơi. | `main.py`, `connection_manager.py` |
| 2 | Trần Phát Đạt | 086205002574 | **Game Logic** | Thuật toán check thắng/thua (5 ô), validate nước đi hợp lệ. | `game_logic.py` |
| 3 | Hà Minh Hiếu  | 015205007954 | **System & Data**| API Đăng ký/Đăng nhập, Quản lý file dữ liệu, lưu lịch sử đấu. | `api.py`, `database.py`, `models.py`, `data.json` |
| 4 | Sim Lưu Gia Bảo | 087204007397 | **FE Integration**| Xử lý sự kiện JS, kết nối Socket Client, nhận lệnh từ Server để vẽ. | `socket_client.js`, `main.js` |
| 5 |Lê Hoàng Nhật Bình | 086205004972 | **UI/UX Design** | Thiết kế giao diện HTML/CSS, hiệu ứng bàn cờ, responsive. | `index.html`, `game.html`, `style.css` |

---

## Công Nghệ Sử Dụng

* **Backend:** Python 3.10+, FastAPI (Framework), Uvicorn (ASGI Server).
* **Communication:** WebSocket Protocol.
* **Database:** JSON File Storage (NoSQL simulation).
* **Frontend:** HTML5, CSS3, Vanilla JavaScript.

---

## Hướng Dẫn Cài Đặt & Chạy (Localhost)

### Bước 1: Chuẩn bị môi trường (Backend)
Yêu cầu máy đã cài Python.

1. Di chuyển vào thư mục dự án:
   ```bash
   cd caro-socket-project

2. Cài đặt các thư viện cần thiết:
    ```bash
    pip install -r requirements.txt

3. Khởi chạy Server:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

### Bước 2: Chạy Client (Frontend)
Truy cập vào link localhost
```bash
http://localhost:8000/index.html

## Cấu Trúc Thư Mục

```text
Caro-Websocket-FastAPI/
│
├── backend/                
│   ├── main.py             
│   ├── connection_manager.py 
│   ├── game_logic.py      
│   ├── api.py             
│   ├── database.py        
│   ├── models.py           
│   └── data.json           
│
├── frontend/              
│   ├── index.html          
│   ├── game.html           
│   ├── style.css           
│   ├── main.js             
│   └── socket_client.js    
│
├── requirements.txt        
└── README.md               
