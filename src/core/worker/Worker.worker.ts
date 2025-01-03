import { createGameRunner, GameRunner } from "../GameRunner";
import { GameUpdateViewData } from "../GameView";

let gameRunner: Promise<GameRunner> = null


function gameUpdate(gu: GameUpdateViewData) {
    self.postMessage({
        type: "game_update",
        gameUpdate: gu
    })
}

self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            gameRunner = createGameRunner(e.data.gameID, e.data.gameConfig, gameUpdate).then(gr => {
                self.postMessage({
                    type: 'initialized'
                });
                return gr;
            });
            break;
        case 'turn':
            gameRunner.then(gr => gr.addTurn(e.data.turn))
    }
};