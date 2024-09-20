import {GameID} from "../Schemas";
import {DefaultConfig} from "./DefaultConfig";

export const devConfig = new class extends DefaultConfig {
    percentageTilesOwnedToWin(): number {
        return 80
    }
    numSpawnPhaseTurns(): number {
        return 80
    }
    gameCreationRate(): number {
        return 10 * 1000
    }
    lobbyLifetime(): number {
        return 10 * 1000
    }
    turnIntervalMs(): number {
        return 100
    }

    numBots(): number {
        return 400
    }


    numFakeHumans(gameID: GameID): number {
        return 10
    }

    // startTroops(playerInfo: PlayerInfo): number {
    //     if (playerInfo.isBot) {
    //         return 5000
    //     }
    //     return 5000
    // }

    // troopAdditionRate(player: Player): number {
    //     if (player.isBot()) {
    //         return 1000
    //     } else {
    //         return 1000000
    //     }
    // }
}