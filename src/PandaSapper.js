var NLEVELS = 3;
var NTYPES = 3;

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

var OFFSET_X = 30;
var OFFSET_Y = 30;

var MAX_RAND = 0x7FFF;

var gameStatus;
var gameType;
var gameLevel;

var newStatus = 0;

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

var scaleX = 10;
var scaleY = 10;

var idleTimer;
var startTicks;


function gameInit() {
    idleTimer = new IdleTimer();
    idleTimer.oneShot = true;
    idleTimer.callback = displayClock;
}


function gameLoop() {
    idleTimer.idle();

    var xstatus = processEvents();

    if (xstatus >= GAME_LEVEL && xstatus < (GAME_LEVEL + NLEVELS) && xstatus !== gameLevel) {
       gameLevel = xstatus;
       xstatus = GAME_START;
    }

    if (xstatus >= GAME_TYPE && xstatus < (GAME_TYPE + NTYPES) && xstatus !== gameType) {
       gameType = xstatus;
       xstatus = GAME_START;
    }

    if (xstatus === GAME_START) {
        if (gameStatus === GAME_CONTINUES)
            stopGame();
        startGame(gameLevel, gameType);
        showHighScores();
    }

    if (gameStatus === GAME_WON) {
        var elapsedTime = stopGame();
        addHighScore(ticks);
        showHighScores();
    }
    else if (gameStatus === GAME_LOST) {
        stopGame();
        showHighScores();
    }
}


function processEvents() {
    var result = newStatus;
    newStatus = 0;
    return result;
}


function startGame(level, type) {
    gridType = type;
    gridLevel = level;
    gridWidth = widthInTiles[level-GAME_LEVEL];
    gridHeight = heightInTiles[level-GAME_LEVEL];
    gridBombs = numberOfBombs[level-GAME_LEVEL];
    numberOfUnseen = gridWidth * gridHeight;
    numberOfThink = 0;
    gameStatus = GAME_READY;

    var x, y;
    for (x = 0; x < gridWidth; x++) {
        for (y = 0; y < gridHeight; y++)
            tileStates[x][y] = UNSEEN;
    }

    scaleWindow();
    drawGrid();
    startClock(0);
    setUXB(gridBombs);
}


function stopGame() {
    gameStatus = GAME_WAIT;
    return stopClock();
}


function addHighScore(value) {

}


function showHighScores() {

}


function hideBombs(xs, ys) {
    var i
    var x, y;

    tileStates[xs][ys] += CORRECT;

    for (i = 0; i < gridBombs; i++) {
        do {
            x = ((Math.random() * MAX_RAND) >> 8) % gridWidth;
            y = ((Math.random() * MAX_RAND) >> 8) % gridHeight;
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

    startClock(1);
}


function selectSquare(x, y) {
    if (!(tileStates[x][y] & UNSEEN) || tileStates[x][y] & THINK_BOMB || gameStatus === GAME_WAIT)
        return;

    if (gameStatus === GAME_READY) {
        hideBombs(x, y);
        gameStatus = GAME_CONTINUES;
    }

    removeEmpties(x, y);

    if (tileStates[x][y] & ACTUAL_BOMB) {
        var xi, yi;

        for (xi = 0; xi < gridWidth; xi++) {
            for (yi = 0; yi < gridHeight; yi++) {
                if (tileStates[xi][yi] & UNSEEN) {
                    tileStates[xi][yi] &= ~UNSEEN;
                    if (tileStates[xi][yi] & THINK_BOMB && tileStates[xi][yi] & ACTUAL_BOMB)
                        tileStates[xi][yi] |= CORRECT;
                } else {
                    tileStates[xi][yi] |= CORRECT;
                }
            }
        }
        gameStatus = GAME_LOST;
        drawGrid();
    } else {
        drawSquare(x, y, tileStates[x][y]);
        if (numberOfThink === numberOfUnseen)
            gameStatus = GAME_WON;
    }
}


function selectSquareOrAdjacent(x, y) {
    if (tileStates[x][y] & UNSEEN)
        selectSquare(x, y);
    else
        selectAdjacent(x, y);
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
                selectSquare(tmpX, tmpY);
        }
    }
}


function markBomb(x, y) {
    if (!(tileStates[x][y] & UNSEEN) || gameStatus === GAME_WAIT)
        return;

    if (numberOfThink === gridBombs && !(tileStates[x][y] & THINK_BOMB))
        return;

    tileStates[x][y] ^= THINK_BOMB;

    if(tileStates[x][y] & THINK_BOMB)
       numberOfThink++;
    else
       numberOfThink--;

    setUXB(gridBombs - numberOfThink);

    drawSquare(x, y, tileStates[x][y]);

    if (numberOfThink === numberOfUnseen)
        gameStatus = GAME_WON;
}


