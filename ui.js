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
let fenTextInput = document.getElementById("fenText");
let copyFenButton = document.getElementById("copyFen");
let loadFenButton = document.getElementById("loadFen");
let pgnTextInput = document.getElementById("pgnText");
let copyPgnButton = document.getElementById("copyPgn");
let loadPgnButton = document.getElementById("loadPgn");
let goStartButton = document.getElementById("goStart");
let goBackButton = document.getElementById("goBack");
let goForwardButton = document.getElementById("goForward");
let goEndButton = document.getElementById("goEnd");
let moveInfo = document.getElementById("moveInfo");
let plyList = document.getElementById("plyList");

let squareSize = canvas.width / 8;
let selectedSquare = undefined;
let highlightedMoves = [];
let humanPlayer = 0;
let enginePlayer = 1;
let whoseTurn = humanPlayer;
let pressedKeys = {};
let pendingPromotionMoves = [];
let positionHistory = [];
let moveHistory = [];
let currentPly = 0;
let gameStartPlayer = 0;
let gameResult = "*";

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

let fenPieceMap = {
    p: 0,
    n: 1,
    b: 2,
    r: 3,
    q: 4,
    k: 5
};

let pieceTypeToFen = ["p", "n", "b", "r", "q", "k"];

let promotionSuffixToPieceType = {
    q: 4,
    r: 3,
    b: 2,
    n: 1
};

let pieceTypeToPromotionSuffix = {
    4: "q",
    3: "r",
    2: "b",
    1: "n"
};

let pieceTypeToSanLetter = {
    1: "N",
    2: "B",
    3: "R",
    4: "Q",
    5: "K"
};

function cloneBoardState(boardToClone) {
    let cloned = [];
    for (let i = 0; i < boardToClone.length; i++) {
        cloned.push({
            pieceType: boardToClone[i].pieceType,
            player: boardToClone[i].player,
            notes: (boardToClone[i].notes || []).slice()
        });
    }
    return cloned;
}

function indexToSquareText(index) {
    let coordinate = boardIndexToCoordinate(index);
    return coordinate.fileText + coordinate.rankText;
}

function createCoordinateMoveToken(move) {
    let token = indexToSquareText(move.pieceIndex) + indexToSquareText(move.moveTo);
    if (move.notes && move.notes[0] == "promote") {
        token += pieceTypeToPromotionSuffix[move.notes[1]] || "q";
    }
    return token;
}

function findKingIndex(boardState, player) {
    for (let i = 0; i < boardState.length; i++) {
        if (boardState[i].player == player && boardState[i].pieceType == 5) {
            return i;
        }
    }
    return undefined;
}

function getMoveDisambiguation(move, legalMoves, boardBefore) {
    let pieceType = boardBefore[move.pieceIndex].pieceType;
    if (pieceType == 0) {
        return "";
    }

    let sameTargetMoves = [];
    for (let i = 0; i < legalMoves.length; i++) {
        let candidate = legalMoves[i];
        if (candidate.pieceIndex == move.pieceIndex) {
            continue;
        }

        if (candidate.moveTo == move.moveTo && boardBefore[candidate.pieceIndex].pieceType == pieceType) {
            sameTargetMoves.push(candidate);
        }
    }

    if (sameTargetMoves.length == 0) {
        return "";
    }

    let fromX = move.pieceIndex % 8;
    let fromY = Math.floor(move.pieceIndex / 8);

    let hasSameFile = false;
    let hasSameRank = false;
    for (let i = 0; i < sameTargetMoves.length; i++) {
        let candidateX = sameTargetMoves[i].pieceIndex % 8;
        let candidateY = Math.floor(sameTargetMoves[i].pieceIndex / 8);
        if (candidateX == fromX) {
            hasSameFile = true;
        }
        if (candidateY == fromY) {
            hasSameRank = true;
        }
    }

    if (!hasSameFile) {
        return String.fromCharCode(97 + fromX);
    }

    if (!hasSameRank) {
        return String(fromY + 1);
    }

    return indexToSquareText(move.pieceIndex);
}

