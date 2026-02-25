// GitHub version

let pieceTypes = [
    {name: "pawn", value: 1}, // 0
    {name: "knight", value: 3}, // 1
    {name: "bishop", value: 3}, // 2
    {name: "rook", value: 5}, // 3
    {name: "queen", value: 9}, // 4
    {name: "king", value: 1000000} // 5
];

let standardStartingPositionSide = [3, 1, 2, 4, 5, 2, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0];

let board = [];
let CORE_C_WK = 1;
let CORE_C_WQ = 2;
let CORE_C_BK = 4;
let CORE_C_BQ = 8;

let coreN = undefined;

function coreCreateGameNotes() {
    return {
        c: CORE_C_WK | CORE_C_WQ | CORE_C_BK | CORE_C_BQ,
        e: -1,
        h: 0,
        f: 1,
        p: 0,
        r: {},
        k: "",
        t: 0
    };
}

function coreCloneGameNotes(notes) {
    let source = notes || coreGetGameNotes();
    let repetition = {};
    let keys = Object.keys(source.r || {});
    for (let i = 0; i < keys.length; i++) {
        repetition[keys[i]] = source.r[keys[i]];
    }

    return {
        c: source.c,
        e: source.e,
        h: source.h,
        f: source.f,
        p: source.p,
        r: repetition,
        k: source.k,
        t: source.t
    };
}

function coreSetGameNotes(notes) {
    coreN = coreCloneGameNotes(notes);
    return coreN;
}

function coreGetGameNotes() {
    if (!coreN) {
        coreN = coreCreateGameNotes();
    }
    return coreN;
}

function corePositionKey(boardState, sideToMovePlayer, notes) {
    let n = notes || coreGetGameNotes();
    let fen = coreBoardToFen(boardState, sideToMovePlayer, n);
    let parts = fen.split(" ");
    return parts[0] + " " + parts[1] + " " + parts[2] + " " + parts[3];
}

function coreRecordPosition(boardState, sideToMovePlayer, notes, resetRepetition) {
    let n = notes || coreGetGameNotes();
    if (resetRepetition) {
        n.r = {};
    }

    let key = corePositionKey(boardState, sideToMovePlayer, n);
    let currentCount = n.r[key] || 0;
    n.r[key] = currentCount + 1;
    n.k = key;
    n.t = n.r[key] >= 3 ? 1 : 0;
}

function coreIsThreefold(notes) {
    let n = notes || coreGetGameNotes();
    return n.t == 1;
}

function coreCastleMask(player, side) {
    if (player == 0) {
        return side == "kingside" ? CORE_C_WK : CORE_C_WQ;
    }

    return side == "kingside" ? CORE_C_BK : CORE_C_BQ;
}

function coreRemoveCastleRightsBySquare(notes, squareIndex) {
    if (!notes) {
        return;
    }

    if (squareIndex == 0) {
        notes.c &= ~CORE_C_WQ;
    } else if (squareIndex == 7) {
        notes.c &= ~CORE_C_WK;
    } else if (squareIndex == 56) {
        notes.c &= ~CORE_C_BQ;
    } else if (squareIndex == 63) {
        notes.c &= ~CORE_C_BK;
    }
}

function boardSetup(){
    board = [];
    for (let i=0; i<64; i++) {
        board.push({pieceType: undefined, player: undefined});
    }
    for (let i=0; i<2; i++) {
        let boardStartSide = (board.length-1)*i;
        let jm = 1-i*2
        for (let j=0; j<standardStartingPositionSide.length; j++) {
            board[boardStartSide+j*jm] = {
                pieceType: standardStartingPositionSide[j],
                player: i,
                notes: []
            };
            if (i == 1 && standardStartingPositionSide[j] >= 4) {
                board[boardStartSide+j*jm].pieceType = 9-standardStartingPositionSide[j];
            }
        }
    }

    coreSetGameNotes(coreCreateGameNotes());
    coreRecordPosition(board, 0, coreGetGameNotes(), true);
}

