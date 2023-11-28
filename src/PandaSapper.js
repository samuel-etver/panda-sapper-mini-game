import * as PIXI from 'pixi.js';

const NLEVELS = 3;
const NTYPES = 3;

const EMPTY = 0;
const ACTUAL_BOMB = 16;
const THINK_BOMB = 32;
const UNSEEN = 64;

const GAME_CONTINUES = 0;
const GAME_WAIT = 1;
const GAME_LOST = 2;
const GAME_WON = 3;
const GAME_READY = 4;

const GAME_START = 10;

const GAME_LEVEL = 12;
const GAME_EASY = 12;
const GAME_MEDIUM = 13;
const GAME_DIFFICULT = 14;

const GAME_TYPE = 20;
const GAME_HEXAGON = 20;
const GAME_SQUARE = 21;
const GAME_TRIANGLE = 22;
const CORRECT = 128;

const MAX_SIZE = 30;

const OFFSET_X = 30;
const OFFSET_Y = 30;

const MAX_RAND = 0x7FFF;

var gameApp;
var gameStatus = GAME_WAIT;
var gameType = GAME_HEXAGON;
var gameLevel = GAME_EASY;

var newStatus = 0;

var gridNode = {
    area: undefined,
    type: undefined,
    level: undefined,
    cols: undefined,
    rows: undefined,
    bombs: undefined
};

var numberOfUnseen;
var numberOfThink;

const numberOfBombs = [10, 40, 99];
const tilesInCol = [8, 16, 30];
const tilesInRow = [8, 16, 16];

var tileNodes = new Array(MAX_SIZE);
(function() {
    for (let col = 0; col < MAX_SIZE; col++) {
        tileNodes[col] = new Array(MAX_SIZE);

        for (let row = 0; row < MAX_SIZE; row++) {
            let node = {
                area: undefined,
            };
            tileNodes[col][row] = node;
        }
    }
}());


var tileStates = new Array(MAX_SIZE);
(function() {
    for (var i = 0; i < MAX_SIZE; i++) 
        tileStates[i] = new Array(MAX_SIZE);
}());


var newWidth;
var newHeight;

var scaleX = 10;
var scaleY = 10;

var idleTimer;
var startTicks;

var outline = new Array(8);

var gameNode = {
    area: undefined,
    w: 0,
    h: 0
};


export function gameInit(app) {
    gameApp = app;

    idleTimer = new IdleTimer();
    idleTimer.oneShot = true;
    idleTimer.callback = displayClock;

    startGame(gameLevel, gameType);
}