function normalizeSanToken(token) {
    if (!token) {
        return "";
    }

    let normalized = token.trim();
    normalized = normalized.replace(/0/g, "O");
    normalized = normalized.replace(/[+#?!]+$/g, "");
    normalized = normalized.replace(/e\.p\./gi, "");
    return normalized;
}

function createSanMoveText(move, boardBefore, player, legalMoves) {
    let pieceType = boardBefore[move.pieceIndex].pieceType;
    let fromText = indexToSquareText(move.pieceIndex);
    let toText = indexToSquareText(move.moveTo);
    let fromX = move.pieceIndex % 8;

    // TODO: use O-O / O-O-O when castling moves are represented by move generation
    let san = "";
    let capture = boardBefore[move.moveTo].player != undefined && boardBefore[move.moveTo].player != player;

    if (pieceType == 0) {
        if (capture) {
            san += String.fromCharCode(97 + fromX) + "x";
        }
        san += toText;
    } else {
        san += pieceTypeToSanLetter[pieceType] || "";
        san += getMoveDisambiguation(move, legalMoves, boardBefore);
        if (capture) {
            san += "x";
        }
        san += toText;
    }

    if (move.notes && move.notes[0] == "promote") {
        san += "=" + (pieceTypeToSanLetter[move.notes[1]] || "Q");
    }

    let boardAfter = applyMoveToBoardState(boardBefore, move);
    let opponent = 1 - player;
    let kingIndex = findKingIndex(boardAfter, opponent);
    if (kingIndex != undefined && isSquareAttackedBy(boardAfter, kingIndex, player)) {
        let oldBoard = board;
        board = boardAfter;
        let opponentMoves = getMovesForPlayer(opponent);
        board = oldBoard;

        if (opponentMoves.length == 0) {
            san += "#";
        } else {
            san += "+";
        }
    }

    return san;
}

function createMoveRecord(move, boardBefore, player, legalMoves) {
    return {
        coordinate: createCoordinateMoveToken(move),
        san: createSanMoveText(move, boardBefore, player, legalMoves)
    };
}

function parseSquareText(squareText) {
    if (!squareText || squareText.length != 2) {
        return undefined;
    }

    let file = squareText.charCodeAt(0) - 97;
    let rank = parseInt(squareText[1]);
    if (file < 0 || file > 7 || rank < 1 || rank > 8) {
        return undefined;
    }

    return (rank - 1) * 8 + file;
}

function isViewingHistory() {
    return currentPly != positionHistory.length - 1;
}

function pushCurrentPosition(moveToken) {
    if (currentPly < positionHistory.length - 1) {
        positionHistory = positionHistory.slice(0, currentPly + 1);
        moveHistory = moveHistory.slice(0, currentPly);
    }

    moveHistory.push(moveToken);
    positionHistory.push({
        board: cloneBoardState(board),
        whoseTurn: whoseTurn
    });
    currentPly = positionHistory.length - 1;
    updateNotationUI();
}

function setHistoryToCurrentPosition() {
    positionHistory = [{
        board: cloneBoardState(board),
        whoseTurn: whoseTurn
    }];
    moveHistory = [];
    currentPly = 0;
    gameStartPlayer = whoseTurn;
    gameResult = "*";
    updateNotationUI();
}

function buildPgnText(moves, startPlayer, result) {
    let parts = [];
    let i = 0;

    if (startPlayer == 1 && moves.length > 0) {
        parts.push("1...");
        parts.push(moves[0].san || moves[0].coordinate);
        i = 1;
    }

    for (; i < moves.length; i += 2) {
        let fullmoveNumber = 1 + Math.floor((i + startPlayer) / 2);
        parts.push(fullmoveNumber + ".");
        parts.push(moves[i].san || moves[i].coordinate);

        if (i + 1 < moves.length) {
            parts.push(moves[i + 1].san || moves[i + 1].coordinate);
        }
    }

    if (result && result != "*") {
        parts.push(result);
    }

    return parts.join(" ");
}

function getMoveTextForDisplay(moveRecord) {
    return moveRecord.san || moveRecord.coordinate || "";
}

function renderPlyList() {
    if (!plyList) {
        return;
    }

    plyList.innerHTML = "";

    for (let i = 0; i < moveHistory.length; i += 2) {
        let row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "8px";

        let whiteCell = document.createElement("div");
        whiteCell.style.width = "100px";
        whiteCell.textContent = (Math.floor(i / 2) + 1) + ". " + getMoveTextForDisplay(moveHistory[i]);
        if (currentPly - 1 == i) {
            whiteCell.style.backgroundColor = "#ffef99";
        }

        row.appendChild(whiteCell);

        let blackCell = document.createElement("div");
        blackCell.style.width = "100px";
        if (i + 1 < moveHistory.length) {
            blackCell.textContent = getMoveTextForDisplay(moveHistory[i + 1]);
            if (currentPly - 1 == i + 1) {
                blackCell.style.backgroundColor = "#ffef99";
            }
        }

        row.appendChild(blackCell);
        plyList.appendChild(row);
    }
}

function boardToFen() {
    let rankParts = [];

    for (let y = 7; y >= 0; y--) {
        let emptyCount = 0;
        let rankText = "";
        for (let x = 0; x < 8; x++) {
            let cell = board[y * 8 + x];
            if (cell.player == undefined || cell.pieceType == undefined) {
                emptyCount++;
                continue;
            }

            if (emptyCount > 0) {
                rankText += String(emptyCount);
                emptyCount = 0;
            }

            let pieceChar = pieceTypeToFen[cell.pieceType] || "p";
            if (cell.player == 0) {
                pieceChar = pieceChar.toUpperCase();
            }
            rankText += pieceChar;
        }

        if (emptyCount > 0) {
            rankText += String(emptyCount);
        }

        rankParts.push(rankText);
    }

    let sideToMove = whoseTurn == 0 ? "w" : "b";
    // TODO: add castling rights to FEN when known
    // TODO: add en passant target square to FEN when known
    // TODO: add halfmove/fullmove counters to FEN when known
    return rankParts.join("/") + " " + sideToMove + " - - 0 1";
}

function loadFenIntoBoard(fenText) {
    let parts = fenText.trim().split(/\s+/);
    if (parts.length < 2) {
        throw new Error("FEN needs at least piece placement and side to move.");
    }

    let rankParts = parts[0].split("/");
    if (rankParts.length != 8) {
        throw new Error("FEN piece placement must have 8 ranks.");
    }

    let newBoard = [];
    for (let i = 0; i < 64; i++) {
        newBoard.push({pieceType: undefined, player: undefined, notes: []});
    }

    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
        let rankText = rankParts[rankIndex];
        let file = 0;
        for (let j = 0; j < rankText.length; j++) {
            let ch = rankText[j];
            let digit = parseInt(ch);
            if (!isNaN(digit)) {
                file += digit;
                continue;
            }

            let lower = ch.toLowerCase();
            let pieceType = fenPieceMap[lower];
            if (pieceType == undefined) {
                throw new Error("Unknown FEN piece: " + ch);
            }

            if (file > 7) {
                throw new Error("Too many files in FEN rank.");
            }

            let player = ch == lower ? 1 : 0;
            let y = 7 - rankIndex;
            newBoard[y * 8 + file] = {
                pieceType: pieceType,
                player: player,
                notes: []
            };
            file++;
        }

        if (file != 8) {
            throw new Error("FEN rank does not contain 8 files.");
        }
    }

    let sideToMove = parts[1].toLowerCase();
    if (sideToMove != "w" && sideToMove != "b") {
        throw new Error("FEN side to move must be w or b.");
    }

    // TODO: read castling rights from FEN when move rules support it
    // TODO: read en passant target from FEN when move rules support it
    // TODO: read halfmove/fullmove counters from FEN when move rules support it
    board = newBoard;
    whoseTurn = sideToMove == "w" ? 0 : 1;
    clearSelection();
    hidePromotionChooser();
    setHistoryToCurrentPosition();
    drawBoard();
}

function updateNotationUI() {
    if (fenTextInput) {
        fenTextInput.value = boardToFen();
    }

    if (moveInfo) {
        moveInfo.textContent = "Ply " + currentPly + " / " + moveHistory.length;
    }

    renderPlyList();
}

function goToPly(targetPly) {
    if (positionHistory.length == 0) {
        return;
    }

    let clamped = Math.max(0, Math.min(targetPly, positionHistory.length - 1));
    let snapshot = positionHistory[clamped];
    board = cloneBoardState(snapshot.board);
    whoseTurn = snapshot.whoseTurn;
    currentPly = clamped;
    clearSelection();
    hidePromotionChooser();
    drawBoard();
    updateNotationUI();
}

function sanitizePgnToken(token) {
    return token.trim();
}

function parsePgnMoveTokens(pgnText) {
    let withoutComments = pgnText.replace(/\{[^}]*\}/g, " ").replace(/;[^\n]*/g, " ");
    while (/\([^()]*\)/.test(withoutComments)) {
        withoutComments = withoutComments.replace(/\([^()]*\)/g, " ");
    }

    withoutComments = withoutComments.replace(/\$\d+/g, " ");
    let rawTokens = withoutComments.split(/\s+/);
    let tokens = [];

    for (let i = 0; i < rawTokens.length; i++) {
        let token = rawTokens[i].trim();
        if (token.length == 0) {
            continue;
        }

        if (token.startsWith("[") || token.endsWith("]")) {
            continue;
        }

        if (/^\d+\.{1,3}$/.test(token)) {
            continue;
        }

        if (/^\d+\.{1,3}.+/.test(token)) {
            token = token.replace(/^\d+\.{1,3}/, "");
        }

        if (token == "1-0" || token == "0-1" || token == "1/2-1/2" || token == "*") {
            continue;
        }

        tokens.push(sanitizePgnToken(token));
    }

    return tokens;
}

