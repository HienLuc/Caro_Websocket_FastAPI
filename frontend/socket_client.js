// socket_client.js

let socket = null;

/**
 * Kết nối WebSocket tới server
 * @param {Function} onMessageCallback - hàm xử lý message từ server
 */
export function connectSocket(onMessageCallback) {
    socket = new WebSocket("ws://localhost:8000/ws/caro");

    socket.onopen = () => {
        console.log("✅ WebSocket connected");
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessageCallback(data);
        } catch (err) {
            console.error("Invalid message format:", event.data);
        }
    };

    socket.onclose = () => {
        console.log("❌ WebSocket disconnected");
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };
}

/**
 * Gửi nước đi lên server
 * @param {number} x
 * @param {number} y
 */
export function sendMove(x, y) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not ready");
        return;
    }

    socket.send(JSON.stringify({
        type: "move",
        x: x,
        y: y
    }));
}
