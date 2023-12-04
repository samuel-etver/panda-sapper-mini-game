
export function IdleTimer() {
    this.interval = 100;
    this.enabled = false;
    this.oneShot = false;
    this.callback = undefined;
    this.time = undefined;
}


IdleTimer.prototype.start = function() {
    this.enabled = true;
    this.time = 0;
}


IdleTimer.prototype.stop = function() {
    this.enabled = false;
}


IdleTimer.prototype.idle = function(deltaTime) {
    if (!this.enabled)
        return;

    this.time += deltaTime * 1000;

    if (this.time >= this.interval) {
        this.time -= this.interval;

        this.oneShot && this.stop();

        this?.callback();
    }
}
