// src/core/configuration/DefaultConfig.ts

import { JWK } from "jose";
import { z } from "zod";
import {
  Difficulty,
  Duos,
  Game,
  GameMapType,
  GameMode,
  GameType,
  Gold,
  Player,
  PlayerInfo,
  PlayerType,
  TerrainType,
  TerraNullius,
  Tick,
  UnitInfo,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PlayerView } from "../game/GameView";
import { UserSettings } from "../game/UserSettings";
import { GameConfig, GameID } from "../Schemas";
import { NukeType } from "../StatsSchemas";
import { assertNever, simpleHash, within } from "../Util";
import { Config, GameEnv, NukeMagnitude, ServerConfig, Theme } from "./Config";
import { PastelTheme } from "./PastelTheme";
import { PastelThemeDark } from "./PastelThemeDark";

const JwksSchema = z.object({
  keys: z
    .object({
      alg: z.literal("EdDSA"),
      crv: z.literal("Ed25519"),
      kty: z.literal("OKP"),
      x: z.string(),
    })
    .array()
    .min(1),
});

const numPlayersConfig = {
  [GameMapType.GatewayToTheAtlantic]: [80, 60, 40],
  [GameMapType.SouthAmerica]: [70, 50, 40],
  [GameMapType.NorthAmerica]: [80, 60, 50],
  [GameMapType.Africa]: [100, 80, 50],
  [GameMapType.Europe]: [80, 50, 30],
  [GameMapType.Australia]: [50, 40, 30],
  [GameMapType.Iceland]: [50, 40, 30],
  [GameMapType.Britannia]: [50, 40, 30],
  [GameMapType.Asia]: [60, 50, 30],
  [GameMapType.FalklandIslands]: [80, 50, 30],
  [GameMapType.Baikal]: [60, 50, 40],
  [GameMapType.Mena]: [60, 50, 30],
  [GameMapType.Mars]: [50, 40, 30],
  [GameMapType.Oceania]: [30, 20, 10],
  [GameMapType.Japan]: [50, 40, 30],
  [GameMapType.FaroeIslands]: [50, 40, 30],
  [GameMapType.DeglaciatedAntarctica]: [50, 40, 30],
  [GameMapType.EuropeClassic]: [80, 30, 50],
  [GameMapType.BetweenTwoSeas]: [40, 50, 30],
  [GameMapType.BlackSea]: [40, 50, 30],
  [GameMapType.Pangaea]: [40, 20, 30],
  [GameMapType.World]: [150, 80, 50],
  [GameMapType.WorldMapGiant]: [150, 100, 60],
  [GameMapType.Halkidiki]: [50, 40, 30],
} as const satisfies Record<GameMapType, [number, number, number]>;

export abstract class DefaultServerConfig implements ServerConfig {
  private publicKey: JWK;
  abstract jwtAudience(): string;
  jwtIssuer(): string {
    const audience = this.jwtAudience();
    return audience === "localhost"
      ? "http://localhost:8787"
      : `https://api.${audience}`;
  }
  async jwkPublicKey(): Promise<JWK> {
    if (this.publicKey) return this.publicKey;
    const jwksUrl = this.jwtIssuer() + "/.well-known/jwks.json";
    console.log(`Fetching JWKS from ${jwksUrl}`);
    const response = await fetch(jwksUrl);
    const jwks = JwksSchema.parse(await response.json());
    this.publicKey = jwks.keys[0];
    return this.publicKey;
  }
  otelEnabled(): boolean {
    return (
      Boolean(this.otelEndpoint()) &&
      Boolean(this.otelUsername()) &&
      Boolean(this.otelPassword())
    );
  }
  otelEndpoint(): string {
    return process.env.OTEL_ENDPOINT ?? "";
  }
  otelUsername(): string {
    return process.env.OTEL_USERNAME ?? "";
  }
  otelPassword(): string {
    return process.env.OTEL_PASSWORD ?? "";
  }
  region(): string {
    if (this.env() === GameEnv.Dev) {
      return "dev";
    }
    return process.env.REGION ?? "";
  }
  gitCommit(): string {
    return process.env.GIT_COMMIT ?? "";
  }
  r2Endpoint(): string {
    return process.env.R2_ENDPOINT ?? ""; //`https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  r2AccessKey(): string {
    return process.env.R2_ACCESS_KEY ?? "";
  }
  r2SecretKey(): string {
    return process.env.R2_SECRET_KEY ?? "";
  }

