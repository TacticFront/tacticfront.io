import { PlayerInfo, UnitInfo, UnitType } from "../game/Game";
import { DefaultConfig } from "./DefaultConfig";

export const devConfig = new class extends DefaultConfig {
    unitInfo(type: UnitType): UnitInfo {
        const info = super.unitInfo(type)
        info.cost = 100
        return info
    }

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

    // numBots(): number {
    //     return 0
    // }
    // spawnNPCs(): boolean {
    //     return false
    // }

    // boatMaxDistance(): number {
    //     return 2000
    // }
}