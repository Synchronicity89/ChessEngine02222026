// positive numbers mean the position is better for player 0 (white)
// negative numbers mean the position is better for player 1 (black)

let playerToPosNeg = [1, -1];

let engineDeveloperBiasModes = {
    optimizedFast: "optimizedFast",
    upstreamSlow: "upstreamSlow"
};

let engineDeveloperBiasMode = engineDeveloperBiasModes.optimizedFast;
let enginePieceValues = new Int32Array([
    pieceTypes[0].value,
    pieceTypes[1].value,
    pieceTypes[2].value,
    pieceTypes[3].value,
    pieceTypes[4].value,
    pieceTypes[5].value
]);

function buildSquareMask(indices) {
    let mask = new Uint8Array(64);
    for (let i = 0; i < indices.length; i++) {
        mask[indices[i]] = 1;
    }
    return mask;
}

let whiteMinorStartMask = buildSquareMask([1, 2, 5, 6]);
let blackMinorStartMask = buildSquareMask([57, 58, 61, 62]);
let whiteMinorCenterMask = buildSquareMask([18, 19, 20, 21]);
let blackMinorCenterMask = buildSquareMask([42, 43, 44, 45]);

function findKingIndex(board, player) {
    for (let i = 0; i < board.length; i++) {
        let square = board[i];
        if (square.player == player && square.pieceType == 5) {
            return i;
        }
    }

    return -1;
}

function getKingIndexForPlayer(board, player, notesState) {
    if (notesState) {
        let noteKingIndex = player == 0 ? notesState.kw : notesState.kb;
        if (typeof noteKingIndex == "number" && noteKingIndex >= 0 && noteKingIndex < 64) {
            return noteKingIndex;
        }
    }

    return findKingIndex(board, player);
}

function isKingCastled(player, kingIndex) {
    if (player == 0) {
        return kingIndex == 6 || kingIndex == 2;
    }

    return kingIndex == 62 || kingIndex == 58;
}

function getSideCastlingPenalty(player, notesState, kingIndex) {
    if (!notesState || kingIndex < 0 || isKingCastled(player, kingIndex)) {
        return 0;
    }

    let kingSideMask = player == 0 ? CORE_C_WK : CORE_C_BK;
    let queenSideMask = player == 0 ? CORE_C_WQ : CORE_C_BQ;
    let hasKingSide = (notesState.c & kingSideMask) != 0;
    let hasQueenSide = (notesState.c & queenSideMask) != 0;

    if (!hasKingSide && !hasQueenSide) {
        return 500;
    }

    let penalty = 0;
    if (!hasKingSide) {
        penalty += 250;
    }
    if (!hasQueenSide) {
        penalty += 250;
    }

    return penalty;
}

function scoreCastlingRights(board, gameNotes) {
    let notesState = gameNotes || coreGetGameNotes();
    let whiteKingIndex = getKingIndexForPlayer(board, 0, notesState);
    let blackKingIndex = getKingIndexForPlayer(board, 1, notesState);

    let whitePenalty = getSideCastlingPenalty(0, notesState, whiteKingIndex);
    let blackPenalty = getSideCastlingPenalty(1, notesState, blackKingIndex);

    return blackPenalty - whitePenalty;
}

