let canvas = document.getElementById("board");
let ctx = canvas.getContext("2d");
let statusText = document.getElementById("status");
let resetButton = document.getElementById("resetGame");
let playWhiteButton = document.getElementById("playWhite");
let playRandomButton = document.getElementById("playRandom");
let playBlackButton = document.getElementById("playBlack");
let flipBoardButton = document.getElementById("flipBoard");
let viewInfo = document.getElementById("viewInfo");
let defaultPromotionPieceSelect = document.getElementById("defaultPromotionPiece");
let useDefaultPromotionCheckbox = document.getElementById("useDefaultPromotion");
let promotionBypassKeyInput = document.getElementById("promotionBypassKey");
let promotionChooser = document.getElementById("promotionChooser");
let promotionButtons = promotionChooser.querySelectorAll("button[data-piece-type]");

let squareSize = canvas.width / 8;
let selectedSquare = undefined;
let highlightedMoves = [];
let humanPlayer = 0;
let enginePlayer = 1;
let whoseTurn = humanPlayer;
let pressedKeys = {};
let pendingPromotionMoves = [];

let boardViewStates = {
    whiteBottom: "whiteBottom",
    blackBottom: "blackBottom"
};

let boardViewState = boardViewStates.whiteBottom;

let pieceSymbols = {
    0: ["♙", "♟"],
    1: ["♘", "♞"],
    2: ["♗", "♝"],
    3: ["♖", "♜"],
    4: ["♕", "♛"],
    5: ["♔", "♚"]
};

function getDefaultViewStateForHumanSide() {
    return humanPlayer == 0 ? boardViewStates.whiteBottom : boardViewStates.blackBottom;
}

function toggleBoardViewState() {
    if (boardViewState == boardViewStates.whiteBottom) {
        boardViewState = boardViewStates.blackBottom;
    } else {
        boardViewState = boardViewStates.whiteBottom;
    }
}

function boardXYToDisplay(x, y) {
    if (boardViewState == boardViewStates.whiteBottom) {
        return {x: x, y: 7 - y};
    }

    return {x: 7 - x, y: y};
}

function displayToBoardXY(x, y) {
    if (boardViewState == boardViewStates.whiteBottom) {
        return {x: x, y: 7 - y};
    }

    return {x: 7 - x, y: y};
}

function boardIndexToDisplay(index) {
    let x = index % 8;
    let y = Math.floor(index / 8);
    return boardXYToDisplay(x, y);
}

function displayToBoardIndex(x, y) {
    let boardPos = displayToBoardXY(x, y);
    return boardPos.y * 8 + boardPos.x;
}

function boardIndexToCoordinate(index) {
    let file = index % 8;
    let rank = Math.floor(index / 8);
    return {
        fileText: String.fromCharCode(97 + file),
        rankText: String(rank + 1)
    };
}

function isLightSquare(x, y) {
    return (x + y) % 2 == 1;
}

function getSideName(player) {
    return player == 0 ? "White" : "Black";
}

function updateViewInfo() {
    let bottomPlayer = boardViewState == boardViewStates.whiteBottom ? 0 : 1;
    viewInfo.textContent = "You: " + getSideName(humanPlayer) + " | Bottom: " + getSideName(bottomPlayer);
}

