import {Cell, Execution, MutableGame, Game, MutablePlayer, PlayerInfo, TerraNullius, Tile, PlayerType, Alliance, AllianceRequestReplyEvent} from "../game/Game";
import {AttackIntent, BoatAttackIntentSchema, GameID, Intent, Turn} from "../Schemas";
import {AttackExecution} from "./AttackExecution";
import {SpawnExecution} from "./SpawnExecution";
import {BotSpawner} from "./BotSpawner";
import {BoatAttackExecution} from "./BoatAttackExecution";
import {PseudoRandom} from "../PseudoRandom";
import {UpdateNameExecution} from "./UpdateNameExecution";
import {FakeHumanExecution} from "./FakeHumanExecution";
import Usernames from '../../../resources/Usernames.txt'
import {simpleHash} from "../Util";
import {AllianceRequestExecution} from "./alliance/AllianceRequestExecution";
import {AllianceRequestReplyExecution} from "./alliance/AllianceRequestReplyExecution";
import {BreakAllianceExecution} from "./alliance/BreakAllianceExecution";
import {TargetPlayerExecution} from "./TargetPlayerExecution";



export class Executor {

    private usernames = Usernames.split('\n')

    // private random = new PseudoRandom(999)
    private random: PseudoRandom = null

    constructor(private gs: Game, private gameID: GameID) {
        this.random = new PseudoRandom(simpleHash(gameID))
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
                new PlayerInfo(intent.name, intent.playerType, intent.clientID, intent.playerID),
                new Cell(intent.x, intent.y)
            )
        } else if (intent.type == "boat") {
            return new BoatAttackExecution(
                intent.attackerID,
                intent.targetID,
                new Cell(intent.x, intent.y),
                intent.troops
            )
        } else if (intent.type == "updateName") {
            return new UpdateNameExecution(
                intent.name,
                intent.clientID
            )
        } else if (intent.type == "allianceRequest") {
            return new AllianceRequestExecution(intent.requestor, intent.recipient)
        } else if (intent.type == "allianceRequestReply") {
            return new AllianceRequestReplyExecution(intent.requestor, intent.recipient, intent.accept)
        } else if (intent.type == "breakAlliance") {
            return new BreakAllianceExecution(intent.requestor, intent.recipient)
        } else if (intent.type == "targetPlayer") {
            return new TargetPlayerExecution(intent.requestor, intent.target)
        }
        else {
            throw new Error(`intent type ${intent} not found`)
        }
    }


    spawnBots(numBots: number): Execution[] {
        return new BotSpawner(this.gs, this.gameID).spawnBots(numBots).map(i => this.createExec(i))
    }

    fakeHumanExecutions(numFakes: number): Execution[] {
        const execs = []
        for (let i = 0; i < numFakes; i++) {
            execs.push(
                new FakeHumanExecution(new PlayerInfo(
                    this.usernames[this.random.nextInt(0, this.usernames.length)],
                    PlayerType.FakeHuman,
                    null,
                    this.random.nextID()
                ))
            )
        }
        return execs
    }

}