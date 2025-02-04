import { nextTick } from "process";
import {
  Cell,
  Execution,
  Game,
  Player,
  PlayerID,
  Unit,
  UnitType,
  TerraNullius,
} from "../game/Game";
import { PathFinder } from "../pathfinding/PathFinding";
import { PathFindResultType } from "../pathfinding/AStar";
import { PseudoRandom } from "../PseudoRandom";
import { consolex } from "../Consolex";
import { TileRef } from "../game/GameMap";
import { simpleHash } from "../Util";
import { NukeExecution } from "./NukeExecution";

export class MirvExecution implements Execution {
  private player: Player;

  private active = true;

  private mg: Game;

  private nuke: Unit;

  private mirvRange = 350;
  private warheadCount = 1000;
  //   private warheadRange = 5;

  private random: PseudoRandom;

  private pathFinder: PathFinder;

  private targetPlayer: Player | TerraNullius;

  constructor(private senderID: PlayerID, private dst: TileRef) {}

  init(mg: Game, ticks: number): void {
    this.random = new PseudoRandom(mg.ticks() + simpleHash(this.senderID));
    this.mg = mg;
    this.pathFinder = PathFinder.Mini(mg, 10_000, true);
    this.player = mg.player(this.senderID);
    this.targetPlayer = this.mg.owner(this.dst);
  }

  tick(ticks: number): void {
    if (this.nuke == null) {
      const spawn = this.player.canBuild(UnitType.MIRV, this.dst);
      if (spawn == false) {
        consolex.warn(`cannot build MIRV`);
        this.active = false;
        return;
      }
      this.nuke = this.player.buildUnit(UnitType.MIRV, 0, spawn);
    }

    for (let i = 0; i < 4; i++) {
      const result = this.pathFinder.nextTile(this.nuke.tile(), this.dst);
      switch (result.type) {
        case PathFindResultType.Completed:
          this.nuke.move(result.tile);
          this.separate();
          this.active = false;
          return;
        case PathFindResultType.NextTile:
          this.nuke.move(result.tile);
          break;
        case PathFindResultType.Pending:
          break;
        case PathFindResultType.PathNotFound:
          consolex.warn(
            `nuke cannot find path from ${this.nuke.tile()} to ${this.dst}`
          );
          this.active = false;
          return;
      }
    }
  }

  private separate() {
    const dsts: TileRef[] = [this.dst];
    let attempts = 1000;
    while (attempts > 0 && dsts.length < this.warheadCount) {
      attempts--;
      const potential = this.randomLand(this.dst);
      if (potential == null) {
        continue;
      }
      dsts.push(potential);
    }
    console.log(`dsts: ${dsts.length}`);

    for (const dst of dsts) {
      this.mg.addExecution(
        new NukeExecution(
          UnitType.MIRVWarhead,
          this.senderID,
          dst,
          this.nuke.tile(),
          this.random.nextInt(5, 9)
        )
      );
    }
    if (this.targetPlayer.isPlayer()) {
      const alliance = this.player.allianceWith(this.targetPlayer);
      if (alliance != null) {
        this.player.breakAlliance(alliance);
      }
      if (this.targetPlayer != this.player) {
        this.targetPlayer.updateRelation(this.player, -100);
      }
    }
    this.nuke.delete(false);
  }

  randomLand(ref: TileRef): TileRef | null {
    let tries = 0;
    while (tries < 25) {
      tries++;
      const x = this.random.nextInt(
        this.mg.x(ref) - this.mirvRange,
        this.mg.x(ref) + this.mirvRange
      );
      const y = this.random.nextInt(
        this.mg.y(ref) - this.mirvRange,
        this.mg.y(ref) + this.mirvRange
      );
      if (!this.mg.isValidCoord(x, y)) {
        continue;
      }
      const tile = this.mg.ref(x, y);
      if (!this.mg.isLand(tile)) {
        continue;
      }
      if (this.mg.euclideanDist(tile, ref) > this.mirvRange) {
        continue;
      }
      if (this.mg.owner(tile) != this.targetPlayer) {
        continue;
      }
      return tile;
    }
    return null;
  }

  owner(): Player {
    return this.player;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