  r2Bucket(): string {
    return process.env.R2_BUCKET ?? "";
  }

  adminHeader(): string {
    return "x-admin-key2345678";
  }
  adminToken(): string {
    return process.env.ADMIN_TOKEN ?? "thenew=dummy-admin-token";
  }
  abstract numWorkers(): number;
  abstract env(): GameEnv;
  turnIntervalMs(): number {
    return 125;
  }

  tps(): number {
    return 1000 / this.turnIntervalMs();
  }

  gameCreationRate(): number {
    return 120 * 1000;
  }

  lobbyMaxPlayers(
    map: GameMapType,
    mode: GameMode,
    numPlayerTeams: number | undefined,
  ): number {
    const [l, m, s] = numPlayersConfig[map] ?? [50, 30, 20];
    const r = Math.random();
    const base = r < 0.3 ? l : r < 0.6 ? m : s;
    let p = Math.min(mode === GameMode.Team ? Math.ceil(base * 1.5) : base, l);
    if (numPlayerTeams !== undefined) {
      p -= p % numPlayerTeams;
    }
    return p;
  }

  workerIndex(gameID: GameID): number {
    return simpleHash(gameID) % this.numWorkers();
  }
  workerPath(gameID: GameID): string {
    return `w${this.workerIndex(gameID)}`;
  }
  workerPort(gameID: GameID): number {
    return this.workerPortByIndex(this.workerIndex(gameID));
  }
  workerPortByIndex(index: number): number {
    return 3001 + index;
  }
}

export class DefaultConfig implements Config {
  private pastelTheme: PastelTheme = new PastelTheme();
  private pastelThemeDark: PastelThemeDark = new PastelThemeDark();
  private _tps;
  constructor(
    private _serverConfig: ServerConfig,
    private _gameConfig: GameConfig,
    private _userSettings: UserSettings | null,
    private _isReplay: boolean,
  ) {
    this._tps = _serverConfig.tps();
  }

  isReplay(): boolean {
    return this._isReplay;
  }

  samHittingChance(): number {
    return 0.8;
  }

  samWarheadHittingChance(): number {
    return 0.5;
  }

  traitorDefenseDebuff(): number {
    return 0.5;
  }
  traitorDuration(): number {
    return 60 * this._tps; // 30 seconds
  }
  spawnImmunityDuration(): Tick {
    return 5 * this._tps;
  }

  gameConfig(): GameConfig {
    return this._gameConfig;
  }

  serverConfig(): ServerConfig {
    return this._serverConfig;
  }

  userSettings(): UserSettings {
    if (this._userSettings === null) {
      throw new Error("userSettings is null");
    }
    return this._userSettings;
  }

  difficultyModifier(difficulty: Difficulty): number {
    switch (difficulty) {
      case Difficulty.Easy:
        return 1;
      case Difficulty.Medium:
        return 3;
      case Difficulty.Hard:
        return 9;
      case Difficulty.Impossible:
        return 18;
    }
  }

  cityPopulationIncrease(): number {
    return 250_000;
  }

  falloutDefenseModifier(falloutRatio: number): number {
    // falloutRatio is between 0 and 1
    // So defense modifier is between [5, 2.5]
    return 5 - falloutRatio * 2;
  }
  SAMCooldown(): number {
    return 45;
  }
  SiloCooldown(): number {
    return 100;
  }

  defensePostRange(): number {
    return 35;
  }
  defensePostDefenseBonus(): number {
    return 6;
  }
  playerTeams(): number | typeof Duos {
    return this._gameConfig.playerTeams ?? 0;
  }

  spawnNPCs(): boolean {
    return !this._gameConfig.disableNPCs;
  }

  isUnitDisabled(unitType: UnitType): boolean {
    return this._gameConfig.disabledUnits?.includes(unitType) ?? false;
  }