function parsePgnResult(pgnText) {
    let match = pgnText.match(/(1-0|0-1|1\/2-1\/2|\*)\s*$/);
    if (!match) {
        return "*";
    }
    return match[1];
}

function parseTokenToMove(token, player) {
    let cleaned = token.trim();
    if (cleaned.length == 0) {
        return undefined;
    }

    cleaned = cleaned.replace(/0/g, "O");
    let legalMoves = getMovesForPlayer(player);

    let sanToken = normalizeSanToken(cleaned);
    for (let i = 0; i < legalMoves.length; i++) {
        let san = createSanMoveText(legalMoves[i], board, player, legalMoves);
        if (normalizeSanToken(san) == sanToken) {
            return legalMoves[i];
        }
    }

    let coordinateToken = cleaned.toLowerCase().replace(/[+#?!]/g, "");
    if (coordinateToken.length < 4) {
        return undefined;
    }

    let from = parseSquareText(coordinateToken.slice(0, 2));
    let to = parseSquareText(coordinateToken.slice(2, 4));
    if (from == undefined || to == undefined) {
        return undefined;
    }

    let promotionPieceType = undefined;
    if (coordinateToken.length >= 5) {
        promotionPieceType = promotionSuffixToPieceType[coordinateToken[4]];
    }

    let candidates = [];
    for (let i = 0; i < legalMoves.length; i++) {
        let move = legalMoves[i];
        if (move.pieceIndex == from && move.moveTo == to) {
            candidates.push(move);
        }
    }

    if (promotionPieceType == undefined && candidates.length > 0) {
        return candidates[0];
    }

    for (let i = 0; i < candidates.length; i++) {
        if (candidates[i].notes && candidates[i].notes[0] == "promote" && candidates[i].notes[1] == promotionPieceType) {
            return candidates[i];
        }
    }

    return undefined;
}

function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    }
}

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
    let boardBefore = cloneBoardState(board);
    let legalMoves = getMovesForPlayer(humanPlayer);
    let moveRecord = createMoveRecord(chosenMove, boardBefore, humanPlayer, legalMoves);
    makeMove(chosenMove);
    clearSelection();
    hidePromotionChooser();
    whoseTurn = enginePlayer;
    pushCurrentPosition(moveRecord);
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
    applyMoveInPlace(board, move);
}

