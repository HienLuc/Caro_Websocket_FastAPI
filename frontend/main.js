<<<<<<< HEAD
// main.js - Logic xử lý sự kiện UI và tương tác với game

import { connectSocket, sendMove, sendChatMessage, disconnectSocket } from "./socket_client.js";

// ================== CONFIG ==================
const BOARD_SIZE = 15;
let currentTurn = "X"; // Lượt hiện tại
let myPlayer = null; // "X" hoặc "O" - được server gán
let gameActive = true; // Trạng thái game
let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));

// ================== DOM ELEMENTS ==================
const grid = document.getElementById("grid");
const turnDisplay = document.getElementById("turn");
const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");

// ================== INIT BOARD ==================
function initBoard() {
    grid.innerHTML = "";
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Xử lý click vào ô
            cell.addEventListener("click", () => handleCellClick(row, col, cell));
            
            grid.appendChild(cell);
        }
    }
    
    console.log("✅ Board initialized");
}

// ================== HANDLE CELL CLICK ==================
function handleCellClick(row, col, cellElement) {
    // Kiểm tra điều kiện hợp lệ
    if (!gameActive) {
        addChatMessage("Hệ thống", "Trận đấu đã kết thúc!", "system");
        return;
    }
    
    if (board[row][col] !== 0) {
        addChatMessage("Hệ thống", "Ô này đã có quân rồi!", "system");
        return;
    }
    
    if (myPlayer !== currentTurn) {
        addChatMessage("Hệ thống", "Chưa tới lượt của bạn!", "system");
        return;
    }
    
    // Gửi nước đi lên server
    sendMove(col, row, currentTurn);
}

// ================== UPDATE BOARD ==================
function updateBoard(x, y, player) {
    // Tìm cell tương ứng
    const cellIndex = y * BOARD_SIZE + x;
    const cell = grid.children[cellIndex];
    
    if (!cell) {
        console.error(`Cell not found at (${x}, ${y})`);
        return;
    }
    
    // Cập nhật UI
    cell.innerText = player;
    cell.style.color = (player === "X") ? "red" : "blue";
    cell.style.fontWeight = "900";
    
    // Cập nhật state
    board[y][x] = (player === "X") ? 1 : 2;
    
    console.log(`✅ Board updated: (${x}, ${y}) = ${player}`);
}

// ================== UPDATE TURN DISPLAY ==================
function updateTurnDisplay(turn) {
    currentTurn = turn;
    turnDisplay.innerText = turn;
    turnDisplay.style.color = (turn === "X") ? "red" : "blue";
    
    // Thông báo lượt
    if (turn === myPlayer) {
        addChatMessage("Hệ thống", "Đến lượt của bạn!", "system");
    } else {
        addChatMessage("Hệ thống", "Đối thủ đang suy nghĩ...", "system");
    }
}

// ================== CHAT FUNCTIONS ==================
function addChatMessage(sender, message, type = "normal") {
    const messageDiv = document.createElement("div");
    messageDiv.style.marginBottom = "5px";
    
    if (type === "system") {
        messageDiv.innerHTML = `<i style="color:green;">[${sender}]: ${message}</i>`;
    } else {
        messageDiv.innerHTML = `<b>${sender}:</b> ${message}`;
    }
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.sendMessage = function() {
    const message = chatInput.value.trim();
    if (message === "") return;
    
    sendChatMessage(message);
    addChatMessage("Bạn", message);
    chatInput.value = "";
};

// Enter để gửi chat
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        window.sendMessage();
    }
});

// ================== HANDLE SERVER MESSAGES ==================
function handleServerMessage(data) {
    switch (data.type) {
        case "player_assigned":
            // Server gán vai trò X hoặc O cho người chơi
            myPlayer = data.player;
            console.log(`🎮 You are Player: ${myPlayer}`);
            addChatMessage("Hệ thống", `Bạn là người chơi ${myPlayer}`, "system");
            break;
            
        case "update_board":
            // Server gửi cập nhật bàn cờ
            const { x, y, player, next_turn } = data.data;
            updateBoard(x, y, player);
            updateTurnDisplay(next_turn);
            break;
            
        case "game_over":
            // Kết thúc game
            gameActive = false;
            const winner = data.winner;
            updateBoard(data.data.x, data.data.y, winner);
            
            setTimeout(() => {
                showGameResult(winner);
            }, 500);
            break;
            
        case "chat_message":
            // Nhận tin nhắn chat từ đối thủ
            addChatMessage("Đối thủ", data.content);
            break;
            
        case "notification":
            // Thông báo từ server
            addChatMessage("Hệ thống", data.message, "system");
            break;
            
        case "error":
            // Lỗi từ server
            addChatMessage("Hệ thống", data.message || "Có lỗi xảy ra!", "system");
            break;
            
        default:
            console.warn("Unknown message type:", data);
    }
}

