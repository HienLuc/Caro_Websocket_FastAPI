// socket_client.js - Kết nối WebSocket và xử lý giao tiếp với Server

let socket = null;
let roomId = null;

/**
 * Kết nối WebSocket tới server
 * @param {string} room - Mã phòng
 * @param {Function} onMessageCallback - Hàm xử lý message từ server
 */
export function connectSocket(room, onMessageCallback) {
    roomId = room;
    
    // Địa chỉ WebSocket server
    // Lưu ý: Nếu chạy trên máy thật (LAN) thì đổi localhost thành IP máy (VD: 192.168.1.x)
    const wsUrl = `ws://localhost:8000/ws/${roomId}`;
    
    console.log(`🔌 Connecting to: ${wsUrl}`);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log(`✅ WebSocket connected to room: ${roomId}`);
        
        // Gửi thông báo tham gia phòng để Server biết và gán X/O
        const username = localStorage.getItem('isLogged') || 'Guest';
        socket.send(JSON.stringify({
            action: "join",
            data: { username: username }
        }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessageCallback(data);
        } catch (err) {
            console.error("❌ Invalid message format:", event.data, err);
        }
    };

    socket.onclose = (event) => {
        console.log("❌ WebSocket disconnected", event);
        if (event.code !== 1000) {
            console.warn("⚠️ Kết nối bị ngắt bất thường.");
        }
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
 * Gửi tin nhắn chat (ĐÃ SỬA: Thêm tham số sender)
 * @param {string} message - Nội dung tin nhắn
 * @param {string} sender - Tên người gửi (Username)
 */
export function sendChatMessage(message, sender) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("⚠️ WebSocket not ready");
        return;
    }

    socket.send(JSON.stringify({
        action: "chat",
        message: message,
        sender: sender // <--- QUAN TRỌNG: Gửi kèm tên để server biết ai nhắn
    }));
}

/**
 * Gửi lệnh đầu hàng
 */
export function sendSurrender() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("⚠️ WebSocket not ready");
        return;
    }

    socket.send(JSON.stringify({
        action: "resign"
    }));
    console.log("🏳️ Sent surrender request");
}

/**
 * Gửi lệnh tùy chỉnh (Dùng cho Restart Game)
 */
export function sendCustomPacket(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    } else {
        console.warn("⚠️ Socket not ready for custom packet");
    }
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