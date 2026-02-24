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
                if (i < 56) {
                    if (i%8 > 1 && board[i+6].player != player) {
                        legalMoves.push({pieceIndex: i, moveTo: i+6, notes: []});
                    }
                    if (i%8 < 6 && board[i+10].player != player) {
                        legalMoves.push({pieceIndex: i, moveTo: i+10, notes: []});
                    }
                    if (i < 48) {
                        if (i%8 > 0 && board[i+15].player != player) {
                            legalMoves.push({pieceIndex: i, moveTo: i+15, notes: []});
                        }
                        if (i%8 < 7 && board[i+17].player != player) {
                            legalMoves.push({pieceIndex: i, moveTo: i+17, notes: []});
                        }
                    }
                }
                if (i > 8) {
                    if (i%8 > 1 && board[i-10].player != player) {
                        legalMoves.push({pieceIndex: i, moveTo: i-10, notes: []});
                    }
                    if (i%8 < 6 && board[i-6].player != player) {
                        legalMoves.push({pieceIndex: i, moveTo: i-6, notes: []});
                    }
                    if (i > 16) {
                        if (i%8 > 0 && board[i-17].player != player) {
                            legalMoves.push({pieceIndex: i, moveTo: i-17, notes: []});
                        }
                        if (i%8 < 7 && board[i-15].player != player) {
                            legalMoves.push({pieceIndex: i, moveTo: i-15, notes: []});
                        }
                    }
                }
            } else if (pieceType == 2) { // bishops
                addRangedMoves(i, bishopXM, bishopYM);
            } else if (pieceType == 3) { // rooks
                addRangedMoves(i, rookXM, rookYM);
            } else if (pieceType == 4) { // queens
                addRangedMoves(i, bishopXM, bishopYM);
                addRangedMoves(i, rookXM, rookYM);
            } else if (pieceType == 5) { // kings
                for (let j=-1; j<2; j++) {
                    for (let k=-1; k<2; k++) {
                        let x = i%8+j;
                        let y = Math.floor(i/8)+k;
                        if (inBoardBounds(x, y)) {
                            if (board[y*8+x].player != player) {
                                legalMoves.push({pieceIndex: i, moveTo: y*8+x, notes: []});
                            }
                        }
                    }
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
                    if (board[y*8+x].player != player) {
                        legalMoves.push({pieceIndex: i, moveTo: y*8+x, notes: []});
                        if (board[y*8+x].player == 1-player) {
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
    return legalMoves;
}