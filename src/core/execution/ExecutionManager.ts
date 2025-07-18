// src/core/execution/ExecutionManager.ts

import { Execution, Game } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { ClientID, GameID, Intent, Turn } from "../Schemas";
import { StrikePackageType } from "../types/StrikePackageType";
import { simpleHash } from "../Util";
import { AllianceRequestExecution } from "./alliance/AllianceRequestExecution";
import { AllianceRequestReplyExecution } from "./alliance/AllianceRequestReplyExecution";
import { BreakAllianceExecution } from "./alliance/BreakAllianceExecution";
import { AttackExecution } from "./AttackExecution";
import { BoatRetreatExecution } from "./BoatRetreatExecution";
import { BotSpawner } from "./BotSpawner";
import { ConstructionExecution } from "./ConstructionExecution";
import { DonateGoldExecution } from "./DonateGoldExecution";
import { DonateTroopsExecution } from "./DonateTroopExecution";
import { EmbargoExecution } from "./EmbargoExecution";
import { EmojiExecution } from "./EmojiExecution";
import { FakeHumanExecution } from "./FakeHumanExecution";
import { MarkDisconnectedExecution } from "./MarkDisconnectedExecution";
import { MoveWarshipExecution } from "./MoveWarshipExecution";
import { NoOpExecution } from "./NoOpExecution";
import { QuickChatExecution } from "./QuickChatExecution";
import { RetreatExecution } from "./RetreatExecution";
import { SetTroopRatiosExecution } from "./SetTroopRatiosExecution";
import { SpawnExecution } from "./SpawnExecution";
import { StrikePackageExecution } from "./StrikePackageExecution";
import { TargetPlayerExecution } from "./TargetPlayerExecution";
import { TransportShipExecution } from "./TransportShipExecution";
import { UnlockTechExecution } from "./UnlockTechExecution"; // Import UnlockTechExecution

export class Executor {
  // private random = new PseudoRandom(999)
  private random: PseudoRandom;

  constructor(
    private mg: Game,
    private gameID: GameID,
    private clientID: ClientID,
  ) {
    // Add one to avoid id collisions with bots.
    this.random = new PseudoRandom(simpleHash(gameID) + 1);
  }

  createExecs(turn: Turn): Execution[] {
    return turn.intents.map((i) => this.createExec(i));
  }

  createExec(intent: Intent): Execution {
    const player = this.mg.playerByClientID(intent.clientID);
    if (!player) {
      console.warn(`player with clientID ${intent.clientID} not found`);
      return new NoOpExecution();
    }
    const playerID = player.id();

    switch (intent.type) {
      case "attack": {
        return new AttackExecution(
          intent.troops,
          playerID,
          intent.targetID,
          null,
        );
      }
      case "cancel_attack":
        return new RetreatExecution(playerID, intent.attackID);
      case "cancel_boat":
        return new BoatRetreatExecution(playerID, intent.unitID);
      case "move_warship":
        return new MoveWarshipExecution(player, intent.unitId, intent.tile);
      case "spawn":
        return new SpawnExecution(
          player.info(),
          this.mg.ref(intent.x, intent.y),
        );
      case "boat":
        let src: TileRef | null = null;
        if (intent.srcX !== null && intent.srcY !== null) {
          src = this.mg.ref(intent.srcX, intent.srcY);
        }
        return new TransportShipExecution(
          playerID,
          intent.targetID,
          this.mg.ref(intent.dstX, intent.dstY),
          intent.troops,
          src,
        );
      case "allianceRequest":
        return new AllianceRequestExecution(playerID, intent.recipient);
      case "allianceRequestReply":
        return new AllianceRequestReplyExecution(
          intent.requestor,
          playerID,
          intent.accept,
        );
      case "breakAlliance":
        return new BreakAllianceExecution(playerID, intent.recipient);
      case "targetPlayer":
        return new TargetPlayerExecution(playerID, intent.target);
      case "strike_package":
        console.log("Creating strike package execution");
        return new StrikePackageExecution(
          playerID,
          intent.target,
          intent.packageType as StrikePackageType,
        );
      case "emoji":
        return new EmojiExecution(playerID, intent.recipient, intent.emoji);
      case "donate_troops":
        return new DonateTroopsExecution(
          playerID,
          intent.recipient,
          intent.troops,
        );
      case "donate_gold":
        return new DonateGoldExecution(playerID, intent.recipient, intent.gold);
      case "troop_ratio":
        return new SetTroopRatiosExecution(
          playerID,
          intent.troopRatio,
          intent.reserveRatio,
        );
      case "embargo":
        return new EmbargoExecution(player, intent.targetID, intent.action);
      case "build_unit":
        return new ConstructionExecution(
          playerID,
          this.mg.ref(intent.x, intent.y),
          intent.unit,
        );
      case "unlock_tech": // Handle unlock_tech intent
        return new UnlockTechExecution(player, intent.techId);
      case "quick_chat":
        return new QuickChatExecution(
          playerID,
          intent.recipient,
          intent.quickChatKey,
          intent.variables ?? {},
        );
      case "mark_disconnected":
        return new MarkDisconnectedExecution(player, intent.isDisconnected);
      default:
        throw new Error(`intent type ${intent} not found`);
    }
  }

  spawnBots(numBots: number): Execution[] {
    return new BotSpawner(this.mg, this.gameID).spawnBots(numBots);
  }

  fakeHumanExecutions(): Execution[] {
    const execs: Execution[] = [];
    for (const nation of this.mg.nations()) {
      execs.push(new FakeHumanExecution(this.gameID, nation));
    }
    return execs;
  }
}
