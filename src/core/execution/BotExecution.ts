import {Cell, Execution, MutableGame, MutablePlayer, Player, PlayerID, PlayerInfo, PlayerType, TerraNullius} from "../game/Game"
import {PseudoRandom} from "../PseudoRandom"
import {simpleHash} from "../Util";
import {AttackExecution} from "./AttackExecution";

export class BotExecution implements Execution {

    private active = true
    private random: PseudoRandom;
    private attackRate: number
    private mg: MutableGame
    private neighborsTerraNullius = true


    constructor(private bot: MutablePlayer) {
        this.random = new PseudoRandom(simpleHash(bot.id()))
        this.attackRate = this.random.nextInt(10, 50)
    }
    activeDuringSpawnPhase(): boolean {
        return false
    }

    init(mg: MutableGame, ticks: number) {
        this.mg = mg
        // this.neighborsTerra = this.bot.neighbors().filter(n => n == this.gs.terraNullius()).length > 0
    }

    tick(ticks: number) {
        if (!this.bot.isAlive()) {
            this.active = false
            return
        }

        if (ticks % this.attackRate != 0) {
            return
        }

        this.bot.incomingAllianceRequests().forEach(ar => {
            if (ar.requestor().isTraitor()) {
                ar.reject()
            } else {
                ar.accept()
            }
        })

        const traitors = this.bot.neighbors().filter(n => n.isPlayer() && n.isTraitor()) as Player[]
        if (traitors.length > 0) {
            const toAttack = this.random.randElement(traitors)
            const odds = this.bot.isAlliedWith(toAttack) ? 6 : 3
            if (this.random.chance(odds)) {
                this.sendAttack(toAttack)
                return
            }
        }

        if (this.neighborsTerraNullius) {
            for (const b of this.bot.borderTiles()) {
                for (const n of b.neighbors()) {
                    if (n.owner() == this.mg.terraNullius() && n.isLand()) {
                        this.sendAttack(this.mg.terraNullius())
                        return
                    }
                }
            }
            this.neighborsTerraNullius = false
        }

        const border = Array.from(this.bot.borderTiles()).flatMap(t => t.neighbors()).filter(t => t.hasOwner() && t.owner() != this.bot)

        if (border.length == 0) {
            return
        }

        const toAttack = border[this.random.nextInt(0, border.length)]
        const owner = toAttack.owner()

        if (owner.isPlayer()) {
            if (this.bot.isAlliedWith(owner)) {
                return
            }
            if (owner.type() == PlayerType.FakeHuman) {
                if (!this.random.chance(2)) {
                    return
                }
            }
        }
        this.sendAttack(owner)
    }

    sendAttack(toAttack: Player | TerraNullius) {
        this.mg.addExecution(new AttackExecution(
            this.bot.troops() / 20,
            this.bot.id(),
            toAttack.isPlayer() ? toAttack.id() : null,
            null,
            null
        ))
    }

    owner(): MutablePlayer {
        return this.bot
    }

    isActive(): boolean {
        return this.active
    }
}