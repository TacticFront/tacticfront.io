import { PlayerInfo } from "../game/Game";
import { DefaultConfig } from "./DefaultConfig";

export const devConfig = new class extends DefaultConfig {
    percentageTilesOwnedToWin(): number {
        return 95
    }
    numSpawnPhaseTurns(): number {
        return 80
    }
    gameCreationRate(): number {
        return 20 * 1000
    }
    lobbyLifetime(): number {
        return 20 * 1000
    }
    turnIntervalMs(): number {
        return 100
    }

    numBots(): number {
        return 400
    }

}