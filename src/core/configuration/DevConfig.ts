import {PlayerInfo} from "../game/Game";
import {DefaultConfig} from "./DefaultConfig";

export const devConfig = new class extends DefaultConfig {
    percentageTilesOwnedToWin(): number {
        return 95
    }
    numSpawnPhaseTurns(): number {
        return 400
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

    // allianceDuration(): Tick {
    //     return 10 * 10
    // }

    // startTroops(playerInfo: PlayerInfo): number {
    //     // if (playerInfo.isBot) {
    //     //     return 5000
    //     // }
    //     return 50000
    // }

    // troopAdditionRate(player: Player): number {
    //     if (player.isBot()) {
    //         return 1000
    //     } else {
    //         return 1000000
    //     }
    // }
}