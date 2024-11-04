import { Cell, Execution, MutableGame, MutablePlayer, PlayerInfo, PlayerType } from "../game/Game"
import { BotExecution } from "./BotExecution"
import { PlayerExecution } from "./PlayerExecution"
import { getSpawnCells } from "./Util"

export class SpawnExecution implements Execution {

    active: boolean = true
    private mg: MutableGame

    constructor(
        private playerInfo: PlayerInfo,
        private cell: Cell
    ) { }

    init(mg: MutableGame, ticks: number) {
        this.mg = mg
    }

    tick(ticks: number) {
        this.active = false

        if (!this.mg.inSpawnPhase()) {
            return
        }

        const existing = this.mg.players().find(p => p.id() == this.playerInfo.id)
        if (existing) {
            existing.tiles().forEach(t => existing.relinquish(t))
            getSpawnCells(this.mg, this.cell).forEach(c => {
                existing.conquer(this.mg.tile(c))
            })
            return
        }

        const player = this.mg.addPlayer(this.playerInfo, this.mg.config().startManpower(this.playerInfo))
        getSpawnCells(this.mg, this.cell).forEach(c => {
            player.conquer(this.mg.tile(c))
        })
        this.mg.addExecution(new PlayerExecution(player.id()))
        if (player.type() == PlayerType.Bot) {
            this.mg.addExecution(new BotExecution(player))
        }
    }

    owner(): MutablePlayer {
        return null
    }
    isActive(): boolean {
        return this.active
    }

    activeDuringSpawnPhase(): boolean {
        return true
    }

}