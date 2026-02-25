// positive numbers mean the position is better for player 0 (white)
// negative numbers mean the position is better for player 1 (black)

let playerToPosNeg = [1, -1];

function scorePosition(board){
    let score = 0;
    for (let i=0; i<board.length; i++) {
        let square = board[i];
        if (square.player != undefined) {
            score += pieceTypes[square.pieceType].value*playerToPosNeg[square.player];
        }
    }
    return score;
}

function getBestMove(board, player, plies){
    let positionTree = {
        board: board,
        n: coreCloneGameNotes(coreGetGameNotes()),
        player: player,
        pliesLeft: plies,
        score: undefined,
        branches: [],
        bestMoveIndex: undefined,
        moveDone: undefined
    };
    branchPositionTree(positionTree);
    scorePositionTree(positionTree);
    return positionTree.branches[positionTree.bestMoveIndex].moveDone;
}

function branchPositionTree(positionTree){
    let legalMoves = getLegalMoves(positionTree.board, positionTree.player, positionTree.n);
    for (let i=0; i<legalMoves.length; i++) {
        let newNotes = coreCloneGameNotes(positionTree.n);
        let newBranch = {
            board: applyMoveToBoardState(positionTree.board, legalMoves[i], newNotes),
            n: newNotes,
            player: 1-positionTree.player,
            pliesLeft: positionTree.pliesLeft-1,
            score: undefined,
            branches: [],
            moveDone: legalMoves[i]
        }
        if (newBranch.pliesLeft > 0) {
            branchPositionTree(newBranch);
        } else {
            newBranch.score = scorePosition(newBranch.board);
        }
        positionTree.branches.push(newBranch);
    }
}

function scorePositionTree(positionTree){
    let bestMove = {index: 0, score: playerToPosNeg[positionTree.player]*(-Infinity)};
    for (let i=0; i<positionTree.branches.length; i++) {
        if (positionTree.branches[i].score == undefined) {
            scorePositionTree(positionTree.branches[i]);
        }
        if (positionTree.branches[i].score > bestMove.score && positionTree.player == 0) {
            bestMove = {index: i, score: positionTree.branches[i].score};
        } else if (positionTree.branches[i].score < bestMove.score && positionTree.player == 1) {
            bestMove = {index: i, score: positionTree.branches[i].score};
        }
    }
    positionTree.bestMoveIndex = bestMove.index;
    positionTree.score = bestMove.score;
}