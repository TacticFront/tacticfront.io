import { Cell, Execution, MutableGame, Game, MutablePlayer, PlayerInfo, TerraNullius, Tile, PlayerType, Alliance, AllianceRequestReplyEvent, Difficulty } from "../game/Game";
import { AttackIntent, BoatAttackIntentSchema, GameID, Intent, Turn } from "../Schemas";
import { AttackExecution } from "./AttackExecution";
import { SpawnExecution } from "./SpawnExecution";
import { BotSpawner } from "./BotSpawner";
import { BoatAttackExecution } from "./BoatAttackExecution";
import { PseudoRandom } from "../PseudoRandom";
import { FakeHumanExecution } from "./FakeHumanExecution";
import Usernames from '../../../resources/Usernames.txt'
import { processName, sanitize, simpleHash } from "../Util";
import { AllianceRequestExecution } from "./alliance/AllianceRequestExecution";
import { AllianceRequestReplyExecution } from "./alliance/AllianceRequestReplyExecution";
import { BreakAllianceExecution } from "./alliance/BreakAllianceExecution";
import { TargetPlayerExecution } from "./TargetPlayerExecution";
import { EmojiExecution } from "./EmojiExecution";
import { DonateExecution } from "./DonateExecution";
import { NukeExecution } from "./NukeExecution";



export class Executor {

    private usernames = Usernames.split('\n')

    // private random = new PseudoRandom(999)
    private random: PseudoRandom = null

    constructor(private gs: Game, private difficulty: Difficulty, private gameID: GameID) {
        // Add one to avoid id collisions with bots.
        this.random = new PseudoRandom(simpleHash(gameID) + 1)
    }

    createExecs(turn: Turn): Execution[] {
        return turn.intents.map(i => this.createExec(i))
    }

    createExec(intent: Intent): Execution {
        if (intent.type == "attack") {
            const source: Cell | null = intent.sourceX != null && intent.sourceY != null ? new Cell(intent.sourceX, intent.sourceY) : null
            const target: Cell | null = intent.targetX != null && intent.targetY != null ? new Cell(intent.targetX, intent.targetY) : null
            return new AttackExecution(
                intent.troops,
                intent.attackerID,
                intent.targetID,
                source,
                target,
            )
        } else if (intent.type == "spawn") {
            return new SpawnExecution(
                new PlayerInfo(sanitize(intent.name), intent.playerType, intent.clientID, intent.playerID),
                new Cell(intent.x, intent.y)
            )
        } else if (intent.type == "boat") {
            return new BoatAttackExecution(
                intent.attackerID,
                intent.targetID,
                new Cell(intent.x, intent.y),
                intent.troops
            )
        } else if (intent.type == "allianceRequest") {
            return new AllianceRequestExecution(intent.requestor, intent.recipient)
        } else if (intent.type == "allianceRequestReply") {
            return new AllianceRequestReplyExecution(intent.requestor, intent.recipient, intent.accept)
        } else if (intent.type == "breakAlliance") {
            return new BreakAllianceExecution(intent.requestor, intent.recipient)
        } else if (intent.type == "targetPlayer") {
            return new TargetPlayerExecution(intent.requestor, intent.target)
        } else if (intent.type == "emoji") {
            return new EmojiExecution(intent.sender, intent.recipient, intent.emoji)
        } else if (intent.type == "donate") {
            return new DonateExecution(intent.sender, intent.recipient, intent.troops)
        } else if (intent.type == "nuke") {
            return new NukeExecution(intent.sender, new Cell(intent.x, intent.y), intent.magnitude)
        } else if (intent.type == "troop_ratio") {
            return new SetTargetTroopRatioExecution(intent.player, intent.ratio)
        } else {
            throw new Error(`intent type ${intent} not found`)
        }
    }


    spawnBots(numBots: number): Execution[] {
        return new BotSpawner(this.gs, this.gameID).spawnBots(numBots).map(i => this.createExec(i))
    }

    fakeHumanExecutions(): Execution[] {
        const execs = []
        for (const nation of this.gs.nations()) {
            execs.push(new FakeHumanExecution(
                new PlayerInfo(
                    nation.name,
                    PlayerType.FakeHuman,
                    null,
                    this.random.nextID()
                ),
                nation.cell,
                nation.strength * this.difficulty
            ))
        }
        return execs
    }

}