// ================== SHOW GAME RESULT ==================
function showGameResult(winner) {
    const modal = document.getElementById("modal-result");
    const winnerName = document.getElementById("winner-name");
    const winnerTag = document.getElementById("winner-tag");
    
    if (winner === myPlayer) {
        winnerName.innerText = "BẠN";
        winnerTag.innerText = "BẠN";
        
        // Đổi vị trí win/lose
        const boxes = document.querySelectorAll(".res-box");
        boxes[0].className = "res-box res-win";
        boxes[0].querySelector("span:last-child").innerText = "THẮNG CUỘC";
        boxes[0].querySelector("span:last-child").style.color = "#2ecc71";
        
        boxes[1].className = "res-box res-lose";
        boxes[1].querySelector("span:last-child").innerText = "THUA CUỘC";
        boxes[1].querySelector("span:last-child").style.color = "#ef4444";
    } else {
        const oppName = document.getElementById("opp-name").innerText;
        winnerName.innerText = oppName;
        winnerTag.innerText = oppName;
    }
    
    modal.classList.remove("hidden");
}

// ================== GAME CONTROLS ==================
window.confirmAction = function(type) {
    const modal = document.getElementById("modal-confirm");
    const icon = document.getElementById("confirm-icon");
    const title = document.getElementById("confirm-title");
    const desc = document.getElementById("confirm-desc");
    
    window.pendingAction = type;
    
    if (type === "surrender") {
        icon.className = "fas fa-flag";
        icon.style.color = "#ef4444";
        title.innerText = "Đầu Hàng";
        desc.innerText = "Bạn có chắc muốn Đầu Hàng? Đối thủ sẽ thắng cuộc.";
    } else if (type === "exit") {
        icon.className = "fas fa-sign-out-alt";
        icon.style.color = "#64748b";
        title.innerText = "Rời Phòng";
        desc.innerText = "Bạn có chắc muốn rời trận đấu và quay về sảnh chính?";
    }
    
    modal.classList.remove("hidden");
};

window.closeConfirm = function() {
    document.getElementById("modal-confirm").classList.add("hidden");
};

window.executeConfirm = function() {
    if (window.pendingAction === "surrender") {
        gameActive = false;
        disconnectSocket();
        
        // Hiển thị kết quả thua
        const oppName = document.getElementById("opp-name").innerText;
        document.getElementById("winner-name").innerText = oppName;
        document.getElementById("modal-result").classList.remove("hidden");
    } else if (window.pendingAction === "exit") {
        disconnectSocket();
        window.location.href = "index.html";
    }
    
    window.closeConfirm();
};

window.handleReplay = function() {
    if (confirm("Làm mới bàn cờ và chơi lại?")) {
        gameActive = true;
        currentTurn = "X";
        initBoard();
        updateTurnDisplay("X");
        addChatMessage("Hệ thống", "Trận đấu mới bắt đầu!", "system");
    }
};

// ================== START GAME ==================
window.onload = function() {
    // Lấy thông tin phòng từ URL
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room") || "default-room";
    const oppName = params.get("opp") || "Đối thủ";
    
    // Cập nhật tên đối thủ
    if (oppName !== "Đối thủ") {
        document.getElementById("opp-name").innerText = oppName + " (X)";
    }
    
    // Khởi tạo bàn cờ
    initBoard();
    
    // Kết nối WebSocket
    connectSocket(roomId, handleServerMessage);
    
    addChatMessage("Hệ thống", "Đang kết nối tới server...", "system");
};

// Xử lý khi đóng tab/thoát trang
window.onbeforeunload = function() {
    disconnectSocket();
};
=======
// main.js
import { connectSocket, sendMove } from "./socket_client.js";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

// ================== CONFIG ==================
const BOARD_SIZE = 15;
const CELL_SIZE = 40;

canvas.width = BOARD_SIZE * CELL_SIZE;
canvas.height = BOARD_SIZE * CELL_SIZE;

// ================== STATE ==================
let board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
);

// ================== DRAW ==================
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    for (let i = 0; i <= BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }

    // Draw pieces
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x]) {
                drawPiece(x, y, board[y][x]);
            }
        }
    }
}

function drawPiece(x, y, value) {
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        value === "X" ? "❌" : "⭕",
        x * CELL_SIZE + CELL_SIZE / 2,
        y * CELL_SIZE + CELL_SIZE / 2
    );
}

// ================== EVENT ==================
canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);

    // FE không tự xử lý logic
    sendMove(x, y);
});

// ================== SOCKET HANDLER ==================
function handleServerMessage(data) {
    switch (data.type) {
        case "init":
            // Server gửi trạng thái ban đầu
            board = data.board;
            drawBoard();
            break;

        case "update":
            // Server gửi board mới
            board = data.board;
            drawBoard();
            break;

        case "win":
            alert(`🎉 Player ${data.winner} wins!`);
            break;

        case "error":
            alert(`❌ ${data.message}`);
            break;

        default:
            console.warn("Unknown message type:", data);
    }
}

// ================== START ==================
connectSocket(handleServerMessage);
drawBoard();
>>>>>>> 321244fbea4627dbd73fa80b5de32fbd3e969501
