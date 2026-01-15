// socket_client.js - Kết nối WebSocket và xử lý giao tiếp với Server

let socket = null;
let currentPlayer = null; // "X" hoặc "O"
let roomId = null;

/**
 * Kết nối WebSocket tới server
 * @param {string} room - Mã phòng
 * @param {Function} onMessageCallback - Hàm xử lý message từ server
 */
export function connectSocket(room, onMessageCallback) {
    roomId = room;
    
    // Địa chỉ WebSocket server (thay đổi nếu deploy)
    const wsUrl = `ws://localhost:8000/ws/${roomId}`;
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log(`✅ WebSocket connected to room: ${roomId}`);
        
        // Gửi thông báo tham gia phòng
        const username = localStorage.getItem('isLogged') || 'Guest';
        socket.send(JSON.stringify({
            action: "join",
            data: { username }
        }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("📨 Received from server:", data);
            onMessageCallback(data);
        } catch (err) {
            console.error("❌ Invalid message format:", event.data, err);
        }
    };

    socket.onclose = () => {
        console.log("❌ WebSocket disconnected");
    };

    socket.onerror = (error) => {
        console.error("⚠️ WebSocket error:", error);
    };
}

/**
 * Gửi nước đi lên server
 * @param {number} x - Tọa độ cột (0-14)
 * @param {number} y - Tọa độ hàng (0-14)
 * @param {string} player - "X" hoặc "O"
 */
export function sendMove(x, y, player) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("⚠️ WebSocket not ready");
        alert("Chưa kết nối tới server!");
        return;
    }

    // Gửi JSON theo format mà server mong đợi
    socket.send(JSON.stringify({
        action: "move",
        data: { x, y, player }
    }));
    
    console.log(`📤 Sent move: (${x}, ${y}) - Player: ${player}`);
}

/**
 * Gửi tin nhắn chat
 * @param {string} message - Nội dung tin nhắn
 */
export function sendChatMessage(message) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("⚠️ WebSocket not ready");
        return;
    }

    socket.send(JSON.stringify({
        action: "chat",
        message: message
    }));
}

/**
 * Ngắt kết nối WebSocket
 */
export function disconnectSocket() {
    if (socket) {
        socket.close();
        socket = null;
    }
}

/**
 * Kiểm tra trạng thái kết nối
 */
export function isConnected() {
    return socket && socket.readyState === WebSocket.OPEN;
}