function scoreDevelopment(board) {
    let score = 0;

    for (let i = 0; i < board.length; i++) {
        let square = board[i];
        if (square.player == undefined || square.pieceType == undefined) {
            continue;
        }

        if (square.pieceType == 1 || square.pieceType == 2) {
            if (square.player == 0) {
                if (whiteMinorStartMask[i] == 0) {
                    score += 120;
                }
                if (whiteMinorCenterMask[i] == 1) {
                    score += 60;
                }
            } else {
                if (blackMinorStartMask[i] == 0) {
                    score -= 120;
                }
                if (blackMinorCenterMask[i] == 1) {
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

function scoreUpstreamMobility(board, gameNotes) {
    return getLegalMoves(board, 0, gameNotes).length - getLegalMoves(board, 1, gameNotes).length;
}

function scoreDeveloperBias(board, gameNotes) {
    if (engineDeveloperBiasMode == engineDeveloperBiasModes.upstreamSlow) {
        return scoreUpstreamMobility(board, gameNotes);
    }

    return scoreDevelopment(board);
}

function setEngineDeveloperBiasMode(mode) {
    if (mode == engineDeveloperBiasModes.upstreamSlow || mode == engineDeveloperBiasModes.optimizedFast) {
        engineDeveloperBiasMode = mode;
    } else {
        engineDeveloperBiasMode = engineDeveloperBiasModes.optimizedFast;
    }

    return engineDeveloperBiasMode;
}

function getEngineDeveloperBiasMode() {
    return engineDeveloperBiasMode;
}

function scorePosition(board, player, gameNotes){
    let materialScore = 0;
    let developmentScore = 0;

    for (let i=0; i<board.length; i++) {
        let square = board[i];
        if (square.player != undefined) {
            materialScore += enginePieceValues[square.pieceType] * playerToPosNeg[square.player];

            if (square.pieceType == 1 || square.pieceType == 2) {
                if (square.player == 0) {
                    if (whiteMinorStartMask[i] == 0) {
                        developmentScore += 120;
                    }
                    if (whiteMinorCenterMask[i] == 1) {
                        developmentScore += 60;
                    }
                } else {
                    if (blackMinorStartMask[i] == 0) {
                        developmentScore -= 120;
                    }
                    if (blackMinorCenterMask[i] == 1) {
                        developmentScore -= 60;
                    }
                }
            }

            if (square.pieceType == 5) {
                if (square.player == 0 && (i == 6 || i == 2)) {
                    developmentScore += 90;
                } else if (square.player == 1 && (i == 62 || i == 58)) {
                    developmentScore -= 90;
                }
            }
        }
    }

    let score = materialScore;
    if (engineDeveloperBiasMode == engineDeveloperBiasModes.upstreamSlow) {
        score += scoreUpstreamMobility(board, gameNotes);
    } else {
        score += developmentScore;
    }
    score += scoreCastlingRights(board, gameNotes);
    return score;
}

function scoreMoveHeuristic(board, move){
    let score = 0;
    let targetSquare = board[move.moveTo];

    if (targetSquare.player != undefined && targetSquare.pieceType != undefined) {
        score += enginePieceValues[targetSquare.pieceType] * 10;
    }

    if (move.notes && move.notes[0] == "ep") {
        score += enginePieceValues[0] * 10;
    }

    if (move.notes && move.notes[0] == "promote") {
        score += enginePieceValues[move.notes[1]];
    }

    if (move.notes && move.notes[0] == "castle") {
        score += 200;
    }

    return score;
}

function orderMoves(board, legalMoves){
    if (legalMoves.length < 2) {
        return legalMoves;
    }

    let bestIndex = 0;
    let bestScore = scoreMoveHeuristic(board, legalMoves[0]);
    for (let i = 1; i < legalMoves.length; i++) {
        let score = scoreMoveHeuristic(board, legalMoves[i]);
        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    }

    if (bestIndex != 0) {
        let temp = legalMoves[0];
        legalMoves[0] = legalMoves[bestIndex];
        legalMoves[bestIndex] = temp;
    }

    if (legalMoves.length > 2) {
        let secondBestIndex = 1;
        let secondBestScore = scoreMoveHeuristic(board, legalMoves[1]);
        for (let i = 2; i < legalMoves.length; i++) {
            let score = scoreMoveHeuristic(board, legalMoves[i]);
            if (score > secondBestScore) {
                secondBestScore = score;
                secondBestIndex = i;
            }
        }

        if (secondBestIndex != 1) {
            let temp = legalMoves[1];
            legalMoves[1] = legalMoves[secondBestIndex];
            legalMoves[secondBestIndex] = temp;
        }
    }

    return legalMoves;
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