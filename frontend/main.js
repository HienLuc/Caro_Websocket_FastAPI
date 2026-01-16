// main.js - Logic xử lý sự kiện UI và tương tác với game

// QUAN TRỌNG: Import thêm sendCustomPacket để gửi lệnh xin chơi lại
import { connectSocket, sendMove, sendChatMessage, disconnectSocket, sendSurrender, sendCustomPacket } from "./socket_client.js";

// ================== CONFIG ==================
const BOARD_SIZE = 15;
let currentTurn = "X"; 
let myPlayer = null;    // Role: "X" hoặc "O"
let myUsername = null;  // Tên đăng nhập (Lấy từ localStorage)
let gameActive = true; 
let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
let opponentName = "Đối thủ";

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
            cell.addEventListener("click", () => handleCellClick(row, col, cell));
            grid.appendChild(cell);
        }
    }
    console.log("✅ Board initialized");
}

// ================== HANDLE CELL CLICK ==================
function handleCellClick(row, col, cellElement) {
    if (!gameActive) return;
    if (board[row][col] !== 0) return;
    
    if (myPlayer !== currentTurn) {
        addChatMessage("Hệ thống", "Chưa tới lượt của bạn!", "system");
        return;
    }
    
    sendMove(col, row, currentTurn);
}

// ================== UPDATE BOARD UI ==================
function updateBoard(x, y, player) {
    const cellIndex = y * BOARD_SIZE + x;
    const cell = grid.children[cellIndex];
    if (!cell) return;
    
    cell.innerText = player;
    cell.classList.add("taken");
    
    if (player === "X") {
        cell.classList.add("cell-x");
        cell.style.color = "#e74c3c"; 
    } else {
        cell.classList.add("cell-o");
        cell.style.color = "#3498db"; 
    }
    
    board[y][x] = (player === "X") ? 1 : 2;
}

// ================== UPDATE TURN DISPLAY ==================
function updateTurnDisplay(turn) {
    currentTurn = turn;
    if (turnDisplay) {
        turnDisplay.innerText = turn;
        turnDisplay.style.color = (turn === "X") ? "#e74c3c" : "#3498db";
    }

    const statusBox = document.getElementById("status-box");
    if (statusBox) {
        if (turn === myPlayer) {
            statusBox.style.border = "2px solid #2ecc71";
            document.body.style.cursor = "pointer";
        } else {
            statusBox.style.border = "1px solid #ddd";
            document.body.style.cursor = "default";
        }
    }
}

// ================== CHAT FUNCTIONS (ĐÃ SỬA LỖI TÊN) ==================
function addChatMessage(sender, message, type = "normal") {
    const messageDiv = document.createElement("div");
    messageDiv.style.marginBottom = "5px";
    messageDiv.style.fontSize = "14px";
    
    if (type === "system") {
        messageDiv.innerHTML = `<i style="color:#2ecc71; font-size: 13px;">--- ${message} ---</i>`;
    } else {
        // FIX: So sánh tên người gửi với tên đăng nhập của mình
        // Nếu tên người gửi trùng với myUsername -> Là "Bạn"
        const isMe = (sender === myUsername);
        const displayName = isMe ? "Bạn" : sender;
        const color = isMe ? "#3498db" : "#e74c3c"; // Xanh: Mình, Đỏ: Địch
        
        messageDiv.innerHTML = `<strong style="color:${color}">${displayName}:</strong> ${message}`;
    }
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.sendMessage = function() {
    const message = chatInput.value.trim();
    if (message === "") return;
    
    // FIX: Truyền thêm myUsername vào tham số thứ 2
    sendChatMessage(message, myUsername); 
    
    chatInput.value = "";
};

chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") window.sendMessage();
});

// ================== HANDLE SERVER MESSAGES ==================
function handleServerMessage(data) {
    console.log("📩 Main received:", data);

    switch (data.type) {
        case "player_assigned":
            myPlayer = data.player;
            const roleText = (myPlayer === "Spectator") ? "Khán giả" : myPlayer;
            addChatMessage("Hệ thống", `Bạn đã tham gia với vai trò: <b>${roleText}</b>`, "system");
            
            const myInfo = document.getElementById("my-info");
            if(myInfo) myInfo.innerText = `Bạn (${myPlayer})`;
            break;

        case "sync_board":
            if (data.data) {
                data.data.forEach(move => {
                    updateBoard(move.x, move.y, move.player);
                });
            }
            updateTurnDisplay(data.current_turn);
            break;
            
        case "update_board":
            const { x, y, player, next_turn } = data.data;
            updateBoard(x, y, player);
            updateTurnDisplay(next_turn);
            break;
            
        case "opponent_left":
            addChatMessage("Hệ thống", "Đối thủ đã thoát game!", "system");
            gameActive = false;
            showGameResult(myPlayer, "opponent_left");
            break;

        case "game_over":
            gameActive = false;
            const winner = data.winner;
            const reason = data.reason || "normal"; 
            
            if (data.data) {
                updateBoard(data.data.x, data.data.y, winner);
            }
            
            setTimeout(() => {
                showGameResult(winner, reason);
            }, 500);
            break;
            
        case "chat":
            // Server gửi về {sender: "Hien", message: "..."}
            // Hàm addChatMessage sẽ tự lo việc so sánh tên để hiển thị "Bạn" hay tên đối thủ
            addChatMessage(data.sender, data.message);
            break;

        // --- (MỚI) NHẬN YÊU CẦU CHƠI LẠI ---
        case "restart_request":
            // Nếu người gửi yêu cầu KHÔNG phải là mình -> Hiện popup xác nhận
            if (data.from !== myUsername) {
                window.confirmAction('restart_accept');
            }
            break;

        // --- (MỚI) RESET GAME ---
        case "reset_game":
            resetGameUI();
            break;
    }
}

