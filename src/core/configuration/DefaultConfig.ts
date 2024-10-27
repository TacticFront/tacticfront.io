import { Player, PlayerInfo, PlayerType, TerrainType, TerraNullius, Tick, Tile } from "../game/Game";
import { GameID } from "../Schemas";
import { simpleHash, within } from "../Util";
import { Config, Theme } from "./Config";
import { pastelTheme } from "./PastelTheme";



export class DefaultConfig implements Config {
    defaultDonationAmount(sender: Player): number {
        return Math.floor(sender.troops() / 3)
    }
    donateCooldown(): Tick {
        return 10 * 10
    }
    emojiMessageDuration(): Tick {
        return 5 * 10
    }
    emojiMessageCooldown(): Tick {
        return 15 * 10
    }
    targetDuration(): Tick {
        return 10 * 10
    }
    targetCooldown(): Tick {
        return 15 * 10
    }
    allianceRequestCooldown(): Tick {
        return 30 * 10
    }
    allianceDuration(): Tick {
        return 400 * 10
    }
    percentageTilesOwnedToWin(): number {
        return 95
    }
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
    turnIntervalMs(): number {
        return 100
    }
    gameCreationRate(): number {
        return 60 * 1000
    }
    lobbyLifetime(): number {
        return 120 * 1000
    }
    theme(): Theme { return pastelTheme; }

    attackLogic(attackTroops: number, attacker: Player, defender: Player | TerraNullius, tileToConquer: Tile): { attackerTroopLoss: number; defenderTroopLoss: number; tilesPerTickUsed: number } {
        let mag = 0
        let speed = 0
        switch (tileToConquer.terrain()) {
            case TerrainType.Plains:
                mag = 50
                speed = 10
                break
            case TerrainType.Highland:
                mag = 100
                speed = 20
                break
            case TerrainType.Mountain:
                mag = 150
                speed = 30
                break
        }
        // speed = mag  

        if (attacker.isPlayer() && defender.isPlayer()) {
            if (attacker.type() == PlayerType.Human && defender.type() == PlayerType.Bot) {
                mag *= .8
            }
            if (attacker.type() == PlayerType.FakeHuman && defender.type() == PlayerType.Bot) {
                mag *= .8
            }
        }

        if (defender.isPlayer()) {
            return {
                attackerTroopLoss: within(defender.troops() / attacker.troops(), .5, 2) * mag,
                defenderTroopLoss: defender.troops() / defender.numTilesOwned(),
                tilesPerTickUsed: within(defender.troops() / (attackTroops * 5), .2, 1.5) * speed
            }
        } else {
            return {
                attackerTroopLoss: attacker.type() == PlayerType.Bot ? mag / 10 : mag / 5,
                defenderTroopLoss: 0,
                tilesPerTickUsed: within(this.startManpower(attacker.info()) / (attackTroops * 5), .2, 3) * Math.max(10, speed / 1.5)
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
        return Math.floor(attacker.troops() / 5)
    }

    attackAmount(attacker: Player, defender: Player | TerraNullius) {
        if (attacker.type() == PlayerType.Bot) {
            return attacker.troops() / 20
        } else {
            return attacker.troops() / 5
        }
    }

    startManpower(playerInfo: PlayerInfo): number {
        if (playerInfo.playerType == PlayerType.Bot) {
            return 10000
        }
        if (playerInfo.playerType == PlayerType.FakeHuman) {
            return 2500 // start troops * strength * difficulty
        }
        return 25000
    }

    maxManpower(player: Player): number {
        let max = Math.sqrt(player.numTilesOwned()) * 3000 + 50000
        const manpower = Math.min(max, 2_000_000)
        if (player.type() == PlayerType.Bot) {
            return manpower
        }
        return manpower * 2
    }

    manpowerAdditionRate(player: Player): number {
        let max = this.maxManpower(player)

        let toAdd = 10 + (player.totalManpower() + Math.sqrt(player.totalManpower() * player.numTilesOwned())) / 100

        const ratio = 1 - (player.totalManpower() / max)
        toAdd *= ratio
        toAdd *= .5
        // console.log(`to add ${toAdd}`)

        if (player.type() == PlayerType.FakeHuman) {
            toAdd *= 1.0
        }
        if (player.type() == PlayerType.Bot) {
            toAdd *= .7
        }
        return toAdd
    }
    goldAdditionRate(player: Player): number {
        return (player.manpowerReserve() - player.troops()) / 1000
    }
    troopAdjustmentRate(player: Player): number {
        const maxDiff = player.totalManpower() / 250 + this.manpowerAdditionRate(player)
        const target = player.totalManpower() * player.targetTroopRatio()
        const diff = target - player.troops()
        if (Math.abs(diff) < maxDiff) {
            return diff
        }
        const adjustment = maxDiff * Math.sign(diff)
        // Can ramp down troops much faster
        if (adjustment < 0) {
            return adjustment * 5
        }
        return adjustment
    }
}



export const defaultConfig = new DefaultConfig()