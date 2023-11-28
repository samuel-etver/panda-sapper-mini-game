<script>

import * as PIXI from 'pixi.js';
import { gameInit, gameLoop } from './PandaSapper';

export default {
    name: 'PandaSapper',

    methods: {
        main() {
            let canvas = document.getElementById('game-canvas');

            const app = new PIXI.Application({
                width: 640,
                height: 480,
                antialias: true,
                transparent: true,
                view: canvas
            });

            gameInit(app);

            app.ticker.add(() => {
                gameLoop();
            });

        }
    },

    mounted() {
        this.main();
    }
};

</script>


<template>
    <div class="game-glass">
        <canvas id="game-canvas"></canvas>
    </div>
</template>