function removeEmpties(x, y) {
    var dx, dy;
    var dd = gridType === GAME_TRIANGLE ? 2 : 1;

    if (!(tileStates[x][y] & UNSEEN) || (tileStates[x][y] & THINK_BOMB))
       return;

    tileStates[x][y] &= ~UNSEEN;

    numberOfUnseen--;

    drawSquare(x, y, tileStates[x][y]);

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


function onGameAreaClicked(mouseX, mouseY, buttonNumber) {
    var x = -1, y = -1;
    var guessX, guessY, dx, dy;
    var i, j, d, dmin = 1e6;

    var buttonX = mouseX - OFFSET_X;
    var buttonY = mouseY - OFFSET_Y;

    switch(gridType) {
        case GAME_HEXAGON:
            guessY = (buttonY / scaleY) >> 0;
            guessX = ((buttonX - (guessY % 2) * (scaleX/2)) / scaleX) >> 0;
            for (i = guessX - 1; i <= guessX + 1; i++) {
                for (j = guessY - 1; j <= guessY + 1; j++) {
                    if (i < 0 || i >= gridWidth || j < 0 || j >= gridHeight)
                        continue;
                    dx = buttonX - (i * scaleX + (1 + (j % 2)) * scaleX/2);
                    dy = buttonY - (j*scaleY + 2 * scaleY/3);
                    d = dx * dx + dy * dy;
                    if (d < dmin) {
                        x = i;
                        y = j;
                        dmin = d;
                    }
                }

            }
            break;

        case GAME_SQUARE:
            x = (buttonX / scaleX) >> 0;
            y = (buttonY / scaleY) >> 0;
            break;

        case GAME_TRIANGLE:
            guessX = (buttonX * 2 / scaleX) >> 0;
            y = (buttonY / scaleY) >> 0;
            for (i = guessX - 1; i <= guessX + 1; i++) {
                if (i < 0 || i >= gridWidth)
                    continue;
                dx = buttonX - (i * scaleX/2 + scaleX/2);
                dy = buttonY - (y * scaleY + (1 + (1 + i + y) % 2) * scaleY/3);
                d = dx * dx + dy * dy;
                if (d < dmin) {
                    x = i;
                    dmin = d;
                }
            }
    }

    if(x < 0 || x >= gridWidth || y < 0 || y >= gridHeight)
        return;


    switch(buttonNumber) {
        case 1:
            selectSquareOrAdjacent(x, y);
            break;
        case 2:
            selectAdjacent(x, y);
            break;
        case 3:
            markBomb(x, y);
    }

    invalidateGameArea();
}

function scaleWindow() {
    proxyObj.scaleWindow();
}


function drawGrid() {
    proxyObj.drawGrid();
}


function setUXB(n) {
    proxyObj.setUXB(n);
}


function invalidateGameArea() {
    proxyObj.invalidateGameArea();
}


function updateClock(txt) {
    proxyObj.updateClock(txt);
}


function drawSquare(x, y, state) {
    proxyObj.drawSquare(x, y, state);
}


function displayClock() {
    var ticks1000 = elapsedTime();
    var ticks = Math.round(ticks1000 / 1000);
    ticks1000 -= 1000*ticks;
    idleTimer.interval = 1000-ticks1000;
    idleTimer.start();
    updateClock(ticks.toFixed(0));
}


function startClock(reset) {
    if(reset) {
        startTicks = Date.now();
        displayClock();
    } else {
        updateClock("0");
    }
}


function stopClock() {
    idleTimer.stop();
    var ticks = elapsedTime();
    updateClock((ticks/1000.0).toFixed(2));
    return ticks;
}


function elapsedTime() {
    return Date.now() - startTicks;
}


function IdleTimer() {
    this.interval = 100;
    this.enabled = false;
    this.oneShot = false;
    this.callback = undefined;
    this.lastTicks = undefined;
}


IdleTimer.prototype.start = function() {
    this.enabled = true;
    this.lastTicks = Date.now();
}


IdleTimer.prototype.stop = function() {
    this.enabled = false;
}


IdleTimer.prototype.idle = function() {
    if (!this.enabled)
        return;

    var currTicks = Date.now();

    if ((currTicks - this.lastTicks) >= this.interval) {
        this.lastTicks += this.interval;

        if (this.oneShot)
            this.stop();

        if (this.callback)
            this.callback();
    }
}