  bots(): number {
    return this._gameConfig.bots;
  }
  instantBuild(): boolean {
    return this._gameConfig.instantBuild;
  }
  infiniteGold(): boolean {
    return this._gameConfig.infiniteGold;
  }
  infiniteTroops(): boolean {
    return this._gameConfig.infiniteTroops;
  }
  tradeShipGold(dist: number): Gold {
    return Math.floor(10000 + 150 * Math.pow(dist, 1.1));
  }
  tradeShipSpawnRate(numberOfPorts: number): number {
    return Math.min(50, Math.round(10 * Math.pow(numberOfPorts, 0.6)));
  }

  unitInfo(type: UnitType): UnitInfo {
    switch (type) {
      case UnitType.TransportShip:
        return {
          cost: () => 0,
          territoryBound: false,
        };
      case UnitType.Warship:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  6_000_000,
                  (p.unitsIncludingConstruction(UnitType.Warship).length + 1) *
                    300_000,
                ),

          territoryBound: false,
          maxHealth: 1000,
        };
      case UnitType.Shell:
        return {
          cost: () => 0,
          territoryBound: false,
          damage: 250,
        };
      case UnitType.SAMMissile:
        return {
          cost: () => 25_000,
          territoryBound: false,
        };
      case UnitType.Port:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  1_000_000,
                  Math.pow(
                    2,
                    p.unitsIncludingConstruction(UnitType.Port).length,
                  ) * 125_000,
                ),

          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 3 * this._tps,
        };
      case UnitType.CruiseMissile:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold() ? 0 : 100_000,
          territoryBound: false,
        };
      case UnitType.AtomBomb:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : 1_000_000,
          territoryBound: false,
        };
      case UnitType.HydrogenBomb:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : 5_000_000,
          territoryBound: false,
        };
      case UnitType.MIRV:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : 25_000_000,
          territoryBound: false,
        };
      case UnitType.MIRVWarhead:
        return {
          cost: () => 0,
          territoryBound: false,
        };
      case UnitType.TradeShip:
        return {
          cost: () => 0,
          territoryBound: false,
        };
      case UnitType.MissileSilo:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  p.getVar("missileSiloMaxCost") ?? 800_000,
                  200_000 +
                    p.unitsIncludingConstruction(UnitType.MissileSilo).length *
                      200_000,
                ),

          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 20 * this._tps,
        };
      case UnitType.DefensePost:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  200_000,
                  (p.unitsIncludingConstruction(UnitType.DefensePost).length +
                    1) *
                    40_000,
                ),
          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 5 * this._tps,
        };
      case UnitType.ResearchLab:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  2_000_000,
                  Math.pow(
                    2,
                    p.unitsIncludingConstruction(UnitType.ResearchLab).length,
                  ) * 125_000,
                ),
          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 8 * this._tps,
        };
      case UnitType.PowerPlant:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  2_500_000,
                  (p.unitsIncludingConstruction(UnitType.PowerPlant).length +
                    1) *
                    500_000,
                ),

          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 15 * this._tps,
        };
      case UnitType.Hospital:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  4_000_000,
                  Math.pow(
                    2,
                    p.unitsIncludingConstruction(UnitType.Hospital).length,
                  ) * 500_000,
                ),

          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 5 * this._tps,
        };
      case UnitType.Barracks:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  500_000,
                  Math.pow(
                    2,
                    p.unitsIncludingConstruction(UnitType.Barracks).length,
                  ) * 50_000,
                ),

          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 5 * this._tps,
        };
      case UnitType.SAMLauncher:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  5_000_000,
                  (p.unitsIncludingConstruction(UnitType.SAMLauncher).length +
                    1) *
                    500_000,
                ),

          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 25 * this._tps,
        };
      case UnitType.Radar:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  6_000_000,
                  (p.unitsIncludingConstruction(UnitType.Radar).length + 1) *
                    1_500_000,
                ),

          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 25 * this._tps,
        };
      case UnitType.City:
        return {
          cost: (p: Player) =>
            p.type() === PlayerType.Human && this.infiniteGold()
              ? 0
              : Math.min(
                  1_000_000,
                  Math.pow(
                    2,
                    p.unitsIncludingConstruction(UnitType.City).length,
                  ) * 125_000,
                ),

          territoryBound: true,
          constructionDuration: this.instantBuild() ? 0 : 3 * this._tps,
        };
      case UnitType.Construction:
        return {
          cost: () => 0,
          territoryBound: true,
        };
      default:
        assertNever(type);
    }
  }

  unitRepairCooldown(unitType: UnitType): number {
    switch (unitType) {
      case UnitType.City:
        return 60 * 10;
      case UnitType.DefensePost:
        return 45 * 10;
      case UnitType.Port:
        return 30 * 10;
      case UnitType.PowerPlant:
        return 30 * 10;
      case UnitType.Radar:
        return 45 * 10;
      case UnitType.ResearchLab:
        return 30 * 10;
      case UnitType.SAMLauncher:
        return 45 * 10;
      default:
        return 10 * 10; // Default cooldown for other units.
    }
  }
  defaultDonationAmount(sender: Player): number {
    return Math.floor(sender.troops() / 3);
  }
  donateCooldown(): Tick {
    return 10 * this._tps;
  }
  emojiMessageDuration(): Tick {
    return 5 * this._tps;
  }
  emojiMessageCooldown(): Tick {
    return 5 * this._tps;
  }
  targetDuration(): Tick {
    return 10 * this._tps;
  }
  targetCooldown(): Tick {
    return 15 * this._tps;
  }
  allianceRequestCooldown(): Tick {
    return 30 * this._tps;
  }
  allianceDuration(): Tick {
    return 600 * this._tps; // 10 minutes.
  }
  temporaryEmbargoDuration(): Tick {
    return 300 * this._tps; // 5 minutes.
  }

  missileBaseEvasion(missileType: NukeType): number {
    switch (missileType) {
      case UnitType.CruiseMissile:
        return 0;
        break;
      default:
        return 0;
        break;
    }
  }
  samBaseTargeting(): number {
    return 50;
  }

  percentageTilesOwnedToWin(): number {
    if (this._gameConfig.gameMode === GameMode.Team) {
      return 95;
    }
    return 80;
  }
  boatMaxNumber(player: Player): number {
    return player.getVar("navalInvasionMaxCount") || 3;
  }
  numSpawnPhaseTurns(): number {
    return this._gameConfig.gameType === GameType.Singleplayer ? 100 : 150;
  }
  numBots(): number {
    return this.bots();
  }
  theme(): Theme {
    return this.userSettings()?.darkMode()
      ? this.pastelThemeDark
      : this.pastelTheme;
  }

  attackLogic(
    gm: Game,
    attackTroops: number,
    attacker: Player,
    attackerDensity: number,
    defender: Player | TerraNullius,
    tileToConquer: TileRef,
  ): {
    attackerTroopLoss: number;
    defenderTroopLoss: number;
    attackAttemptsToConquer: number;
  } {
    let mag = 0;
    let speed = 0;

    const type = gm.terrainType(tileToConquer);
    switch (type) {
      case TerrainType.Plains:
        mag = 85;
        speed = 16.5;
        break;
      case TerrainType.Highland:
        mag = 100;
        speed = 20;
        break;
      case TerrainType.Mountain:
        mag = 120;
        speed = 25;
        break;
      default:
        throw new Error(`terrain type ${type} not supported`);
    }
    if (defender.isPlayer()) {
      for (const dp of gm.nearbyUnits(
        tileToConquer,
        gm.config().defensePostRange(),
        UnitType.DefensePost,
      )) {
        if (dp.unit.owner() === defender && !dp.unit.isDamaged()) {
          mag *= this.defensePostDefenseBonus();
          speed *= this.defensePostDefenseBonus() / 2;
          break;
        }
      }
    }

    if (gm.hasFallout(tileToConquer)) {
      const falloutRatio = gm.numTilesWithFallout() / gm.numLandTiles();
      mag *= this.falloutDefenseModifier(falloutRatio);
      speed *= this.falloutDefenseModifier(falloutRatio);
    }

    if (attacker.isPlayer() && defender.isPlayer()) {
      if (
        attacker.type() === PlayerType.Human &&
        defender.type() === PlayerType.Bot
      ) {
        mag *= 0.8;
      }
      if (
        attacker.type() === PlayerType.FakeHuman &&
        defender.type() === PlayerType.Bot
      ) {
        mag *= 0.8;
      }
    }

    const largeLossModifier = 1;
    // if (attacker.numTilesOwned() > 100_000) {
    //   largeLossModifier = Math.sqrt(100_000 / attacker.numTilesOwned());
    // }
    let largeSpeedMalus = 1;
    if (attacker.numTilesOwned() > 75_000) {
      // sqrt is only exponent 1/2 which doesn't slow enough huge players
      largeSpeedMalus = (75_000 / attacker.numTilesOwned()) ** 0.6 + 1;
    }

    if (defender.isPlayer()) {
      return {
        attackerTroopLoss:
          mag *
          0.8 *
          largeLossModifier *
          (defender.isTraitor() ? this.traitorDefenseDebuff() : 1),
        defenderTroopLoss: defender.troops() / defender.numTilesOwned(),
        attackAttemptsToConquer: 2 * speed * largeSpeedMalus,
      };
    } else {
      return {
        attackerTroopLoss:
          attacker.type() === PlayerType.Bot ? mag / 10 : mag / 5,
        defenderTroopLoss: 0,
        attackAttemptsToConquer: within(
          (2000 * Math.max(10, speed)) / attackTroops,
          5,
          100,
        ),
      };
    }
  }

  attackTilesPerTick(
    attackTroops: number,
    attacker: Player,
    defender: Player | TerraNullius,
    numAdjacentTilesWithEnemy: number,
  ): number {
    // Base throughput scaling from troop count
    // const baseTilesPerTick = Math.log2(attackTroops + 2) * 3;

    // // Frontline spread: more borders = slightly more throughput
    // const frontlineBoost = ((troops / borderSize) ^ 0.5) * borderSize / 2;

    // Final calculation
    //return ((attackTroops / numAdjacentTilesWithEnemy) ^ 0.5) * numAdjacentTilesWithEnemy / 2
    return 10 * numAdjacentTilesWithEnemy + 3 * Math.sqrt(attackTroops);
  }

  boatAttackAmount(attacker: Player, defender: Player | TerraNullius): number {
    return Math.floor(attacker.troops() / 5);
  }

  warshipShellLifetime(): number {
    return 20; // in ticks (one tick is 100ms)
  }

  radiusPortSpawn() {
    return 20;
  }

  proximityBonusPortsNb(totalPorts: number) {
    return within(totalPorts / 3, 4, totalPorts);
  }

  attackAmount(attacker: Player, defender: Player | TerraNullius) {
    if (attacker.type() === PlayerType.Bot) {
      return attacker.troops() / 40;
    } else {
      return attacker.troops() / 20;
    }
  }

  startManpower(playerInfo: PlayerInfo): number {
    if (playerInfo.playerType === PlayerType.Bot) {
      return 12_500;
    }
    if (playerInfo.playerType === PlayerType.FakeHuman) {
      switch (this._gameConfig.difficulty) {
        case Difficulty.Easy:
          return 10_000 * (playerInfo?.nation?.strength ?? 1);
        case Difficulty.Medium:
          return 20_000 * (playerInfo?.nation?.strength ?? 1);
        case Difficulty.Hard:
          return 35_000 * (playerInfo?.nation?.strength ?? 1);
        case Difficulty.Impossible:
          return 50_000 * (playerInfo?.nation?.strength ?? 1);
      }
    }
    return this.infiniteTroops() ? 1_000_000 : 20_000;
  }

  maxPopulation(player: Player | PlayerView): number {
    const maxPop =
      player.type() === PlayerType.Human && this.infiniteTroops()
        ? 1_000_000_000
        : 2 * (Math.pow(player.numTilesOwned(), 0.6) * 1000 + 50000) +
          player.units(UnitType.City).length * this.cityPopulationIncrease();

    if (player.type() === PlayerType.Bot) {
      return maxPop / 2;
    }

    if (player.type() === PlayerType.Human) {
      return maxPop;
    }

    switch (this._gameConfig.difficulty) {
      case Difficulty.Easy:
        return maxPop * 0.5;
      case Difficulty.Medium:
        return maxPop * 1;
      case Difficulty.Hard:
        return maxPop * 1.5;
      case Difficulty.Impossible:
        return maxPop * 2;
    }
  }

  populationIncreaseRate(player: Player): number {
    // const max = this.maxPopulation(player);

    // let toAdd = 10 + Math.pow(player.population(), 0.73) / 4;

    // const ratio = 1 - player.population() / max;
    // toAdd *= ratio;

    const max = this.maxPopulation(player);
    //population grows proportional to current population with growth decreasing as it approaches max
    // smaller countries recieve a boost to pop growth to speed up early game
    const baseAdditionRate = 10;
    const basePopGrowthRate = 1400 / max + 1 / 160;
    const reproductionPop = 0.8 * player.troops() + 1.1 * player.workers();
    let toAdd = baseAdditionRate + basePopGrowthRate * reproductionPop;
    const totalPop = player.population();
    const ratio = 1 - totalPop / max;
    toAdd *= ratio;

    if (player.type() === PlayerType.Bot) {
      toAdd *= 0.7;
    }

    if (player.type() === PlayerType.FakeHuman) {
      switch (this._gameConfig.difficulty) {
        case Difficulty.Easy:
          toAdd *= 0.9;
          break;
        case Difficulty.Medium:
          toAdd *= 1;
          break;
        case Difficulty.Hard:
          toAdd *= 1.1;
          break;
        case Difficulty.Impossible:
          toAdd *= 1.2;
          break;
      }
    }

    return Math.min(player.population() + toAdd, max) - player.population();
  }

  goldAdditionRate(player: Player): Gold {
    const workers = Number(player.workers()) || 0;
    const populationGold = 0.025 * Math.pow(workers, 0.87);
    const cityGold = (player.units(UnitType.City)?.length || 0) * 50;
    const portGold = (player.units(UnitType.Port)?.length || 0) * 30;

    const ppGen =
      player && typeof player.getVar === "function"
        ? Number(player.getVar("powerPlantGoldGeneration")) || 1
        : 1;

    const powerPlantGold =
      (player.units(UnitType.PowerPlant)?.length || 0) * ppGen;

    let totalGoldRaw = populationGold + cityGold + portGold + powerPlantGold;
    if (!isFinite(totalGoldRaw)) totalGoldRaw = 0;

    return Math.floor(totalGoldRaw);
  }

  troopAdjustmentRate(player: Player): number {
    const maxDiff = this.maxPopulation(player) / 1600;
    const target = player.population() * player.targetTroopRatio();
    const diff = target - (player.troops() + player.offensiveTroops());
    if (Math.abs(diff) < maxDiff) {
      return diff;
    }

    const adjustment =
      player.type() === PlayerType.Bot
        ? 2 * maxDiff * Math.sign(diff)
        : 2 * maxDiff * Math.sign(diff);
    // Can ramp down troops much faster
    if (adjustment < 0) {
      return adjustment * 5;
    }
    return adjustment;
  }

  nukeMagnitudes(unitType: UnitType): NukeMagnitude {
    switch (unitType) {
      case UnitType.MIRVWarhead:
        return { inner: 6, outer: 16 };
      case UnitType.CruiseMissile:
        return { inner: 5, outer: 10 };
      case UnitType.AtomBomb:
        return { inner: 12, outer: 30 };
      case UnitType.HydrogenBomb:
        return { inner: 50, outer: 75 };
    }
    throw new Error(`Unknown nuke type: ${unitType}`);
  }

  defaultNukeSpeed(): number {
    return 4;
  }

  // Humans can be population, soldiers attacking, soldiers in boat etc.
  nukeDeathFactor(humans: number, tilesOwned: number): number {
    return (5 * humans) / Math.max(1, tilesOwned);
  }

  structureMinDist(): number {
    // TODO: Increase this to ~15 once upgradable structures are implemented.
    return 15;
  }

  shellLifetime(): number {
    return 50;
  }

  warshipPatrolRange(): number {
    return 100;
  }

  warshipTargettingRange(): number {
    return 130;
  }

  warshipShellAttackRate(): number {
    return 20;
  }

  defensePostShellAttackRate(): number {
    return 100;
  }

  safeFromPiratesCooldownMax(): number {
    return 20;
  }

  defensePostTargettingRange(): number {
    return 75;
  }
}