export function gameLoop() {
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
    gridNode.type = type;
    gridNode.level = level;
    gridNode.cols = tilesInCol[level-GAME_LEVEL];
    gridNode.rows = tilesInRow[level-GAME_LEVEL];
    gridNode.bombs = numberOfBombs[level-GAME_LEVEL];
    numberOfUnseen = gridNode.cols * gridNode.rows;
    numberOfThink = 0;
    gameStatus = GAME_READY;

    for (let x = 0; x < gridNode.cols; x++) {
        for (let y = 0; y < gridNode.rows; y++)
            tileStates[x][y] = UNSEEN;
    }

    scaleWindow();
    drawGrid();
    startClock(0);
    setUXB(gridNode.bombs);
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

    for (i = 0; i < gridNode.bombs; i++) {
        do {
            x = ((Math.random() * MAX_RAND) >> 8) % gridNode.cols;
            y = ((Math.random() * MAX_RAND) >> 8) % gridNode.rows;
        } while(tileStates[x][y] !== UNSEEN || countAdjacent(x, y, CORRECT));
        tileStates[x][y] += ACTUAL_BOMB;
    }

    tileStates[xs][ys] -= CORRECT;

    for (x = 0; x < gridNode.cols; x++) {
        for (y = 0; y < gridNode.rows; y++) {
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

        for (xi = 0; xi < gridNode.cols; xi++) {
            for (yi = 0; yi < gridNode.rows; yi++) {
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
        drawSquare(x, y);
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
    var dd = gridNode.type === GAME_TRIANGLE ? 2 : 1;

    if (tileStates[x][y] & UNSEEN || gameStatus === GAME_WAIT)
        return;

    var n = countAdjacent(x, y, THINK_BOMB);

    if (tileStates[x][y] !== n)
        return;

    for (dx = -dd; dx <= dd; dx++) {
        var tmpX = x + dx;
        if (tmpX < 0 || tmpX >= gridNode.cols)
            continue;

        for (dy = -1; dy <= 1; dy++) {
            var tmpY = y + dy;
            if (tmpY < 0 || tmpY >= gridNode.rows)
                continue;

            if (dx === 0 && dy === 0)
                continue;

            if (gridNode.type === GAME_HEXAGON && dy !== 0 && dx === (1 - 2 * (y % 2)))
                continue;

            if (gridNode.type === GAME_TRIANGLE && dy === (2 * ((x + y) % 2) -1 ) && (dx === -2 || dx === 2))
                continue;

            if (!(tileStates[tmpX][tmpY] & THINK_BOMB))
                selectSquare(tmpX, tmpY);
        }
    }
}


function markBomb(x, y) {
    if (!(tileStates[x][y] & UNSEEN) || gameStatus === GAME_WAIT)
        return;

    if (numberOfThink === gridNode.bombs && !(tileStates[x][y] & THINK_BOMB))
        return;

    tileStates[x][y] ^= THINK_BOMB;

    if(tileStates[x][y] & THINK_BOMB)
        numberOfThink++;
    else
        numberOfThink--;

    setUXB(gridNode.bombs - numberOfThink);

    drawSquare(x, y);

    if (numberOfThink === numberOfUnseen)
        gameStatus = GAME_WON;
}


function removeEmpties(x, y) {
    var dx, dy;
    var dd = gridNode.type === GAME_TRIANGLE ? 2 : 1;

    if (!(tileStates[x][y] & UNSEEN) || (tileStates[x][y] & THINK_BOMB))
        return;

    tileStates[x][y] &= ~UNSEEN;

    numberOfUnseen--;

    drawSquare(x, y);

    if (tileStates[x][y] !== EMPTY)
        return;

    for (dx = -dd; dx <= dd; dx++) {
        var tmpX = x + dx;

        if (tmpX < 0 || tmpX >= gridNode.cols)
            continue;

        for (dy = -1; dy <= 1; dy++) {
            var tmpY = y + dy;

            if (tmpY < 0 || tmpY >= gridNode.rows)
                continue;

            if (dx === 0 && dy === 0)
                continue;

            if (gridNode.type === GAME_HEXAGON && dy !== 0 && dx === (1 - 2 * (y % 2)))
                continue;

            if (gridNode.type === GAME_TRIANGLE && dy === (2 * ((x + y) % 2) - 1) && (dx === -2 || dx === 2))
                continue;

            removeEmpties(tmpX, tmpY);
        }
    }
}


function countAdjacent(x, y, flag) {
    var n = 0;
    var dx, dy;
    var dd = (gridNode.type === GAME_TRIANGLE) ? 2 : 1;

    for (dx = -dd; dx <= dd; dx++) {
        var tmpX = x + dx;
        if (tmpX < 0 || tmpX >= gridNode.cols)
            continue;

        for (dy = -1; dy <= 1; dy++) {
            var tmpY = y + dy;

            if (tmpY < 0 || tmpY >= gridNode.rows)
                continue;

            if (gridNode.type === GAME_HEXAGON && dy !== 0 && dx === (1 - 2 * (y % 2)))
                continue;

            if (gridNode.type === GAME_TRIANGLE && dy === (2 * ((x + y) % 2) - 1) && (dx === -2 || dx === 2))
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

    switch(gridNode.type) {
        case GAME_HEXAGON:
            guessY = (buttonY / scaleY) >> 0;
            guessX = ((buttonX - (guessY % 2) * (scaleX/2)) / scaleX) >> 0;
            for (i = guessX - 1; i <= guessX + 1; i++) {
                for (j = guessY - 1; j <= guessY + 1; j++) {
                    if (i < 0 || i >= gridNode.cols || j < 0 || j >= gridNode.rows)
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
                if (i < 0 || i >= gridNode.cols)
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

    if(x < 0 || x >= gridNode.cols || y < 0 || y >= gridNode.rows)
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
    let oldWidth  = 400, 
        oldHeight = 400;

    switch (gridNode.type) {
        case GAME_TRIANGLE:
            scaleX = oldWidth * 2 / (gridNode.cols + 1);
            scaleY = oldHeight / (7 * gridNode.rows / 8);
            scaleX = 4 * (scaleX + scaleY) / 8;
            if (scaleX < 16)
                scaleX = 16;
            scaleY = (scaleX * 7) / 8;
            newWidth = scaleX / 2 * (gridNode.cols + 1);
            newHeight = scaleY * gridNode.rows;
            outline[1] = {x: -scaleX / 2 + 1, y: scaleY - 1};
            outline[2] = {x:  scaleX - 2,     y: 0};
            outline[3] = {x: -scaleX / 2 + 1, y: -scaleY + 1};
            outline[5] = {x: -scaleX / 2 + 1, y: -scaleY};
            outline[6] = {x: -scaleX - 2,     y: 0};
            outline[7] = {x: -scaleX / 2 + 1, y: scaleY};
            break;

        case GAME_HEXAGON:
            scaleX = oldWidth * 2 / (7 * (2 * gridNode.cols + 1) / 6);
            scaleY = oldHeight * 3 / (3 * gridNode.rows + 1);
            scaleY = 6 * ((scaleX + scaleY) / 12);
            if (scaleY < 30)
                scaleY = 18;
            scaleX = (scaleY * 7) / 6;
            newWidth = scaleX * (2 * gridNode.cols + 1) / 2;
            newHeight = scaleY * (3 * gridNode.rows + 1) / 3;
            outline[1] = {x:  scaleX / 2,  y: -scaleY / 3};
            outline[2] = {x:  scaleX / 2,  y:  scaleY / 3};
            outline[3] = {x:  0,           y: -scaleY / 3 + scaleY};
            outline[4] = {x: -scaleX / 2 , y:  scaleY / 3};
            outline[5] = {x: -scaleX / 2,  y: -scaleY / 3};
            outline[6] = {x:  0,           y:  scaleY / 3 - scaleY};
            break;

        default:
            scaleX = oldWidth / gridNode.cols;
            scaleY = oldHeight / gridNode.rows;
            scaleX =
            scaleY = (scaleX + scaleY) / 2;
            if (scaleX < 30)
                scaleX = 
                scaleY = 20;
            newWidth = scaleX * gridNode.cols;
            newHeight = scaleY * gridNode.rows;    
    }
}


function drawGrid() {
    recreateGameNode();
    recreateGridNode();

    for (let x = 0; x < gridNode.cols; x++) {
        for (let y = 0; y < gridNode.rows; y++) {
            drawSquare(x, y);
        }
    }
}


function recreateGameNode() {
    let area = gameNode.area;

    if (!area) {
        gameNode.area = area = new PIXI.Graphics();
        gameApp.stage.addChild(area);
    }

    let newW = gameApp.renderer.width;
    let newH = gameApp.renderer.height;

    if (newW === gameNode.w &&
        newH === gameNode.h)
        return;

    gameNode.w = newW;
    gameNode.h = newH;

    area.clear();

    area.beginFill(0x5555aa);
    area.drawRect(0, 0, newW, newH);
    area.endFill();
}


function recreateGridNode() {
    let area = gridNode.area;

    if (!area) {
        gridNode.area = area = new PIXI.Graphics();        
        gameNode.area.addChild(area);
        area.x = 20;
        area.y = 60;
    }

    area.clear();

    area.beginFill(0xffaaff);
    area.drawRect(0, 0, 200, 200);
    area.endFill();
}


function setUXB(n) {
}


function invalidateGameArea() {
}


function updateClock(txt) {
}


function drawSquare(x, y) {
    let state = tileStates[x][y];
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
