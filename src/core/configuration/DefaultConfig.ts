import {Player, PlayerInfo, PlayerType, TerrainType, TerraNullius, Tile} from "../Game";
import {GameID} from "../Schemas";
import {simpleHash, within} from "../Util";
import {Config, Theme} from "./Config";
import {pastelTheme} from "./PastelTheme";



export class DefaultConfig implements Config {
    boatMaxNumber(): number {
        return 3
    }
    boatMaxDistance(): number {
        return 500
    }
    numSpawnPhaseTurns(): number {
        return 100
    }
    numBots(): number {
        return 400
    }
    numFakeHumans(gameID: GameID): number {
        return simpleHash(gameID) % 5
    }
    turnIntervalMs(): number {
        return 100
    }
    gameCreationRate(): number {
        return 10 * 1000
    }
    lobbyLifetime(): number {
        return 20 * 1000
    }
    theme(): Theme {return pastelTheme;}

    attackLogic(attackTroops: number, attacker: Player, defender: Player | TerraNullius, tileToConquer: Tile): {attackerTroopLoss: number; defenderTroopLoss: number; tilesPerTickUsed: number} {
        let mag = 0
        let speed = 0
        switch (tileToConquer.terrain()) {
            case TerrainType.Plains:
                mag = 10
                // speed = 10
                break
            case TerrainType.Highland:
                mag = 30
                // speed = 20
                break
            case TerrainType.Mountain:
                mag = 90
                // speed = 40
                break
        }
        speed = mag

        if (attacker.isPlayer() && defender.isPlayer()) {
            if (attacker.type() == PlayerType.Bot && defender.type() == PlayerType.FakeHuman) {
                mag *= 1.2
            }
            if (attacker.type() == PlayerType.FakeHuman && defender.type() == PlayerType.Bot) {
                mag *= .8
            }
        }

        if (defender.isPlayer()) {
            return {
                attackerTroopLoss: within(defender.troops() / attacker.troops() * mag, 1, 1000),
                defenderTroopLoss: defender.troops() / defender.numTilesOwned(),
                tilesPerTickUsed: within(defender.troops() / (attackTroops * 5), .2, 3) * speed
            }
        } else {
            return {
                attackerTroopLoss: mag,
                defenderTroopLoss: 0,
                tilesPerTickUsed: within(this.startTroops(attacker.info()) / (attackTroops * 5), .2, 3) * speed
            }
        }
    }

    attackTilesPerTick(attacker: Player, defender: Player | TerraNullius, numAdjacentTilesWithEnemy: number): number {
        if (defender.isPlayer()) {
            return within(attacker.troops() / defender.troops() * 2, .01, .5) * numAdjacentTilesWithEnemy * 3
        } else {
            return numAdjacentTilesWithEnemy * 2
        }
    }

    boatAttackAmount(attacker: Player, defender: Player | TerraNullius): number {
        return attacker.troops() / 5
    }

    attackAmount(attacker: Player, defender: Player | TerraNullius) {
        if (attacker.type() == PlayerType.Bot) {
            return attacker.troops() / 20
        } else {
            return attacker.troops() / 5
        }
    }

    startTroops(playerInfo: PlayerInfo): number {
        if (playerInfo.playerType == PlayerType.Bot) {
            return 10000
        }
        return 10000
    }

    maxTroops(player: Player): number {
        let max = Math.sqrt(player.numTilesOwned()) * 3000 + 50000
        return Math.min(max, 1_000_000)
    }

    troopAdditionRate(player: Player): number {
        let max = this.maxTroops(player)

        let toAdd = 10 + (player.troops() + Math.sqrt(player.troops() * player.numTilesOwned())) / 100

        const ratio = 1 - (player.troops() / max)
        toAdd *= ratio
        // console.log(`to add ${toAdd}`)

        if (player.type() == PlayerType.FakeHuman) {
            toAdd *= 1.2
        }
        if (player.type() == PlayerType.Bot) {
            toAdd *= .8
        }

        return Math.min(player.troops() + toAdd, max)
    }
}


export const defaultConfig = new DefaultConfig()