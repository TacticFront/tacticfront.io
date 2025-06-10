// src/core/execution/StrikePackageExecution.ts

import { consolex } from "../Consolex";
import { Execution, Game, PlayerID, Unit, UnitType } from "../game/Game";
import { NukeType } from "../StatsSchemas";
import { strikePackagePhases } from "../types/StrikePackagePhases";
import { StrikePackageType } from "../types/StrikePackageType";
import { NukeExecution } from "./NukeExecution";

// Helper to map package type
const strikeTypeToUnitType = (type: StrikePackageType): NukeType => {
  switch (type) {
    case StrikePackageType.CruiseMissile:
      return UnitType.CruiseMissile;
    case StrikePackageType.AtomBomb:
      return UnitType.AtomBomb;
    // Add more mappings as needed
    default:
      throw new Error("Unknown StrikePackageType: " + type);
  }
};

export class StrikePackageExecution implements Execution {
  private active: boolean = true;
  private mg: Game;

  private currentPhaseIndex = 0;
  private phaseCooldown = 0; // in ticks
  private readonly phaseCooldownTicks = 30; // adjust if needed for your engine

  constructor(
    private requestorID: PlayerID,
    private target: PlayerID,
    private packageType: StrikePackageType,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    this.currentPhaseIndex = 0;
    this.phaseCooldown = 0;
    console.log(
      "StrikePackageExecution INIT",
      this.packageType,
      "from",
      this.requestorID,
      "to",
      this.target,
    );
    consolex.warn(`Init` + this.packageType + this.requestorID + this.target);
  }

  tick(ticks: number): void {
    // Cooldown counting
    console.log(
      "StrikePackageExecution TICK",
      this.packageType,
      "from",
      this.requestorID,
      "to",
      this.target,
    );
    if (this.phaseCooldown > 0) {
      this.phaseCooldown--;
      return;
    }
    // All phases done
    const phases = strikePackagePhases[this.packageType];
    if (!phases || this.currentPhaseIndex >= phases.length) {
      this.active = false;
      return;
    }

    // Get phase and launch!
    const phase = phases[this.currentPhaseIndex];
    const player = this.mg.player(this.requestorID);
    const targetPlayer = this.mg.player(this.target);
    if (!player || !targetPlayer) {
      this.active = false;
      return;
    }
    const targets: Unit[] = [];
    for (const type of phase.targetTypes) {
      targets.push(...targetPlayer.units(type));
    }

    if (targets.length === 0) {
      // No valid targets for this phase, skip to next phase
      this.advancePhase();
      return;
    }

    // Fire missiles for this phase
    for (const target of targets) {
      for (let i = 0; i < (phase.overkill ?? 1); i++) {
        this.mg.addExecution(
          new NukeExecution(
            phase.missileType,
            this.requestorID,
            target.tile(),
            // TODO: add launch site logic if needed
          ),
        );
      }
      // Handle decoys if needed
      if (phase.launchDecoys) {
        this.mg.addExecution(
          new NukeExecution(
            UnitType.CruiseMissile,
            this.requestorID,
            target.tile(),
            // TODO: add launch site logic if needed
          ),
        );
        // Implement decoy logic if you want
      }
    }

    // Only fire one phase per cooldown
    this.phaseCooldown = this.phaseCooldownTicks;
    this.advancePhase();
  }

