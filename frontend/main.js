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
