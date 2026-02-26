// positive numbers mean the position is better for player 0 (white)
// negative numbers mean the position is better for player 1 (black)

let playerToPosNeg = [1, -1];

let whiteMinorStartSquares = [1, 2, 5, 6];
let blackMinorStartSquares = [57, 58, 61, 62];
let whiteMinorCenterSquares = [18, 19, 20, 21];
let blackMinorCenterSquares = [42, 43, 44, 45];

function scoreDevelopment(board) {
    let score = 0;

    for (let i = 0; i < board.length; i++) {
        let square = board[i];
        if (square.player == undefined || square.pieceType == undefined) {
            continue;
        }

        if (square.pieceType == 1 || square.pieceType == 2) {
            if (square.player == 0) {
                if (whiteMinorStartSquares.indexOf(i) == -1) {
                    score += 120;
                }
                if (whiteMinorCenterSquares.indexOf(i) >= 0) {
                    score += 60;
                }
            } else {
                if (blackMinorStartSquares.indexOf(i) == -1) {
                    score -= 120;
                }
                if (blackMinorCenterSquares.indexOf(i) >= 0) {
                    score -= 60;
                }
            }
        }

        if (square.pieceType == 5) {
            if (square.player == 0 && (i == 6 || i == 2)) {
                score += 90;
            } else if (square.player == 1 && (i == 62 || i == 58)) {
                score -= 90;
            }
        }
    }

    return score;
}

function scorePosition(board, player, gameNotes){
    let score = 0;
    for (let i=0; i<board.length; i++) {
        let square = board[i];
        if (square.player != undefined) {
            score += pieceTypes[square.pieceType].value*playerToPosNeg[square.player];
        }
    }
    score += scoreDevelopment(board);
    return score;
}

function scoreMoveHeuristic(board, move){
    let score = 0;
    let targetSquare = board[move.moveTo];

    if (targetSquare.player != undefined && targetSquare.pieceType != undefined) {
        score += pieceTypes[targetSquare.pieceType].value * 10;
    }

    if (move.notes && move.notes[0] == "ep") {
        score += pieceTypes[0].value * 10;
    }

    if (move.notes && move.notes[0] == "promote") {
        score += pieceTypes[move.notes[1]].value;
    }

    if (move.notes && move.notes[0] == "castle") {
        score += 2;
    }

    return score;
}

function orderMoves(board, legalMoves){
    let moves = legalMoves.slice();
    moves.sort((a, b) => scoreMoveHeuristic(board, b) - scoreMoveHeuristic(board, a));
    return moves;
}

function scorePositionTree(board, player, pliesLeft, gameNotes, alpha, beta){
    if (pliesLeft <= 0) {
        return scorePosition(board, player, gameNotes);
    }

    let legalMoves = getLegalMoves(board, player, gameNotes);
    if (legalMoves.length == 0) {
        return scorePosition(board, player, gameNotes);
    }

    let orderedMoves = orderMoves(board, legalMoves);

    if (player == 0) {
        let bestScore = -Infinity;
        for (let i=0; i<orderedMoves.length; i++) {
            let newNotes = coreCloneGameNotes(gameNotes);
            let nextBoard = applyMoveToBoardState(board, orderedMoves[i], newNotes);
            let score = scorePositionTree(nextBoard, 1, pliesLeft-1, newNotes, alpha, beta);
            if (score > bestScore) {
                bestScore = score;
            }
            if (score > alpha) {
                alpha = score;
            }
            if (alpha >= beta) {
                break;
            }
        }
        return bestScore;
    }

    let bestScore = Infinity;
    for (let i=0; i<orderedMoves.length; i++) {
        let newNotes = coreCloneGameNotes(gameNotes);
        let nextBoard = applyMoveToBoardState(board, orderedMoves[i], newNotes);
        let score = scorePositionTree(nextBoard, 0, pliesLeft-1, newNotes, alpha, beta);
        if (score < bestScore) {
            bestScore = score;
        }
        if (score < beta) {
            beta = score;
        }
        if (alpha >= beta) {
            break;
        }
    }

    return bestScore;
}

function getBestMove(board, player, plies){
    let rootNotes = coreCloneGameNotes(coreGetGameNotes());
    let legalMoves = getLegalMoves(board, player, rootNotes);
    if (legalMoves.length == 0) {
        return undefined;
    }

    let orderedMoves = orderMoves(board, legalMoves);
    let searchDepth = plies - 1;
    let bestMove = orderedMoves[0];
    let alpha = -Infinity;
    let beta = Infinity;
    let bestScore = player == 0 ? -Infinity : Infinity;

    for (let i=0; i<orderedMoves.length; i++) {
        let move = orderedMoves[i];
        let newNotes = coreCloneGameNotes(rootNotes);
        let nextBoard = applyMoveToBoardState(board, move, newNotes);
        let score;

        if (searchDepth > 0) {
            score = scorePositionTree(nextBoard, 1-player, searchDepth, newNotes, alpha, beta);
        } else {
            score = scorePosition(nextBoard, 1-player, newNotes);
        }

        if ((player == 0 && score > bestScore) || (player == 1 && score < bestScore)) {
            bestScore = score;
            bestMove = move;
        }

        if (player == 0) {
            if (score > alpha) {
                alpha = score;
            }
        } else {
            if (score < beta) {
                beta = score;
            }
        }
    }

    return bestMove;
}