// GitHub version

let pieceTypes = [
    {name: "pawn", value: 1}, // 0
    {name: "knight", value: 3}, // 1
    {name: "bishop", value: 3}, // 2
    {name: "rook", value: 5}, // 3
    {name: "queen", value: 9}, // 4
    {name: "king", value: Infinity} // 5
];

let standardStartingPositionSide = [3, 1, 2, 4, 5, 2, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0];

let board = [];
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
}

function getLegalMoves(board, player){
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
                    if (getSquareAttackerCount(moveToIndex) == 0) {
                        legalMoves.push({ pieceIndex: kingIndex, moveTo: moveToIndex, notes: [] });
                    }
                }
            }
        }
    }
    if (getSquareAttackerCount(kingIndex) < 2) {
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
                        }
                    }
                    if (moveTo%8 != 0) {
                        if (board[moveTo-1].player == 1-player) {
                            addPawnMoves(i, moveTo-1);
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
    function getSquareAttackerCount(i) {
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
        rangedIterator(i, bishopXM, bishopYM, () => { }, (index) => {
            let square = board[index];
            if (square.pieceType == 2 || square.pieceType == 4) {
                attackerCount ++;
            }
        });
        rangedIterator(i, rookXM, rookYM, () => { }, (index) => {
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
        rangedIterator(i, xmFunc, ymFunc,
            (index)=>{legalMoves.push({pieceIndex: i, moveTo: index, notes: []});},
            ()=>{}
        );
    }
    function rangedIterator(i, xmFunc, ymFunc, onEmptyFunc, onEnemyFunc){
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
    return legalMoves;
}