function resetGame() {
    boardSetup()
    clearSelection();
    hidePromotionChooser();
    whoseTurn = 0;
    setHistoryToCurrentPosition();
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

    if (isViewingHistory()) {
        return;
    }

    let engineMove = pickEngineMove();
    if (!engineMove) {
        statusText.textContent = "Engine has no legal moves.";
        drawBoard();
        return;
    }

    let boardBefore = cloneBoardState(board);
    let legalMoves = getMovesForPlayer(enginePlayer);
    let moveRecord = createMoveRecord(engineMove, boardBefore, enginePlayer, legalMoves);
    makeMove(engineMove);
    whoseTurn = humanPlayer;
    pushCurrentPosition(moveRecord);
    statusText.textContent = "Your turn.";
    drawBoard();
}

canvas.addEventListener("click", function (event) {
    if (isViewingHistory()) {
        statusText.textContent = "Use >| to return to the latest move before playing.";
        return;
    }

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

copyFenButton.addEventListener("click", function () {
    updateNotationUI();
    copyTextToClipboard(fenTextInput.value);
    statusText.textContent = "FEN copied.";
});

loadFenButton.addEventListener("click", function () {
    try {
        loadFenIntoBoard(fenTextInput.value);
        statusText.textContent = "FEN loaded.";
    } catch (err) {
        statusText.textContent = "FEN load error: " + err.message;
    }
});

copyPgnButton.addEventListener("click", function () {
    let pgnText = buildPgnText(moveHistory, gameStartPlayer, gameResult);
    copyTextToClipboard(pgnText);
    statusText.textContent = "PGN copied.";
});

loadPgnButton.addEventListener("click", function () {
    try {
        let sourcePgnText = pgnTextInput.value;
        let parsedResult = parsePgnResult(sourcePgnText);
        let tokens = parsePgnMoveTokens(sourcePgnText);

        boardSetup();
        clearSelection();
        hidePromotionChooser();
        whoseTurn = 0;
        setHistoryToCurrentPosition();
        gameResult = parsedResult;

        for (let i = 0; i < tokens.length; i++) {
            let move = parseTokenToMove(tokens[i], whoseTurn);
            if (!move) {
                throw new Error("Could not apply token: " + tokens[i]);
            }

            let boardBefore = cloneBoardState(board);
            let legalMoves = getMovesForPlayer(whoseTurn);
            let moveRecord = createMoveRecord(move, boardBefore, whoseTurn, legalMoves);
            makeMove(move);
            whoseTurn = 1 - whoseTurn;
            pushCurrentPosition(moveRecord);
        }

        goToPly(0);
        pgnTextInput.value = "";
        statusText.textContent = "PGN loaded. At beginning of game.";
    } catch (err) {
        statusText.textContent = "PGN load error: " + err.message;
    }
});

goStartButton.addEventListener("click", function () {
    goToPly(0);
    statusText.textContent = "At beginning of game.";
});

goBackButton.addEventListener("click", function () {
    goToPly(currentPly - 1);
});

goForwardButton.addEventListener("click", function () {
    goToPly(currentPly + 1);
});

goEndButton.addEventListener("click", function () {
    goToPly(positionHistory.length - 1);
    statusText.textContent = "At latest move.";
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
