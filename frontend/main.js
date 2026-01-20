import { connectSocket, sendMove, sendChatMessage, disconnectSocket, sendSurrender, sendRequest } from "./socket_client.js";

// ================== CONFIG ==================
const BOARD_SIZE = 15;
const TIME_LIMIT = 30;

let currentTurn = "X"; 
let myPlayer = null;
let myUsername = null;
let gameActive = true; 
let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
let opponentName = "Đối thủ";
let timerInterval = null; 

// ================== DOM ELEMENTS ==================
const grid = document.getElementById("grid");
const turnDisplay = document.getElementById("turn");
const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const timerDisplay = document.getElementById("timer-display");

// ================== INIT & TIMER ==================
function initBoard() {
    grid.innerHTML = "";
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener("click", () => handleCellClick(row, col));
            grid.appendChild(cell);
        }
    }
}

// --- COUNTDOWN TIMER ---
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    let timeLeft = TIME_LIMIT;
    updateTimerUI(timeLeft);

    timerInterval = setInterval(() => {
        if (!gameActive) {
            clearInterval(timerInterval);
            return;
        }
        
        timeLeft--;
        updateTimerUI(timeLeft);
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

function updateTimerUI(val) {
    if (!timerDisplay) return;
    timerDisplay.innerText = val + "s";
    
    if (val <= 10) {
        timerDisplay.style.color = "#ef4444"; 
        timerDisplay.classList.add("timer-warning");
    } else {
        timerDisplay.style.color = "#334155"; 
        timerDisplay.classList.remove("timer-warning");
    }
}

// ================== GAME LOGIC ==================
function handleCellClick(row, col) {
    if (!gameActive) return;
    if (board[row][col] !== 0) return;
    
    if (myPlayer !== currentTurn) {
        addChatMessage("Hệ thống", "Chưa tới lượt của bạn!", "system");
        return;
    }
    sendMove(col, row, currentTurn);
}

function updateBoard(x, y, player) {
    const cellIndex = y * BOARD_SIZE + x;
    const cell = grid.children[cellIndex];
    if (cell) {
        cell.innerText = player;
        cell.classList.add("taken", player === "X" ? "cell-x" : "cell-o");
    }
    board[y][x] = (player === "X") ? 1 : 2;
}

function clearCell(x, y) {
    const idx = y * BOARD_SIZE + x;
    const cell = grid.children[idx];
    if (cell) {
        cell.innerText = "";
        cell.className = "cell"; 
    }
    board[y][x] = 0;
}

function updateTurnDisplay(turn) {
    currentTurn = turn;
    if (turnDisplay) {
        turnDisplay.innerText = turn;
        turnDisplay.style.color = (turn === "X") ? "#e74c3c" : "#3498db";
    }
    
    if (gameActive) startTimer();

    const statusBox = document.getElementById("status-box");
    if (statusBox) {
        if (turn === myPlayer) {
            statusBox.style.border = "3px solid #2ecc71";
            statusBox.style.boxShadow = "0 0 10px rgba(46, 204, 113, 0.3)";
        } else {
            statusBox.style.border = "1px solid #e2e8f0";
            statusBox.style.boxShadow = "none";
        }
    }
}

// ================== SERVER MESSAGES ==================
function handleServerMessage(data) {
    console.log("📩", data);

    switch (data.type) {
        case "player_assigned":
            myPlayer = data.player;
            const roleText = (myPlayer === "Spectator") ? "Khán giả" : myPlayer;
            addChatMessage("Hệ thống", `Bạn tham gia với vai trò: <b>${roleText}</b>`, "system");
            if(document.getElementById("my-info")) document.getElementById("my-info").innerText = `Bạn (${myPlayer})`;
            break;

        case "sync_board":
            if (data.data) {
                data.data.forEach(move => updateBoard(move.x, move.y, move.player));
            }
            updateTurnDisplay(data.current_turn);
            break;
            
        case "update_board":
            updateBoard(data.data.x, data.data.y, data.data.player);
            updateTurnDisplay(data.data.next_turn);
            break;

        case "undo_update":
            clearCell(data.x, data.y); 
            addChatMessage("Hệ thống", `Lượt ${data.next_turn} được đi lại!`, "system");
            updateTurnDisplay(data.next_turn); 
            break;
            
        case "opponent_left":
            addChatMessage("Hệ thống", "Đối thủ đã thoát game!", "system");
            gameActive = false;
            clearInterval(timerInterval); 
            showGameResult(myPlayer, "opponent_left");
            break;

        case "game_over":
            gameActive = false;
            clearInterval(timerInterval); 
            
            const winner = data.winner;
            const reason = data.reason || "normal"; 
            
            if (data.data) updateBoard(data.data.x, data.data.y, winner);
            
            setTimeout(() => { showGameResult(winner, reason); }, 500);
            break;
            
        case "chat":
            addChatMessage(data.sender, data.message);
            break;

        //POPUP TRIGGERS
        case "restart_request":
            if (data.from !== myUsername) window.confirmAction('restart_receive'); 
            break;

        case "reset_game":
            resetGameUI();
            break;

        case "draw_offer":
            if (data.from !== myUsername) window.confirmAction('draw_receive');
            break;

        case "undo_request":
            if (data.from !== myUsername) window.confirmAction('undo_receive');
            break;
    }
}

// ================== UI HELPERS ==================
function resetGameUI() {
    initBoard();
    gameActive = true;
    currentTurn = "X";
    updateTurnDisplay("X"); 
    
    document.getElementById("modal-result").classList.add("hidden");
    document.getElementById("modal-confirm").classList.add("hidden");
    addChatMessage("Hệ thống", "Ván đấu mới bắt đầu!", "system");
}

function addChatMessage(sender, message, type = "normal") {
    const messageDiv = document.createElement("div");
    messageDiv.style.marginBottom = "5px";
    messageDiv.style.fontSize = "14px";
    
    if (type === "system") {
        messageDiv.innerHTML = `<i style="color:#2ecc71; font-size: 13px;">--- ${message} ---</i>`;
    } else {
        const isMe = (sender === myUsername);
        const displayName = isMe ? "Bạn" : sender;
        const color = isMe ? "#3498db" : "#e74c3c"; 
        messageDiv.innerHTML = `<strong style="color:${color}">${displayName}:</strong> ${message}`;
    }
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.sendMessage = function() {
    const message = chatInput.value.trim();
    if (message === "") return;
    sendChatMessage(message, myUsername); 
    chatInput.value = "";
};
chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") window.sendMessage(); });

//HÀM HIỂN THỊ KẾT QUẢ
function showGameResult(winner, reason) {
    const modal = document.getElementById("modal-result");
    const winnerNameEl = document.getElementById("winner-name");
    
    // Lấy các ô hiển thị thông tin người chơi trong bảng kết quả
    const resBoxes = document.querySelectorAll(".res-box"); 
    const nameEls = document.querySelectorAll(".res-name"); 
    const statusEls = document.querySelectorAll(".res-status"); 
    // 1. ĐIỀN TÊN NGƯỜI CHƠI
    if(nameEls.length >= 2) {
        nameEls[0].innerText = myUsername || "BẠN"; 
        nameEls[1].innerText = opponentName || "ĐỐI THỦ"; 
    }

    // 2. RESET MÀU SẮC CŨ
    resBoxes.forEach(box => box.classList.remove("res-win", "res-lose"));

    // 3. XỬ LÝ LOGIC THẮNG/THUA
    if (winner === "Draw") {
        winnerNameEl.innerText = "HAI BÊN HÒA NHAU!";
        winnerNameEl.style.color = "#f59e0b";
        if(statusEls[0]) statusEls[0].innerText = "Hòa";
        if(statusEls[1]) statusEls[1].innerText = "Hòa";
    } else {
        const isWin = (winner === myPlayer);
        let resultText = "";
        
        // Tạo text tiêu đề
        if (reason === "surrender") resultText = isWin ? "ĐỐI THỦ ĐẦU HÀNG, BẠN CHIẾN THẮNG" : "BẠN ĐẦU HÀNG";
        else if (reason === "timeout") resultText = isWin ? "ĐỐI THỦ HẾT GIỜ" : "BẠN HẾT GIỜ";
        else if (reason === "opponent_left") resultText = "ĐỐI THỦ ĐÃ THOÁT";
        else resultText = isWin ? "BẠN CHIẾN THẮNG!" : "BẠN ĐÃ THUA!";
        
        winnerNameEl.innerText = resultText;
        winnerNameEl.style.color = isWin ? "#2ecc71" : "#ef4444";

        // Cập nhật màu sắc cho 2 box
        if (isWin) {
            // Bạn Thắng (Xanh) - Đối thủ Thua (Đỏ)
            if(resBoxes[0]) resBoxes[0].classList.add("res-win");
            if(statusEls[0]) statusEls[0].innerText = "CHIẾN THẮNG";

            if(resBoxes[1]) resBoxes[1].classList.add("res-lose");
            if(statusEls[1]) statusEls[1].innerText = "THẤT BẠI";
        } else {
            // Bạn Thua (Đỏ) - Đối thủ Thắng (Xanh)
            if(resBoxes[0]) resBoxes[0].classList.add("res-lose");
            if(statusEls[0]) statusEls[0].innerText = "THẤT BẠI";

            if(resBoxes[1]) resBoxes[1].classList.add("res-win");
            if(statusEls[1]) statusEls[1].innerText = "CHIẾN THẮNG";
        }
    }
    modal.classList.remove("hidden");
}

//CONFIRM MODAL LOGIC
window.confirmAction = function(type) {
    if(!gameActive && type !== 'exit' && type !== 'restart_receive') return;

    const modal = document.getElementById("modal-confirm");
    const icon = document.getElementById("confirm-icon");
    const title = document.getElementById("confirm-title");
    const desc = document.getElementById("confirm-desc");
    
    window.pendingAction = type;
    icon.className = "fas confirm-icon"; 

    // 1. KHI BẠN CHỦ ĐỘNG BẤM NÚT
    if (type === 'surrender') {
        icon.classList.add("fa-flag"); icon.style.color="#ef4444";
        title.innerText = "Đầu Hàng?"; 
        desc.innerText = "Bạn có chắc muốn đầu hàng không?";
    } 
    else if (type === 'exit') {
        icon.classList.add("fa-sign-out-alt"); icon.style.color="#64748b";
        title.innerText = "Rời Phòng?"; 
        desc.innerText = "Bạn sẽ bị xử thua nếu thoát khi đang chơi.";
    } 
    else if (type === 'draw') { 
        icon.classList.add("fa-handshake"); icon.style.color="#f59e0b";
        title.innerText = "Xin Hòa?"; 
        desc.innerText = "Gửi lời mời hòa cho đối thủ?";
    } 
    else if (type === 'undo') { 
        icon.classList.add("fa-undo"); icon.style.color="#3b82f6";
        title.innerText = "Xin Đi Lại?"; 
        desc.innerText = "Xin đối thủ cho phép đi lại nước vừa rồi?";
    }
    
    // 2. KHI NHẬN YÊU CẦU TỪ ĐỐI THỦ
    else if (type === 'draw_receive') {
        icon.classList.add("fa-handshake"); icon.style.color="#f59e0b";
        title.innerText = "Cầu Hòa!"; 
        desc.innerText = "Đối thủ muốn xin hòa. Bạn có đồng ý không?";
    } 
    else if (type === 'undo_receive') {
        icon.classList.add("fa-undo"); icon.style.color="#3b82f6";
        title.innerText = "Xin Đi Lại!"; 
        desc.innerText = "Đối thủ lỡ tay xin đi lại. Bạn có đồng ý không?";
    } 
    else if (type === 'restart_receive') {
        icon.classList.add("fa-redo"); icon.style.color="#2ecc71";
        title.innerText = "Chơi Lại?"; 
        desc.innerText = "Đối thủ muốn làm ván mới. Bạn đồng ý chứ?";
    }

    modal.classList.remove("hidden");
};

window.closeConfirm = function() {
    document.getElementById("modal-confirm").classList.add("hidden");
    window.pendingAction = null;
};

// When "ĐỒNG Ý" is clicked
window.executeConfirm = function() {
    const type = window.pendingAction;
    
    // 1. Send Request
    if (type === 'surrender') sendSurrender();
    else if (type === 'exit') { disconnectSocket(); window.location.href = "index.html"; }
    
    else if (type === 'draw') { 
        sendRequest('offer_draw'); 
        addChatMessage("Hệ thống", "Đã gửi lời mời hòa...", "system"); 
    }
    else if (type === 'undo') { 
        sendRequest('request_undo'); 
        addChatMessage("Hệ thống", "Đã gửi yêu cầu đi lại...", "system"); 
    }
    
    // 2. Accept Request
    else if (type === 'draw_receive') sendRequest('accept_draw');
    else if (type === 'undo_receive') sendRequest('accept_undo');
    else if (type === 'restart_receive') sendRequest('confirm_restart');
    
    window.closeConfirm();
};

window.handleReplay = function() {
    // Logic này dùng cho nút "Chơi lại" trong bảng kết quả
    if (confirm("Gửi yêu cầu chơi ván mới?")) {
        sendRequest('request_restart');
        addChatMessage("Hệ thống", "Đã gửi yêu cầu chơi lại...", "system");
    }
};

// ================== STARTUP ==================
window.onload = function() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room");
    myUsername = localStorage.getItem('isLogged'); 
    
    const oppNameParam = params.get("opp");
    if (oppNameParam) opponentName = oppNameParam;

    document.getElementById("room-display").innerText = roomId || "Phòng Lỗi";
    document.getElementById("opp-name").innerText = opponentName;

    initBoard();
    if (roomId) {
        connectSocket(roomId, handleServerMessage);
    } else {
        alert("Không tìm thấy phòng!");
        window.location.href = "index.html";
    }
};

window.onbeforeunload = () => disconnectSocket();