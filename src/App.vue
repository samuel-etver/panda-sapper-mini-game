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

            let graphics = new PIXI.Graphics();
            graphics.lineStyle(8, 0xaa0000);
            
            app.stage.addChild(graphics);
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
