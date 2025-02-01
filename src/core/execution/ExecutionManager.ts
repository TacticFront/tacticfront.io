import {
  Cell,
  Execution,
  Game,
  Player,
  PlayerInfo,
  TerraNullius,
  PlayerType,
  Alliance,
  UnitType,
} from "../game/Game";
import {
  AttackIntent,
  BoatAttackIntentSchema,
  GameID,
  Intent,
  Turn,
} from "../Schemas";
import { AttackExecution } from "./AttackExecution";
import { SpawnExecution } from "./SpawnExecution";
import { BotSpawner } from "./BotSpawner";
import { TransportShipExecution } from "./TransportShipExecution";
import { PseudoRandom } from "../PseudoRandom";
import { FakeHumanExecution } from "./FakeHumanExecution";
import { generateID, processName, sanitize, simpleHash } from "../Util";
import { AllianceRequestExecution } from "./alliance/AllianceRequestExecution";
import { AllianceRequestReplyExecution } from "./alliance/AllianceRequestReplyExecution";
import { BreakAllianceExecution } from "./alliance/BreakAllianceExecution";
import { TargetPlayerExecution } from "./TargetPlayerExecution";
import { EmojiExecution } from "./EmojiExecution";
import { DonateExecution } from "./DonateExecution";
import { NukeExecution } from "./NukeExecution";
import { SetTargetTroopRatioExecution } from "./SetTargetTroopRatioExecution";
import { DestroyerExecution } from "./DestroyerExecution";
import { PortExecution } from "./PortExecution";
import { MissileSiloExecution } from "./MissileSiloExecution";
import { BattleshipExecution } from "./BattleshipExecution";
import { DefensePostExecution } from "./DefensePostExecution";
import { CityExecution } from "./CityExecution";
import { TileRef } from "../game/GameMap";

export class Executor {
  // private random = new PseudoRandom(999)
  private random: PseudoRandom = null;

  constructor(
    private mg: Game,
    private gameID: GameID,
  ) {
    // Add one to avoid id collisions with bots.
    this.random = new PseudoRandom(simpleHash(gameID) + 1);
  }

  createExecs(turn: Turn): Execution[] {
    return turn.intents.map((i) => this.createExec(i));
  }

  createExec(intent: Intent): Execution {
    switch (intent.type) {
      case "attack": {
        return new AttackExecution(
          intent.troops,
          intent.attackerID,
          intent.targetID,
          null,
        );
      }
      case "spawn":
        return new SpawnExecution(
          new PlayerInfo(
            sanitize(intent.name),
            intent.playerType,
            intent.clientID,
            intent.playerID,
          ),
          this.mg.ref(intent.x, intent.y),
        );
      case "boat":
        return new TransportShipExecution(
          intent.attackerID,
          intent.targetID,
          this.mg.ref(intent.x, intent.y),
          intent.troops,
        );
      case "allianceRequest":
        return new AllianceRequestExecution(intent.requestor, intent.recipient);
      case "allianceRequestReply":
        return new AllianceRequestReplyExecution(
          intent.requestor,
          intent.recipient,
          intent.accept,
        );
      case "breakAlliance":
        return new BreakAllianceExecution(intent.requestor, intent.recipient);
      case "targetPlayer":
        return new TargetPlayerExecution(intent.requestor, intent.target);
      case "emoji":
        return new EmojiExecution(
          intent.sender,
          intent.recipient,
          intent.emoji,
        );
      case "donate":
        return new DonateExecution(
          intent.sender,
          intent.recipient,
          intent.troops,
        );
      case "troop_ratio":
        return new SetTargetTroopRatioExecution(intent.player, intent.ratio);
      case "build_unit":
        switch (intent.unit) {
          case UnitType.AtomBomb:
          case UnitType.HydrogenBomb:
            return new NukeExecution(
              intent.unit,
              intent.player,
              this.mg.ref(intent.x, intent.y),
            );
          case UnitType.Destroyer:
            return new DestroyerExecution(
              intent.player,
              this.mg.ref(intent.x, intent.y),
            );
          case UnitType.Battleship:
            return new BattleshipExecution(
              intent.player,
              this.mg.ref(intent.x, intent.y),
            );
          case UnitType.Port:
            return new PortExecution(
              intent.player,
              this.mg.ref(intent.x, intent.y),
            );
          case UnitType.MissileSilo:
            return new MissileSiloExecution(
              intent.player,
              this.mg.ref(intent.x, intent.y),
            );
          case UnitType.DefensePost:
            return new DefensePostExecution(
              intent.player,
              this.mg.ref(intent.x, intent.y),
            );
          case UnitType.City:
            return new CityExecution(
              intent.player,
              this.mg.ref(intent.x, intent.y),
            );
          default:
            throw Error(`unit type ${intent.unit} not supported`);
        }
      default:
        throw new Error(`intent type ${intent} not found`);
    }
  }

  spawnBots(numBots: number): Execution[] {
    return new BotSpawner(this.mg, this.gameID)
      .spawnBots(numBots)
      .map((i) => this.createExec(i));
  }

  fakeHumanExecutions(): Execution[] {
    const execs = [];
    for (const nation of this.mg.nations()) {
      execs.push(
        new FakeHumanExecution(
          this.gameID,
          new PlayerInfo(
            nation.name,
            PlayerType.FakeHuman,
            null,
            this.random.nextID(),
          ),
          nation.cell,
          nation.strength *
            this.mg
              .config()
              .difficultyModifier(this.mg.config().gameConfig().difficulty),
        ),
      );
    }
    return execs;
  }
}
