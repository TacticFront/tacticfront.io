// src/core/execution/coalition/CoalitionExecution.ts

import {
  Execution,
  Game,
  MessageType,
  Player,
  PlayerType,
} from "../../game/Game";

export class CoalitionExecution implements Execution {
  private mg: Game;
  private active = true;
  private coalitionFormed = false;

  constructor(
    private topCount: number = 3, // Number of top nations to merge, adjust as needed
    private threshold: number = 0.1,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (this.coalitionFormed) {
      this.active = false;
      return;
    }

    if (this.threshold <= 0.3) {
      this.mergeNationsWithNeighborBots();
    } else {
      this.formCoalition();
    }

    this.coalitionFormed = true;
    this.active = false;
  }

  formCoalition() {
    // 1. Find all FakeHuman (nation) players
    const nations = this.mg
      .players()
      .filter((p) => p.type() === PlayerType.FakeHuman);

    if (nations.length <= 1) return;

    // 2. Sort by power (numTilesOwned, gold, etc.)
    nations.sort((a, b) => b.numTilesOwned() - a.numTilesOwned());

    // 3. Take top N
    const topN = nations.slice(0, this.topCount);
    if (topN.length < 2) return;

    // --- NEW: Calculate tile limit ---
    const totalTiles =
      this.mg.numLandTiles() - (this.mg.numTilesWithFallout?.() || 0);
    const maxAllowed = this.threshold * totalTiles * 1.15; // 15% buffer

    // 4. Merge all but the strongest into the strongest (index 0)
    const leader = topN[0];
    let leaderTileCount = leader.numTilesOwned();

    for (let i = 1; i < topN.length; i++) {
      const nation = topN[i];
      const nationTileCount = nation.numTilesOwned();

      // Only merge if within buffer
      if (leaderTileCount + nationTileCount > maxAllowed) {
        // Optionally, could merge just some tiles, or skip
        continue;
      }

      for (const tile of nation.tiles()) leader.conquer(tile);
      leader.addGold(nation.gold());
      nation.removeGold(nation.gold());
      leaderTileCount += nationTileCount;
      // Optionally: mark as "merged", "eliminated", etc.
    }

    this.mg.displayMessage(
      `The strongest nations have united to form a powerful coalition to counter ` +
        this.mg.topPlayer()?.displayName(),
      MessageType.INFO,
      null,
    );
  }

  private mergeNationsWithNeighborBots() {
    // Find all nations (FakeHuman), sorted by strength
    const nations = this.mg
      .players()
      .filter((p) => p.type() === PlayerType.FakeHuman);
    if (nations.length === 0) return;

    // Take top two nations (or just all if fewer than 2)
    nations.sort((a, b) => b.numTilesOwned() - a.numTilesOwned());
    const topNations = nations.slice(0, 2);

    for (const nation of topNations) {
      // Find up to two neighboring bots (PlayerType.Bot)
      const botNeighbors = nation
        .neighbors()
        .filter((n) => n.isPlayer() && n.type() === PlayerType.Bot) as Player[];

      for (const bot of botNeighbors.slice(0, 2)) {
        for (const tile of bot.tiles()) nation.conquer(tile);
        nation.addGold(bot.gold());
        bot.removeGold(bot.gold());
        this.mg.displayMessage(
          `${bot.displayName()} was swept up by ${nation.displayName()}!`,
          MessageType.INFO,
          null,
        );
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