function drawCoordinates() {
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (let displayY = 0; displayY < 8; displayY++) {
        let boardIndex = displayToBoardIndex(0, displayY);
        let coordinate = boardIndexToCoordinate(boardIndex);
        let boardPos = displayToBoardXY(0, displayY);
        let isLight = isLightSquare(boardPos.x, boardPos.y);

        ctx.fillStyle = isLight ? "#b58863" : "#f0d9b5";
        ctx.fillText(coordinate.rankText, 3, displayY * squareSize + 3);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";

    for (let displayX = 0; displayX < 8; displayX++) {
        let boardIndex = displayToBoardIndex(displayX, 7);
        let coordinate = boardIndexToCoordinate(boardIndex);
        let boardPos = displayToBoardXY(displayX, 7);
        let isLight = isLightSquare(boardPos.x, boardPos.y);

        ctx.fillStyle = isLight ? "#b58863" : "#f0d9b5";
        ctx.fillText(coordinate.fileText, (displayX + 1) * squareSize - 3, canvas.height - 3);
    }
}

function isPromotionMove(move) {
    return move.notes && move.notes[0] == "promote";
}

function normalizeBypassKey(key) {
    let normalized = key.trim().toLowerCase();
    if (normalized == "ctrl") {
        return "control";
    }
    return normalized;
}

function doesBypassKeyMatch() {
    let bypassKey = promotionBypassKeyInput.value.trim();
    if (bypassKey.length == 0) {
        return false;
    }

    let normalizedBypassKey = normalizeBypassKey(bypassKey);
    if (normalizedBypassKey == "control") {
        return pressedKeys.control == true;
    }

    return pressedKeys[normalizedBypassKey] == true;
}

function hidePromotionChooser() {
    pendingPromotionMoves = [];
    promotionChooser.hidden = true;
}

function showPromotionChooser(promotionMoves) {
    pendingPromotionMoves = promotionMoves;
    let promotionPlayer = board[promotionMoves[0].pieceIndex].player;

    for (let i = 0; i < promotionButtons.length; i++) {
        let pieceType = parseInt(promotionButtons[i].dataset.pieceType);
        promotionButtons[i].textContent = pieceSymbols[pieceType][promotionPlayer];
        promotionButtons[i].style.fontSize = "28px";
        promotionButtons[i].style.minWidth = "40px";
    }

    promotionChooser.hidden = false;
    statusText.textContent = "Choose promotion piece.";
}

function findPromotionMoveByPieceType(pieceType) {
    for (let i = 0; i < pendingPromotionMoves.length; i++) {
        if (pendingPromotionMoves[i].notes[1] == pieceType) {
            return pendingPromotionMoves[i];
        }
    }

    return undefined;
}

function completeHumanMove(chosenMove) {
    makeMove(chosenMove);
    clearSelection();
    hidePromotionChooser();
    whoseTurn = enginePlayer;
    statusText.textContent = "Engine thinking...";
    drawBoard();
    setTimeout(engineTurn, 150);
}

function resolveChosenMove(square) {
    let movesToSquare = [];
    for (let i = 0; i < highlightedMoves.length; i++) {
        if (highlightedMoves[i].moveTo == square) {
            movesToSquare.push(highlightedMoves[i]);
        }
    }

    if (movesToSquare.length == 0) {
        return undefined;
    }

    let promotionMoves = [];
    for (let i = 0; i < movesToSquare.length; i++) {
        if (isPromotionMove(movesToSquare[i])) {
            promotionMoves.push(movesToSquare[i]);
        }
    }

    if (promotionMoves.length == 0) {
        return movesToSquare[0];
    }

    let pieceType = undefined;
    if (useDefaultPromotionCheckbox.checked && !doesBypassKeyMatch()) {
        pieceType = parseInt(defaultPromotionPieceSelect.value);
    } else {
        showPromotionChooser(promotionMoves);
        return "pending";
    }

    for (let i = 0; i < promotionMoves.length; i++) {
        if (promotionMoves[i].notes[1] == pieceType) {
            return promotionMoves[i];
        }
    }

    return promotionMoves[0];
}

function setHumanSide(player) {
    humanPlayer = player;
    enginePlayer = 1 - player;
    boardViewState = getDefaultViewStateForHumanSide();
    resetGame();
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let displayY = 0; displayY < 8; displayY++) {
        for (let displayX = 0; displayX < 8; displayX++) {
            let boardPos = displayToBoardXY(displayX, displayY);
            let index = boardPos.y * 8 + boardPos.x;
            let isLight = isLightSquare(boardPos.x, boardPos.y);

            ctx.fillStyle = isLight ? "#f0d9b5" : "#b58863";
            ctx.fillRect(displayX * squareSize, displayY * squareSize, squareSize, squareSize);

            if (index == selectedSquare) {
                ctx.fillStyle = "rgba(70, 130, 180, 0.45)";
                ctx.fillRect(displayX * squareSize, displayY * squareSize, squareSize, squareSize);
            }
        }
    }

    for (let i = 0; i < highlightedMoves.length; i++) {
        let move = highlightedMoves[i];
        let displayPos = boardIndexToDisplay(move.moveTo);
        ctx.fillStyle = "rgba(0, 180, 0, 0.45)";
        ctx.beginPath();
        ctx.arc(displayPos.x * squareSize + squareSize / 2, displayPos.y * squareSize + squareSize / 2, squareSize * 0.15, 0, Math.PI * 2);
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

        let displayPos = boardIndexToDisplay(i);
        let symbol = pieceSymbols[cell.pieceType][cell.player];

        ctx.fillStyle = cell.player == 0 ? "#111" : "#000";
        ctx.fillText(symbol, displayPos.x * squareSize + squareSize / 2, displayPos.y * squareSize + squareSize / 2 + 2);
    }

    drawCoordinates();
    updateViewInfo();
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
    hidePromotionChooser();
    whoseTurn = 0;
    if (whoseTurn == humanPlayer) {
        statusText.textContent = "Game reset. Your turn.";
    } else {
        statusText.textContent = "Game reset. Engine thinking...";
    }
    drawBoard();

    if (whoseTurn == enginePlayer) {
        setTimeout(engineTurn, 150);
    }
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
    let displayX = Math.floor((event.clientX - rect.left) / squareSize);
    let displayY = Math.floor((event.clientY - rect.top) / squareSize);

    if (displayX < 0 || displayX > 7 || displayY < 0 || displayY > 7) {
        return;
    }

    let square = displayToBoardIndex(displayX, displayY);

    if (selectedSquare != undefined) {
        let chosenMove = resolveChosenMove(square);

        if (chosenMove == "pending") {
            drawBoard();
            return;
        }

        if (chosenMove) {
            completeHumanMove(chosenMove);
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

playWhiteButton.addEventListener("click", function () {
    setHumanSide(0);
});

playRandomButton.addEventListener("click", function () {
    let randomSide = Math.random() < 0.5 ? 0 : 1;
    setHumanSide(randomSide);
});

playBlackButton.addEventListener("click", function () {
    setHumanSide(1);
});

flipBoardButton.addEventListener("click", function () {
    toggleBoardViewState();
    drawBoard();
});

for (let i = 0; i < promotionButtons.length; i++) {
    promotionButtons[i].addEventListener("click", function () {
        let pieceType = parseInt(this.dataset.pieceType);
        let chosenMove = findPromotionMoveByPieceType(pieceType);
        if (!chosenMove) {
            statusText.textContent = "Promotion move not found.";
            hidePromotionChooser();
            drawBoard();
            return;
        }

        completeHumanMove(chosenMove);
    });
}

document.addEventListener("keydown", function (event) {
    if (event.key) {
        pressedKeys[event.key.toLowerCase()] = true;
    }

    if (event.key == "Control") {
        pressedKeys.control = true;
    }
});

document.addEventListener("keyup", function (event) {
    if (event.key) {
        pressedKeys[event.key.toLowerCase()] = false;
    }

    if (event.key == "Control") {
        pressedKeys.control = false;
    }
});

resetGame();
