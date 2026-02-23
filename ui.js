let canvas = document.getElementById("board");
let ctx = canvas.getContext("2d");
let statusText = document.getElementById("status");
let resetButton = document.getElementById("resetGame");

let squareSize = canvas.width / 8;
let selectedSquare = undefined;
let highlightedMoves = [];
let humanPlayer = 0;
let enginePlayer = 1;
let whoseTurn = humanPlayer;

let pieceSymbols = {
    0: ["♙", "♟"],
    1: ["♘", "♞"],
    2: ["♗", "♝"],
    3: ["♖", "♜"],
    4: ["♕", "♛"],
    5: ["♔", "♚"]
};

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let index = y * 8 + x;
            let isLight = (x + y) % 2 == 0;

            ctx.fillStyle = isLight ? "#f0d9b5" : "#b58863";
            ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);

            if (index == selectedSquare) {
                ctx.fillStyle = "rgba(70, 130, 180, 0.45)";
                ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
            }
        }
    }

    for (let i = 0; i < highlightedMoves.length; i++) {
        let move = highlightedMoves[i];
        let x = move.moveTo % 8;
        let y = Math.floor(move.moveTo / 8);
        ctx.fillStyle = "rgba(0, 180, 0, 0.45)";
        ctx.beginPath();
        ctx.arc(x * squareSize + squareSize / 2, y * squareSize + squareSize / 2, squareSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.font = "40px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < board.length; i++) {
        let cell = board[i];
        if (cell.player == undefined || cell.pieceType == undefined) {
            continue;
        }

        let x = i % 8;
        let y = Math.floor(i / 8);
        let symbol = pieceSymbols[cell.pieceType][cell.player];

        ctx.fillStyle = cell.player == 0 ? "#111" : "#000";
        ctx.fillText(symbol, x * squareSize + squareSize / 2, y * squareSize + squareSize / 2 + 2);
    }
}

function getMovesForPlayer(player) {
    try {
        return getLegalMoves(board, player);
    } catch (err) {
        statusText.textContent = "Move generation error from code.js: " + err.message;
        return [];
    }
}

function makeMove(move) {
    let from = move.pieceIndex;
    let to = move.moveTo;

    board[to] = {
        pieceType: board[from].pieceType,
        player: board[from].player,
        notes: board[from].notes || []
    };

    board[from] = {
        pieceType: undefined,
        player: undefined,
        notes: []
    };

    if (move.notes && move.notes[0] == "promote") {
        board[to].pieceType = move.notes[1];
    }
}

function resetGame() {
    board = [];
    for (let i = 0; i < 64; i++) {
        board.push({pieceType: undefined, player: undefined});
    }

    for (let i = 0; i < 2; i++) {
        let boardStartSide = (board.length - 1) * i;
        let jm = 1 - i * 2;
        for (let j = 0; j < standardStartingPositionSide.length; j++) {
            board[boardStartSide + j * jm] = {
                pieceType: standardStartingPositionSide[j],
                player: i,
                notes: []
            };
        }
    }

    clearSelection();
    whoseTurn = humanPlayer;
    statusText.textContent = "Game reset. Your turn.";
    drawBoard();
}

function clearSelection() {
    selectedSquare = undefined;
    highlightedMoves = [];
}

function pickEngineMove() {
    let moves = getMovesForPlayer(enginePlayer);
    if (moves.length == 0) {
        return undefined;
    }
    let randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
}

function engineTurn() {
    if (whoseTurn != enginePlayer) {
        return;
    }

    let engineMove = pickEngineMove();
    if (!engineMove) {
        statusText.textContent = "Engine has no legal moves.";
        drawBoard();
        return;
    }

    makeMove(engineMove);
    whoseTurn = humanPlayer;
    statusText.textContent = "Your turn.";
    drawBoard();
}

canvas.addEventListener("click", function (event) {
    if (whoseTurn != humanPlayer) {
        return;
    }

    let rect = canvas.getBoundingClientRect();
    let x = Math.floor((event.clientX - rect.left) / squareSize);
    let y = Math.floor((event.clientY - rect.top) / squareSize);
    let square = y * 8 + x;

    if (selectedSquare != undefined) {
        let chosenMove = undefined;
        for (let i = 0; i < highlightedMoves.length; i++) {
            if (highlightedMoves[i].moveTo == square) {
                chosenMove = highlightedMoves[i];
                break;
            }
        }

        if (chosenMove) {
            makeMove(chosenMove);
            clearSelection();
            whoseTurn = enginePlayer;
            statusText.textContent = "Engine thinking...";
            drawBoard();
            setTimeout(engineTurn, 150);
            return;
        }
    }

    if (board[square].player == humanPlayer) {
        selectedSquare = square;
        let allMoves = getMovesForPlayer(humanPlayer);
        highlightedMoves = [];

        for (let i = 0; i < allMoves.length; i++) {
            if (allMoves[i].pieceIndex == square) {
                highlightedMoves.push(allMoves[i]);
            }
        }

        if (highlightedMoves.length == 0) {
            statusText.textContent = "No legal moves found for that piece.";
        } else {
            statusText.textContent = "Select a highlighted square.";
        }
    } else {
        clearSelection();
        statusText.textContent = "Click one of your pieces.";
    }

    drawBoard();
});

resetButton.addEventListener("click", function () {
    resetGame();
});

drawBoard();
