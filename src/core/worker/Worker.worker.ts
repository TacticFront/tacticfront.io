import { createGameRunner, GameRunner } from "../GameRunner";
import { GameUpdateViewData } from "../GameView";
import {
    MainThreadMessage,
    WorkerMessage,
    InitializedMessage,
    SharesBorderResultMessage
} from './WorkerMessages';

const ctx: Worker = self as any;
let gameRunner: Promise<GameRunner> | null = null;

function gameUpdate(gu: GameUpdateViewData) {
    sendMessage({
        type: "game_update",
        gameUpdate: gu
    });
}

function sendMessage(message: WorkerMessage) {
    ctx.postMessage(message);
}

ctx.addEventListener('message', async (e: MessageEvent<MainThreadMessage>) => {
    const message = e.data;

    switch (message.type) {
        case 'init':
            try {
                gameRunner = createGameRunner(
                    message.gameID,
                    message.gameConfig,
                    gameUpdate
                ).then(gr => {
                    sendMessage({
                        type: 'initialized',
                        id: message.id
                    } as InitializedMessage);
                    return gr;
                });
            } catch (error) {
                console.error('Failed to initialize game runner:', error);
                throw error;
            }
            break;

        case 'turn':
            if (!gameRunner) {
                throw new Error('Game runner not initialized');
            }

            try {
                const gr = await gameRunner;
                await gr.addTurn(message.turn);
            } catch (error) {
                console.error('Failed to process turn:', error);
                throw error;
            }
            break;

        case 'shares_border':
            if (!gameRunner) {
                throw new Error('Game runner not initialized');
            }

            try {
                const game = (await gameRunner).game
                const result = game.player(message.player1)
                    .sharesBorderWith(game.player(message.player2))

                sendMessage({
                    type: 'shares_border_result',
                    id: message.id,
                    result
                } as SharesBorderResultMessage);
            } catch (error) {
                console.error('Failed to check borders:', error);
                throw error;
            }
            break;

        default:
            console.warn('Unknown message :', message);
    }
});

// Error handling
ctx.addEventListener('error', (error) => {
    console.error('Worker error:', error);
});

ctx.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in worker:', event);
});