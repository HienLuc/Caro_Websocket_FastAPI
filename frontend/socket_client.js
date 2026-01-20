let socket = null;
let roomId = null;

/**Kết nối WebSocket tới server
 @param {string} room
 @param {Function} onMessageCallback
 */
export function connectSocket(room, onMessageCallback) {
    roomId = room;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host; 
    
    const wsUrl = `${protocol}://${host}/ws/${roomId}`;
    
    console.log(` Connecting to: ${wsUrl}`);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log(` WebSocket connected to room: ${roomId}`);
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
            console.error(" Invalid message format:", event.data, err);
        }
    };

    socket.onclose = (event) => {
        console.log(" WebSocket disconnected", event);
        if (event.code !== 1000) {
            console.warn(" Kết nối bị ngắt bất thường.");
        }
    };

    socket.onerror = (error) => {
        console.error(" WebSocket error:", error);
    };
}

/**Gửi nước đi lên server*/
export function sendMove(x, y, player) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: "move",
            data: { x, y, player }
        }));
    }
}

/**Gửi tin nhắn chat*/
export function sendChatMessage(message, sender) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            action: "chat",
            message: message,
            sender: sender 
        }));
    }
}

/**Gửi lệnh đầu hàng*/
export function sendSurrender() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "resign" }));
    }
}

/**Gửi các yêu cầu tính năng nâng cao (Hòa, Undo, Restart)
@param {string} actionType
 */
export function sendRequest(actionType) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: actionType }));
    }
}

/**Gửi lệnh tùy chỉnh (Dùng cho các trường hợp đặc biệt khác nếu cần)*/
export function sendCustomPacket(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

/**Ngắt kết nối*/
export function disconnectSocket() {
    if (socket) {
        socket.close();
        socket = null;
    }
}

/**Kiểm tra trạng thái kết nối*/
export function isConnected() {
    return socket && socket.readyState === WebSocket.OPEN;
}