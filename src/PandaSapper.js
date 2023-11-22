
var EMPTY = 0;
var ACTUAL_BOMB = 16;
var THINK_BOMB = 32;
var UNSEEN = 64;

var GAME_CONTINUES = 0;
var GAME_WAIT = 1;
var GAME_LOST = 2;
var GAME_WON = 3;
var GAME_READY = 4;

var GAME_START = 10;
var GAME_QUIT = 11;

var GAME_LEVEL = 12;
var GAME_EASY = 12;
var GAME_MEDIUM = 13;
var GAME_DIFFICULT = 14;

var GAME_TYPE = 20;
var GAME_HEXAGON = 20;
var GAME_SQUARE = 21;
var GAME_TRIANGLE = 22;
var CORRECT = 128;

var MAX_SIZE = 30;

var gameStatus;
var gameType;
var gameLevel;

var gridWidth;
var gridHeight;
var gridBombs;
var gridType;
var gridLevel;

var proxyObj;

var numberOfUnseen;
var numberOfThink;

var numberOfBombs = [10, 40, 99];
var widthInTiles = [8, 16, 30];
var heightInTiles = [8, 16, 16];


var tileStates = new Array(MAX_SIZE);
(function() {
    for (var i = 0; i < MAX_SIZE; i++)
        tileStates[i] = new Array(MAX_SIZE);
}());


function hideBombs(xs, ys) {
    var i
    var x, y;

    tileStates[xs][ys] += CORRECT;

    for (i = 0; i < gridBombs; i++) {
        do {
            x = (proxyObj.rand() >> 8) % gridWidth;
            y = (proxyObj.rand() >> 8) % gridHeight;
        } while(tileStates[x][y] !== UNSEEN || countAdjacent(x, y, CORRECT));
        tileStates[x][y] += ACTUAL_BOMB;
    }

    tileStates[xs][ys] -= CORRECT;

    for (x = 0; x < gridWidth; x++) {
        for (y = 0; y < gridHeight; y++) {
            if (!(tileStates[x][y] & ACTUAL_BOMB))
                tileStates[x][y] += countAdjacent(x, y, ACTUAL_BOMB);
        }
    }

    proxyObj.startClock(1);
}


function selectAdjacent(x, y) {
    var dx, dy;
    var dd = gridType === GAME_TRIANGLE ? 2 : 1;

    if (tileStates[x][y] & UNSEEN || gameStatus === GAME_WAIT)
        return;

    var n = countAdjacent(x, y, THINK_BOMB);

    if (tileStates[x][y] !== n)
        return;

    for (dx = -dd; dx <= dd; dx++) {
        var tmpX = x + dx;
        if (tmpX < 0 || tmpX >= gridWidth)
            continue;

        for (dy = -1; dy <= 1; dy++) {
            var tmpY = y + dy;
            if (tmpY < 0 || tmpY >= gridHeight)
                continue;

            if (dx === 0 && dy === 0)
                continue;

            if (gridType === GAME_HEXAGON && dy !== 0 && dx === (1 - 2 * (y % 2)))
                continue;

            if (gridType === GAME_TRIANGLE && dy === (2 * ((x + y) % 2) -1 ) && (dx === -2 || dx === 2))
                continue;

            if (!(tileStates[tmpX][tmpY] & THINK_BOMB))
                proxyObj.selectSquare(tmpX, tmpY);
        }
    }
}


function removeEmpties(x, y) {
    var dx, dy;
    var dd = gridType === GAME_TRIANGLE ? 2 : 1;

    if (!(tileStates[x][y] & UNSEEN) || (tileStates[x][y] & THINK_BOMB))
       return;

    tileStates[x][y] &= ~UNSEEN;

    numberOfUnseen--;

    proxyObj.drawSquare(x, y, tileStates[x][y]);

    if (tileStates[x][y] !== EMPTY)
        return;

    for (dx = -dd; dx <= dd; dx++) {
        var tmpX = x + dx;

        if (tmpX < 0 || tmpX >= gridWidth)
            continue;

        for (dy = -1; dy <= 1; dy++) {
            var tmpY = y + dy;

            if (tmpY < 0 || tmpY >= gridHeight)
                continue;

            if (dx === 0 && dy === 0)
                continue;

            if (gridType === GAME_HEXAGON && dy !== 0 && dx === (1 - 2 * (y % 2)))
                continue;

            if (gridType === GAME_TRIANGLE && dy === (2 * ((x + y) % 2) - 1) && (dx === -2 || dx === 2))
                continue;

            removeEmpties(tmpX, tmpY);
        }
    }
}


function countAdjacent(x, y, flag) {
    var n = 0;
    var dx, dy;
    var dd = (gridType === GAME_TRIANGLE) ? 2 : 1;

    for (dx = -dd; dx <= dd; dx++) {
        var tmpX = x + dx;
        if (tmpX < 0 || tmpX >= gridWidth)
            continue;

        for (dy = -1; dy <= 1; dy++) {
            var tmpY = y + dy;

            if (tmpY < 0 || tmpY >= gridHeight)
                continue;

            if (gridType === GAME_HEXAGON && dy !== 0 && dx === (1 - 2 * (y % 2)))
                continue;

            if (gridType === GAME_TRIANGLE && dy === (2 * ((x + y) % 2) - 1) && (dx === -2 || dx === 2))
                continue;

            if (tileStates[tmpX][tmpY] & flag)
                n++;
        }
    }

    return n;
}