function inBoardBounds(x, y){
    return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function getKnightDistIndices(i){
    let knightDistIndices = [];
    for (let j=0; j<8; j++) {
        let x = i%8+Math.round(Math.cos((j+.5)*Math.PI/4)*2);
        let y = Math.floor(i/8)+Math.round(Math.sin((j+.5)*Math.PI/4)*2);
        if (inBoardBounds(x, y)) {
            knightDistIndices.push(y*8+x);
        }
    }
    return knightDistIndices;
}

function rangedIterator(board, player, i, xmFunc, ymFunc, onEmptyFunc, onEnemyFunc){
    // Iterates along 4 paths determined by the xmFunc and ymFunc. Paths terminate if they reach the edge of the board or any piece. It runs the onEmptyFunc for every empty square on the path, and the onEnemyFunc if it reaches an enemy (in which case the path terminates).
    for (let j=0; j<4; j++) {
        let done = false;
        let x = i%8;
        let y = Math.floor(i/8);
        let xm = xmFunc(j);
        let ym = ymFunc(j);
        while (!done) {
            x += xm;
            y += ym;
            if (inBoardBounds(x, y)) {
                let newIndex = y*8+x;
                if (board[newIndex].player != player) {
                    onEmptyFunc(newIndex);
                    if (board[newIndex].player == 1-player) {
                        onEnemyFunc(newIndex);
                        done = true;
                    }
                } else {
                    done = true;
                }
            } else {
                done = true;
            }
        }
    }
}

function getSquareAttackerCount(board, player, i) {
    let bishopXM = (j)=>{return (j%2)*2-1};
    let bishopYM = (j)=>{return Math.floor(j/2)*2-1};
    let rookXM = (j)=>{return ((j%2)*2-1)*(Math.floor(j/2) == 0)};
    let rookYM = (j)=>{return ((j%2)*2-1)*(Math.floor(j/2) == 1)};
    let moveDirection = 1-player*2;
    let x = i%8;
    let y = Math.floor(i/8);
    let attackerCount = 0;
    let knightDistIndices = getKnightDistIndices(i);
    for (let l = 0; l < knightDistIndices.length; l++) {
        let square = board[knightDistIndices[l]];
        if (square.player == 1 - player && square.pieceType == 1) {
            attackerCount ++;
        }
    }
    rangedIterator(board, player, i, bishopXM, bishopYM, () => { }, (index) => {
        let square = board[index];
        if (square.pieceType == 2 || square.pieceType == 4) {
            attackerCount ++;
        }
    });
    rangedIterator(board, player, i, rookXM, rookYM, () => { }, (index) => {
        let square = board[index];
        if (square.pieceType == 3 || square.pieceType == 4) {
            attackerCount ++;
        }
    });
    for (let l = -1; l < 2; l += 2) {
        if (inBoardBounds(x + l, y + moveDirection)) {
            let square = board[(y + moveDirection) * 8 + x + l];
            if (square.player == 1 - player && square.pieceType == 0) {
                attackerCount ++;
            }
        }
    }
    for (let l = -1; l < 2; l++) {
        for (let m = -1; m < 2; m++) {
            if (inBoardBounds(x + l, y + m)) {
                let square = board[(y + m) * 8 + x + l];
                if (square.player == 1 - player && square.pieceType == 5) {
                    attackerCount ++;
                }
            }
        }
    }
    return attackerCount;
}

function isSquareAttackedBy(board, i, attackerPlayer) {
    return getSquareAttackerCount(board, 1-attackerPlayer, i) > 0;
}

function applyMoveInPlace(boardState, move, gameNotes) {
    let notesState = gameNotes;
    let from = move.pieceIndex;
    let to = move.moveTo;
    let movingPieceType = boardState[from].pieceType;
    let movingPlayer = boardState[from].player;
    let capturedPieceType = boardState[to].pieceType;
    let capturedPlayer = boardState[to].player;
    let moveDirection = 1-movingPlayer*2;

    boardState[to] = {
        pieceType: boardState[from].pieceType,
        player: boardState[from].player,
        notes: (boardState[from].notes || []).slice()
    };

    boardState[from] = {
        pieceType: undefined,
        player: undefined,
        notes: []
    };

    if (movingPieceType == 5 || movingPieceType == 3) {
        coreAddNote(boardState[to].notes, 1);
    }

    if (move.notes && move.notes[0] == "promote") {
        boardState[to].pieceType = move.notes[1];
    }

    if (move.notes && move.notes[0] == "ep") {
        let capturedPawnIndex = to - 8 * moveDirection;
        capturedPieceType = boardState[capturedPawnIndex].pieceType;
        capturedPlayer = boardState[capturedPawnIndex].player;
        boardState[capturedPawnIndex] = {
            pieceType: undefined,
            player: undefined,
            notes: []
        };
    }

    if (move.notes && move.notes[0] == "castle") {
        coreApplyCastleRookMove(boardState, movingPlayer, move.notes[1]);
    }

    if (!notesState) {
        return;
    }

    notesState.p += 1;
    notesState.e = -1;

    if (movingPieceType == 5) {
        notesState.c &= movingPlayer == 0 ? ~(CORE_C_WK | CORE_C_WQ) : ~(CORE_C_BK | CORE_C_BQ);
    }

    if (movingPieceType == 3) {
        coreRemoveCastleRightsBySquare(notesState, from);
    }

    if (capturedPieceType == 3 && capturedPlayer != undefined) {
        coreRemoveCastleRightsBySquare(notesState, to);
    }

    if (movingPieceType == 0 && Math.abs(to - from) == 16) {
        notesState.e = from + 8 * moveDirection;
    }

    if (movingPieceType == 0 || capturedPlayer != undefined) {
        notesState.h = 0;
    } else {
        notesState.h += 1;
    }

    if (movingPlayer == 1) {
        notesState.f += 1;
    }

    coreRecordPosition(boardState, 1-movingPlayer, notesState, false);
}

function applyMoveToBoardState(boardState, move, gameNotes) {
    let newBoard = [];
    for (let i = 0; i < boardState.length; i++) {
        newBoard.push({
            pieceType: boardState[i].pieceType,
            player: boardState[i].player,
            notes: (boardState[i].notes || []).slice()
        });
    }

    applyMoveInPlace(newBoard, move, gameNotes);
    return newBoard;
}

function getLegalMoves(board, player, gameNotes){
    let notesState = gameNotes || coreGetGameNotes();
    let bishopXM = (j)=>{return (j%2)*2-1};
    let bishopYM = (j)=>{return Math.floor(j/2)*2-1};
    let rookXM = (j)=>{return ((j%2)*2-1)*(Math.floor(j/2) == 0)};
    let rookYM = (j)=>{return ((j%2)*2-1)*(Math.floor(j/2) == 1)};
    let boardStartSide = (board.length-1)*player;
    let moveDirection = 1-player*2;
    let legalMoves = [];
    let kingIndex;
    for (let i=0; i<board.length; i++) {
        if (board[i].player == player && board[i].pieceType == 5) {
            kingIndex = i;
        }
    }
    for (let j = -1; j < 2; j++) {
        for (let k = -1; k < 2; k++) {
            let x = kingIndex % 8 + j;
            let y = Math.floor(kingIndex / 8) + k;
            if (inBoardBounds(x, y)) {
                let moveToIndex = y * 8 + x;
                if (board[moveToIndex].player != player) {
                    if (getSquareAttackerCount(board, player, moveToIndex) == 0) {
                        legalMoves.push({ pieceIndex: kingIndex, moveTo: moveToIndex, notes: [] });
                    }
                }
            }
        }
    }

    coreAddCastlingMoves(board, player, kingIndex, legalMoves, notesState);

    if (getSquareAttackerCount(board, player, kingIndex) < 2) {
        for (let i=0; i<board.length; i++) {
            if (board[i].player == player) {
                let pieceType = board[i].pieceType;
                if (pieceType == 0) { // pawns
                    let moveTo = i+8*moveDirection;
                    if (board[moveTo].player == undefined) {
                        addPawnMoves(i, moveTo);
                        let moveTo2 = i+16*moveDirection;
                        if (Math.abs(boardStartSide-i) < 16) {
                            if (board[moveTo2].player == undefined) {
                                legalMoves.push({pieceIndex: i, moveTo: moveTo2, notes: []});
                            }
                        }
                    }
                    if (moveTo%8 != 7) {
                        if (board[moveTo+1].player == 1-player){
                            addPawnMoves(i, moveTo+1);
                        } else if (notesState.e == moveTo+1) {
                            let epCapturedIndex = moveTo+1-8*moveDirection;
                            if (board[epCapturedIndex].player == 1-player && board[epCapturedIndex].pieceType == 0) {
                                legalMoves.push({pieceIndex: i, moveTo: moveTo+1, notes: ["ep"]});
                            }
                        }
                    }
                    if (moveTo%8 != 0) {
                        if (board[moveTo-1].player == 1-player) {
                            addPawnMoves(i, moveTo-1);
                        } else if (notesState.e == moveTo-1) {
                            let epCapturedIndex = moveTo-1-8*moveDirection;
                            if (board[epCapturedIndex].player == 1-player && board[epCapturedIndex].pieceType == 0) {
                                legalMoves.push({pieceIndex: i, moveTo: moveTo-1, notes: ["ep"]});
                            }
                        }
                    }
                } else if (pieceType == 1) { // knights
                    let knightDistIndices = getKnightDistIndices(i);
                    for (let j=0; j<knightDistIndices.length; j++) {
                        if (board[knightDistIndices[j]].player != player) {
                            legalMoves.push({pieceIndex: i, moveTo: knightDistIndices[j], notes: []});
                        }
                    }
                } else if (pieceType == 2) { // bishops
                    addRangedMoves(i, bishopXM, bishopYM);
                } else if (pieceType == 3) { // rooks
                    addRangedMoves(i, rookXM, rookYM);
                } else if (pieceType == 4) { // queens
                    addRangedMoves(i, bishopXM, bishopYM);
                    addRangedMoves(i, rookXM, rookYM);
                }
            }
        }
    }
    function addPawnMoves(pieceIndex, moveTo){
        if (moveTo < 8 || moveTo > 56) {
            for (let i=1; i<5; i++) {
                legalMoves.push({pieceIndex: pieceIndex, moveTo: moveTo, notes: ["promote", i]});
            }
        } else {
            legalMoves.push({pieceIndex: pieceIndex, moveTo: moveTo, notes: []});
        }
    }
    function addRangedMoves(i, xmFunc, ymFunc){
        rangedIterator(board, player, i, xmFunc, ymFunc,
            (index)=>{legalMoves.push({pieceIndex: i, moveTo: index, notes: []});},
            ()=>{}
        );
    }
    return legalMoves;
}

// Shared game/business logic moved from ui.js so multiple views (web UI, CLI, native, etc.) can reuse the same non-presentation behavior.
let corePieceTypeToPromotionSuffix = {
    4: "q",
    3: "r",
    2: "b",
    1: "n"
};

let corePromotionSuffixToPieceType = {
    q: 4,
    r: 3,
    b: 2,
    n: 1
};

let corePieceTypeToSanLetter = {
    1: "N",
    2: "B",
    3: "R",
    4: "Q",
    5: "K"
};

let coreFenPieceMap = {
    p: 0,
    n: 1,
    b: 2,
    r: 3,
    q: 4,
    k: 5
};

let corePieceTypeToFen = ["p", "n", "b", "r", "q", "k"];

function coreCloneBoardState(boardToClone) {
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

function coreIndexToSquareText(index) {
    let file = String.fromCharCode(97 + (index % 8));
    let rank = String(Math.floor(index / 8) + 1);
    return file + rank;
}

function coreCreateCoordinateMoveToken(move) {
    let token = coreIndexToSquareText(move.pieceIndex) + coreIndexToSquareText(move.moveTo);
    if (move.notes && move.notes[0] == "promote") {
        token += corePieceTypeToPromotionSuffix[move.notes[1]] || "q";
    }
    return token;
}

function coreFindKingIndex(boardState, player) {
    for (let i = 0; i < boardState.length; i++) {
        if (boardState[i].player == player && boardState[i].pieceType == 5) {
            return i;
        }
    }
    return undefined;
}

function coreGetMoveDisambiguation(move, legalMoves, boardBefore) {
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

    return coreIndexToSquareText(move.pieceIndex);
}

function coreNormalizeSanToken(token) {
    if (!token) {
        return "";
    }

    let normalized = token.trim();
    normalized = normalized.replace(/0/g, "O");
    normalized = normalized.replace(/[+#?!]+$/g, "");
    normalized = normalized.replace(/e\.p\./gi, "");
    return normalized;
}

function coreCreateSanMoveText(move, boardBefore, player, legalMoves, gameNotes) {
    let notesState = gameNotes || coreGetGameNotes();
    let pieceType = boardBefore[move.pieceIndex].pieceType;
    let toText = coreIndexToSquareText(move.moveTo);
    let fromX = move.pieceIndex % 8;

    let san = "";
    if (move.notes && move.notes[0] == "castle") {
        if (move.notes[1] == "kingside") {
            san = "O-O";
        } else {
            san = "O-O-O";
        }
    } else {
        let capture = boardBefore[move.moveTo].player != undefined && boardBefore[move.moveTo].player != player;
        if (move.notes && move.notes[0] == "ep") {
            capture = true;
        }

        if (pieceType == 0) {
            if (capture) {
                san += String.fromCharCode(97 + fromX) + "x";
            }
            san += toText;
        } else {
            san += corePieceTypeToSanLetter[pieceType] || "";
            san += coreGetMoveDisambiguation(move, legalMoves, boardBefore);
            if (capture) {
                san += "x";
            }
            san += toText;
        }

        if (move.notes && move.notes[0] == "promote") {
            san += "=" + (corePieceTypeToSanLetter[move.notes[1]] || "Q");
        }
    }

    let notesAfter = coreCloneGameNotes(notesState);
    let boardAfter = applyMoveToBoardState(boardBefore, move, notesAfter);
    let opponent = 1 - player;
    let kingIndex = coreFindKingIndex(boardAfter, opponent);
    if (kingIndex != undefined && isSquareAttackedBy(boardAfter, kingIndex, player)) {
        let opponentMoves = getLegalMoves(boardAfter, opponent, notesAfter);
        if (opponentMoves.length == 0) {
            san += "#";
        } else {
            san += "+";
        }
    }

    return san;
}

function coreCreateMoveRecord(move, boardBefore, player, legalMoves, gameNotes) {
    return {
        coordinate: coreCreateCoordinateMoveToken(move),
        san: coreCreateSanMoveText(move, boardBefore, player, legalMoves, gameNotes)
    };
}

function coreParseSquareText(squareText) {
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

function coreBuildPgnText(moves, startPlayer, result) {
    let parts = [];
    let i = 0;

    if (startPlayer == 1 && moves.length > 0) {
        parts.push("1...");
        parts.push((moves[0].san || moves[0].coordinate));
        i = 1;
    }

    for (; i < moves.length; i += 2) {
        let fullmoveNumber = 1 + Math.floor((i + startPlayer) / 2);
        parts.push(fullmoveNumber + ".");
        parts.push((moves[i].san || moves[i].coordinate));

        if (i + 1 < moves.length) {
            parts.push((moves[i + 1].san || moves[i + 1].coordinate));
        }
    }

    if (result && result != "*") {
        parts.push(result);
    }

    return parts.join(" ");
}

function coreBoardToFen(boardState, sideToMovePlayer, gameNotes) {
    let notesState = gameNotes || coreGetGameNotes();
    let rankParts = [];

    for (let y = 7; y >= 0; y--) {
        let emptyCount = 0;
        let rankText = "";
        for (let x = 0; x < 8; x++) {
            let cell = boardState[y * 8 + x];
            if (cell.player == undefined || cell.pieceType == undefined) {
                emptyCount++;
                continue;
            }

            if (emptyCount > 0) {
                rankText += String(emptyCount);
                emptyCount = 0;
            }

            let pieceChar = corePieceTypeToFen[cell.pieceType] || "p";
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

    let sideToMove = sideToMovePlayer == 0 ? "w" : "b";
    let castling = "";
    if ((notesState.c & CORE_C_WK) != 0) {
        castling += "K";
    }
    if ((notesState.c & CORE_C_WQ) != 0) {
        castling += "Q";
    }
    if ((notesState.c & CORE_C_BK) != 0) {
        castling += "k";
    }
    if ((notesState.c & CORE_C_BQ) != 0) {
        castling += "q";
    }
    if (castling.length == 0) {
        castling = "-";
    }

    let enPassant = notesState.e >= 0 ? coreIndexToSquareText(notesState.e) : "-";
    return rankParts.join("/") + " " + sideToMove + " " + castling + " " + enPassant + " " + notesState.h + " " + notesState.f;
}

function coreParseFenToState(fenText) {
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
            let pieceType = coreFenPieceMap[lower];
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

    let notesState = coreCreateGameNotes();
    notesState.c = 0;

    let castling = parts.length > 2 ? parts[2] : "-";
    if (castling != "-") {
        if (castling.indexOf("K") >= 0) {
            notesState.c |= CORE_C_WK;
        }
        if (castling.indexOf("Q") >= 0) {
            notesState.c |= CORE_C_WQ;
        }
        if (castling.indexOf("k") >= 0) {
            notesState.c |= CORE_C_BK;
        }
        if (castling.indexOf("q") >= 0) {
            notesState.c |= CORE_C_BQ;
        }
    }

    let enPassant = parts.length > 3 ? parts[3] : "-";
    if (enPassant == "-") {
        notesState.e = -1;
    } else {
        notesState.e = coreParseSquareText(enPassant);
        if (notesState.e == undefined) {
            throw new Error("Invalid en passant square in FEN.");
        }
    }

    notesState.h = parts.length > 4 ? parseInt(parts[4]) : 0;
    if (isNaN(notesState.h) || notesState.h < 0) {
        throw new Error("Invalid halfmove clock in FEN.");
    }

    notesState.f = parts.length > 5 ? parseInt(parts[5]) : 1;
    if (isNaN(notesState.f) || notesState.f < 1) {
        throw new Error("Invalid fullmove number in FEN.");
    }

    notesState.p = (notesState.f - 1) * 2 + (sideToMove == "b" ? 1 : 0);
    coreRecordPosition(newBoard, sideToMove == "w" ? 0 : 1, notesState, true);

    return {
        board: newBoard,
        whoseTurn: sideToMove == "w" ? 0 : 1,
        n: notesState
    };
}

function coreSanitizePgnToken(token) {
    return token.trim();
}

function coreParsePgnMoveTokens(pgnText) {
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

        tokens.push(coreSanitizePgnToken(token));
    }

    return tokens;
}

function coreParsePgnResult(pgnText) {
    let match = pgnText.match(/(1-0|0-1|1\/2-1\/2|\*)\s*$/);
    if (!match) {
        return "*";
    }
    return match[1];
}

function coreParseTokenToMove(token, player, boardState, gameNotes) {
    let notesState = gameNotes || coreGetGameNotes();
    let cleaned = token.trim();
    if (cleaned.length == 0) {
        return undefined;
    }

    cleaned = cleaned.replace(/0/g, "O");
    let legalMoves = getLegalMoves(boardState, player, notesState);

    let sanToken = coreNormalizeSanToken(cleaned);
    for (let i = 0; i < legalMoves.length; i++) {
        let san = coreCreateSanMoveText(legalMoves[i], boardState, player, legalMoves, notesState);
        if (coreNormalizeSanToken(san) == sanToken) {
            return legalMoves[i];
        }
    }

    let coordinateToken = cleaned.toLowerCase().replace(/[+#?!]/g, "");
    if (coordinateToken.length < 4) {
        return undefined;
    }

    let from = coreParseSquareText(coordinateToken.slice(0, 2));
    let to = coreParseSquareText(coordinateToken.slice(2, 4));
    if (from == undefined || to == undefined) {
        return undefined;
    }

    let promotionPieceType = undefined;
    if (coordinateToken.length >= 5) {
        promotionPieceType = corePromotionSuffixToPieceType[coordinateToken[4]];
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

function coreGetMoveTextForDisplay(moveRecord) {
    return moveRecord.san || moveRecord.coordinate || "";
}

function coreAddNote(notes, note) {
    if (!notes) {
        return;
    }

    for (let i = 0; i < notes.length; i++) {
        if (notes[i] == note) {
            return;
        }
    }

    notes.push(note);
}

function coreHasNote(notes, note) {
    if (!notes) {
        return false;
    }

    for (let i = 0; i < notes.length; i++) {
        if (notes[i] == note) {
            return true;
        }
    }

    return false;
}

function coreCanCastle(boardState, player, kingIndex, side, notesState) {
    let n = notesState || coreGetGameNotes();
    let homeRank = player == 0 ? 0 : 7;
    let expectedKingIndex = homeRank * 8 + 4;
    if (kingIndex != expectedKingIndex) {
        return false;
    }

    let kingPiece = boardState[kingIndex];
    if (!kingPiece || kingPiece.pieceType != 5 || kingPiece.player != player) {
        return false;
    }

    if ((n.c & coreCastleMask(player, side)) == 0) {
        return false;
    }

    if (getSquareAttackerCount(boardState, player, kingIndex) != 0) {
        return false;
    }

    let rookFile = side == "kingside" ? 7 : 0;
    let rookIndex = homeRank * 8 + rookFile;
    let rookPiece = boardState[rookIndex];
    if (!rookPiece || rookPiece.pieceType != 3 || rookPiece.player != player) {
        return false;
    }

    let step = side == "kingside" ? 1 : -1;
    for (let file = 4 + step; file != rookFile; file += step) {
        let betweenIndex = homeRank * 8 + file;
        if (boardState[betweenIndex].player != undefined) {
            return false;
        }
    }

    let kingPath1 = homeRank * 8 + (4 + step);
    let kingPath2 = homeRank * 8 + (4 + step * 2);
    if (getSquareAttackerCount(boardState, player, kingPath1) != 0) {
        return false;
    }
    if (getSquareAttackerCount(boardState, player, kingPath2) != 0) {
        return false;
    }

    return true;
}

function coreAddCastlingMoves(boardState, player, kingIndex, legalMoves, notesState) {
    let homeRank = player == 0 ? 0 : 7;

    if (coreCanCastle(boardState, player, kingIndex, "kingside", notesState)) {
        legalMoves.push({
            pieceIndex: kingIndex,
            moveTo: homeRank * 8 + 6,
            notes: ["castle", "kingside"]
        });
    }

    if (coreCanCastle(boardState, player, kingIndex, "queenside", notesState)) {
        legalMoves.push({
            pieceIndex: kingIndex,
            moveTo: homeRank * 8 + 2,
            notes: ["castle", "queenside"]
        });
    }
}

function coreApplyCastleRookMove(boardState, player, side) {
    let homeRank = player == 0 ? 0 : 7;
    let rookFromFile = side == "kingside" ? 7 : 0;
    let rookToFile = side == "kingside" ? 5 : 3;
    let rookFromIndex = homeRank * 8 + rookFromFile;
    let rookToIndex = homeRank * 8 + rookToFile;

    boardState[rookToIndex] = {
        pieceType: boardState[rookFromIndex].pieceType,
        player: boardState[rookFromIndex].player,
        notes: (boardState[rookFromIndex].notes || []).slice()
    };
    coreAddNote(boardState[rookToIndex].notes, 1);

    boardState[rookFromIndex] = {
        pieceType: undefined,
        player: undefined,
        notes: []
    };
}