  private advancePhase() {
    this.currentPhaseIndex++;
    if (
      this.currentPhaseIndex >= strikePackagePhases[this.packageType]?.length
    ) {
      this.active = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
}

// export class StrikePackageExecution implements Execution {
//   private active: boolean = true;
//   private nukeExecution: NukeExecution | null = null;
//   private mg: Game;

//   constructor(
//     private requestorID: PlayerID,
//     private target: PlayerID,
//     private packageType: StrikePackageType,
//   ) {}

//   init(mg: Game, ticks: number): void {
//     this.mg = mg;
//     console.log("StrikePackageExecution INIT", this.packageType, "from", this.requestorID, "to", this.target);
//     console.log(mg.player(this.requestorID).displayName(), "->", mg.player(this.target).displayName());
//     consolex.warn(`Init` + this.packageType + this.requestorID + this.target);

//   }

//   tick(ticks: number): void {

//     if (this.mg.ticks() % 5 === 0) {
//       this.targetAndFire();
//     }
//         // Deactivate immediately after adding the nuke execution

//     // This tick method should ideally not be called if active is false,
//     // but keeping it here for completeness based on the Execution interface.
//     // The logic for the nuke's lifecycle will be in NukeExecution's tick.
//   }

//   isActive(): boolean { return this.active; }
//   activeDuringSpawnPhase(): boolean { return false; }

//   targetAndFire(): void {
//     const player = this.mg.player(this.requestorID);
//     const targetPlayer = this.mg.player(this.target);
//     if (!player || !targetPlayer) {
//       this.active = false;
//       return;
//     }
//     const nukeType = strikeTypeToUnitType(this.packageType);

//     const silos = player.units(UnitType.MissileSilo).filter(silo => silo.isActive() && !silo.isInCooldown());
//     // Example strategy: hit all cities
//     let targets = {
//       cities: targetPlayer.units(UnitType.City),
//       defensePosts: targetPlayer.units(UnitType.DefensePost),
//       missileSilos: targetPlayer.units(UnitType.MissileSilo),
//       samLaunchers: targetPlayer.units(UnitType.SAMLauncher),
//     };

//     // let totalTargets = targets.cities.length + targets["defensePosts"].length + targets["missileSilos"].length + targets["samLaunchers"].length

//     // if (totalTargets === 0) {
//     //   // No valid targets
//     //   this.active = false;
//     //   return;
//     // }

//     // if (targets.samLaunchers.length > 0) {
//     //       this.fireSalvo(targets.missileSilos, nukeType, 1);
//     // }

//     // if (targets.missileSilos.length > 0) {
//     //       this.fireSalvo(targets.missileSilos, nukeType, 1);
//     // }

//     // if (targets.defensePosts.length > 0) {
//     //       this.fireSalvo(targets.missileSilos, nukeType, 1);
//     // }

//     // if (targets.cities.length > 0) {
//     //       this.fireSalvo(targets.missileSilos, UnitType.AtomBomb, 1);
//     // }

//   // Inside tick or phase handling:
//   const phases = strikePackagePhases[this.packageType];
//   for (const phase of phases) {
//     let targets: Unit[] = [];
//     for (const type of phase.targetTypes) {
//       targets.push(...targetPlayer.units(type));
//     }
//     if (targets.length > 0) {
//       for (const target of targets) {
//         for (let i = 0; i < (phase.overkill ?? 1); i++) {
//           this.mg.addExecution(new NukeExecution(
//             phase.missileType,
//             this.requestorID,
//             target.tile(),
//             /* src tile logic */
//           ));
//         }
//         // Handle decoys if needed
//         if (phase.launchDecoys) {
//           // Example: Launch decoy missiles (implement as needed)
//         }
//       }
//       break; // Only fire one phase per tick, or implement as you like
//     }
//   }

//     let target = targets[0];

//     // Launch a nuke at each target (or just one, if you want)
//     // for (const tile of targets) {

//     console.log("Firing Nuke Execution");
//     consolex.warn("Firing nuke at" + targets[0], "with type" + nukeType);

//   }

//   fireSalvo(targets: Unit[], nukeType: NukeType, overkill: number): void {
//     for (const target of targets) {
//       if (this.mg.player(this.requestorID).units(UnitType.MissileSilo).length === 0) {
//         console.warn("No missile silos available for strike package execution");
//         this.active = false;
//         return;
//       }

//       for (let i = 0; i < overkill; i++) {

//         this.mg.addExecution(new NukeExecution(nukeType, this.requestorID, target.tile()));
//       }
//     }
//     // this.active = false; // Deactivate after firing
//     // console.log("StrikePackageExecution completed for", this.requestorID, "to", this.target);
//   }
// }