// ================== LOGIC RESET GAME ==================
function resetGameUI() {
    initBoard(); // Xóa trắng bàn cờ
    gameActive = true;
    currentTurn = "X";
    updateTurnDisplay("X");
    
    // Ẩn tất cả popup
    document.getElementById("modal-result").classList.add("hidden");
    document.getElementById("modal-confirm").classList.add("hidden");
    
    addChatMessage("Hệ thống", "Ván đấu mới bắt đầu!", "system");
}

// ================== SHOW GAME RESULT ==================
function showGameResult(winner, reason) {
    const modal = document.getElementById("modal-result");
    const winnerNameEl = document.getElementById("winner-name");
    
    const boxes = document.querySelectorAll(".res-box");
    const leftBox = boxes[0];  // BẠN
    const rightBox = boxes[1]; // ĐỐI THỦ

    const isWin = (winner === myPlayer);

    // Cấu hình Box Trái (BẠN)
    const leftText = leftBox.querySelector("span:last-child"); 
    if (isWin) {
        leftBox.className = "res-box res-win";
        leftText.innerText = "THẮNG CUỘC";
    } else {
        leftBox.className = "res-box res-lose";
        leftText.innerText = "THUA CUỘC";
    }

    // Cấu hình Box Phải (ĐỐI THỦ)
    const rightText = rightBox.querySelector("span:last-child");
    if (!isWin) {
        rightBox.className = "res-box res-win";
        rightText.innerText = "THẮNG CUỘC";
    } else {
        rightBox.className = "res-box res-lose";
        rightText.innerText = "THUA CUỘC";
    }

    let resultText = "";
    if (reason === "surrender") {
        resultText = isWin ? "ĐỐI THỦ ĐẦU HÀNG" : "BẠN ĐẦU HÀNG";
    } else if (reason === "opponent_left") {
        resultText = "ĐỐI THỦ ĐÃ THOÁT";
    } else {
        resultText = isWin ? "BẠN THẮNG" : `${opponentName} THẮNG`;
    }
    
    winnerNameEl.innerText = resultText;
    modal.classList.remove("hidden");
}

// ================== MODAL CONFIRM (XỬ LÝ NÚT BẤM) ==================
window.confirmAction = function(type) {
    const modal = document.getElementById("modal-confirm");
    const icon = document.getElementById("confirm-icon");
    const title = document.getElementById("confirm-title");
    const desc = document.getElementById("confirm-desc");
    
    window.pendingAction = type;
    
    if (type === "surrender") {
        if (!gameActive) return;
        icon.className = "fas fa-flag";
        icon.style.color = "#ef4444";
        title.innerText = "Đầu Hàng";
        desc.innerText = "Bạn có chắc muốn đầu hàng? Đối thủ sẽ thắng ngay lập tức.";
    } else if (type === "exit") {
        icon.className = "fas fa-sign-out-alt";
        icon.style.color = "#64748b";
        title.innerText = "Rời Phòng";
        desc.innerText = "Bạn có chắc muốn rời trận đấu?";
    } else if (type === "restart_accept") {
        // Modal khi nhận lời mời chơi lại từ đối thủ
        icon.className = "fas fa-sync-alt";
        icon.style.color = "#3b82f6";
        title.innerText = "Yêu Cầu Chơi Lại";
        desc.innerText = "Đối thủ muốn chơi ván mới. Bạn có đồng ý không?";
    }
    
    modal.classList.remove("hidden");
};

window.closeConfirm = function() {
    document.getElementById("modal-confirm").classList.add("hidden");
    window.pendingAction = null;
};

window.executeConfirm = function() {
    if (window.pendingAction === "surrender") {
        sendSurrender();
    } else if (window.pendingAction === "exit") {
        disconnectSocket();
        window.location.href = "index.html";
    } else if (window.pendingAction === "restart_accept") {
        // Gửi xác nhận đồng ý chơi lại
        if (typeof sendCustomPacket === 'function') {
            sendCustomPacket({ action: "confirm_restart" });
        } else {
            console.error("Thiếu hàm sendCustomPacket trong socket_client.js");
        }
    }
    window.closeConfirm();
};

// Sửa lại hàm này: Thay vì reload trang thì gửi yêu cầu restart
window.handleReplay = function() {
    if (confirm("Gửi yêu cầu chơi ván mới tới đối thủ?")) {
        // Gửi yêu cầu lên server
        if (typeof sendCustomPacket === 'function') {
            sendCustomPacket({ action: "request_restart" });
            addChatMessage("Hệ thống", "Đã gửi yêu cầu chơi lại...", "system");
        } else {
            alert("Vui lòng cập nhật file socket_client.js để dùng tính năng này!");
        }
    }
};

// ================== STARTUP ==================
window.onload = function() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room");
    
    // 1. Lấy tên người dùng từ LocalStorage (để so sánh chat chính xác)
    myUsername = localStorage.getItem('isLogged'); 
    
    const oppNameParam = params.get("opp");
    if (oppNameParam) opponentName = oppNameParam;

    const roomDisplay = document.getElementById("room-display");
    if(roomDisplay) roomDisplay.innerText = roomId || "Phòng Ngẫu Nhiên";
    
    const oppNameEl = document.getElementById("opp-name");
    if(oppNameEl) oppNameEl.innerText = opponentName;

    initBoard();
    
    if (roomId) {
        connectSocket(roomId, handleServerMessage);
        addChatMessage("Hệ thống", "Đang kết nối tới máy chủ...", "system");
    } else {
        alert("Không tìm thấy mã phòng! Quay lại sảnh.");
        window.location.href = "index.html";
    }
};

window.onbeforeunload = function() {
    disconnectSocket();
};