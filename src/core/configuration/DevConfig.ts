import {Tick} from "../game/Game";
import {GameID} from "../Schemas";
import {DefaultConfig} from "./DefaultConfig";

export const devConfig = new class extends DefaultConfig {
    percentageTilesOwnedToWin(): number {
        return 95
    }
    numSpawnPhaseTurns(): number {
        return 40
    }
    gameCreationRate(): number {
        return 2 * 1000
    }
    lobbyLifetime(): number {
        return 2 * 1000
    }
    turnIntervalMs(): number {
        return 100
    }

    // numBots(): number {
    //     return 0
    // }

    // allianceDuration(): Tick {
    //     return 10 * 10
    // }

    // numFakeHumans(gameID: GameID): number {
    //     return 1
    // }

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