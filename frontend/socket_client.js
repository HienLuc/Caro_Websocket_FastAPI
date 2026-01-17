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
    
    // --- TỰ ĐỘNG LẤY ĐỊA CHỈ IP SERVER (QUAN TRỌNG CHO RADMIN) ---
    // window.location.host trả về "IP:PORT" (VD: 26.123.45.67:8000)
    // Giúp client tự biết server đang nằm ở đâu.
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host; 
    
    const wsUrl = `${protocol}://${host}/ws/${roomId}`;
    
    console.log(`🔌 Connecting to: ${wsUrl}`);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log(`✅ WebSocket connected to room: ${roomId}`);
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
 */
export function sendMove(x, y, player) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: "move",
            data: { x, y, player }
        }));
    }
}

/**
 * Gửi tin nhắn chat
 */
export function sendChatMessage(message, sender) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: "chat",
            message: message,
            sender: sender 
        }));
    }
}

/**
 * Gửi lệnh đầu hàng
 */
export function sendSurrender() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "resign" }));
    }
}

/**
 * Gửi các yêu cầu tính năng nâng cao (Hòa, Undo, Restart)
 * @param {string} actionType - Loại hành động (offer_draw, accept_draw, request_undo, ...)
 */
export function sendRequest(actionType) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: actionType }));
    }
}

/**
 * Gửi lệnh tùy chỉnh (Dùng cho các trường hợp đặc biệt khác nếu cần)
 */
export function sendCustomPacket(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

/**
 * Ngắt kết nối
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