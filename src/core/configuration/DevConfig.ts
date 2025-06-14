// src/core/configuration/DevConfig.ts

import { Gold, Player, UnitInfo, UnitType } from "../game/Game";
import { UserSettings } from "../game/UserSettings";
import { GameConfig } from "../Schemas";
import { GameEnv, ServerConfig } from "./Config";
import { DefaultConfig, DefaultServerConfig } from "./DefaultConfig";

export class DevServerConfig extends DefaultServerConfig {
  adminToken(): string {
    return "WARNING_DEV_ADMIN_KEY_DO_NOT_USE_IN_PRODUCTION";
  }

  env(): GameEnv {
    return GameEnv.Dev;
  }

  gameCreationRate(): number {
    return 5 * 1000;
  }

  lobbyMaxPlayers(): number {
    return Math.random() < 0.5 ? 2 : 3;
  }

  samWarheadHittingChance(): number {
    return 1;
  }

  samHittingChance(): number {
    return 1;
  }

  numWorkers(): number {
    return 2;
  }
  jwtAudience(): string {
    return "localhost";
  }
  gitCommit(): string {
    return "DEV";
  }
}

export class DevConfig extends DefaultConfig {
  constructor(
    sc: ServerConfig,
    gc: GameConfig,
    us: UserSettings | null,
    isReplay: boolean,
  ) {
    super(sc, gc, us, isReplay);
  }

  // numSpawnPhaseTurns(): number {
  //   return this.gameConfig().gameType == GameType.Singleplayer ? 70 : 100;
  //   // return 100
  // }

  unitInfo(type: UnitType): UnitInfo {
    const info = super.unitInfo(type);
    const oldCost = info.cost;
    // info.cost = (p: Player) => oldCost(p) / 1000000000;
    return info;
  }

  goldAdditionRate(player: Player): Gold {
    let populationGold = 0;

    if (player.type() === "HUMAN") {
      populationGold = 0.25 * player.workers() ** 0.8; // .045
    } else {
      populationGold = 0.1 * player.workers() ** 0.8; // .045
    }

    const cityGold = player.units(UnitType.City).length * 50;
    const portGold = player.units(UnitType.Port).length * 30;
    const powerPlantGold = player.units(UnitType.PowerPlant).length * 80;

    const totalGold = Math.floor(
      populationGold + cityGold + portGold + powerPlantGold,
    );

    return totalGold;
  }

  // tradeShipSpawnRate(): number {
  //   return 10;
  // }

  // percentageTilesOwnedToWin(): number {
  //     return 1
  // }

  // populationIncreaseRate(player: Player): number {
  //     return this.maxPopulation(player)
  // }

  // boatMaxDistance(): number {
  //     return 5000
  // }

  //   numBots(): number {
  //     return 0;
  //   }
  //   spawnNPCs(): boolean {
  //     return false;
  //   }
}
