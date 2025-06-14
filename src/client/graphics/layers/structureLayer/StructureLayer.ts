// src/client/graphics/layers/structureLayer/StructureLayer.ts

// src/client/graphics/layers/StructureLayer.ts

import { colord, Colord } from "colord";
import { Theme } from "../../../../core/configuration/Config";
import { EventBus } from "../../../../core/EventBus";
import { MouseUpEvent } from "../../../InputHandler";
import { TransformHandler } from "../../TransformHandler";
import { Layer } from "../Layer";
import { UnitInfoModal } from "../UnitInfoModal";

import { Cell, UnitType } from "../../../../core/game/Game";
import {
  euclDistFN,
  hexDistFN,
  manhattanDistFN,
  rectDistFN,
} from "../../../../core/game/GameMap";
import { GameUpdateType } from "../../../../core/game/GameUpdates";
import { GameView, UnitView } from "../../../../core/game/GameView";

import {
  reloadingIcons,
  UnitBorderType,
  unitConfigs,
  UnitRenderConfig,
} from "./UnitRenderConfigs";

const underConstructionColor = colord({ r: 150, g: 150, b: 150 });
const reloadingColor = colord({ r: 255, g: 0, b: 0 });
const selectedUnitColor = colord({ r: 0, g: 255, b: 255 });

type DistanceFunction = typeof euclDistFN;

export class StructureLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private unitIcons: Map<string, HTMLImageElement> = new Map();
  private theme: Theme;
  private selectedStructureUnit: UnitView | null = null;
  private previouslySelected: UnitView | null = null;
  private unitRenderCache: Map<number, string> = new Map();

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
    private unitInfoModal: UnitInfoModal | null,
  ) {
    if (!unitInfoModal) {
      throw new Error(
        "UnitInfoModal instance must be provided to StructureLayer.",
      );
    }
    this.unitInfoModal = unitInfoModal;
    this.theme = game.config().theme();
    this.loadIconData();
    this.loadIcon("reloadingSam", {
      icon: reloadingIcons.reloadingSam,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    });
    this.loadIcon("reloadingSilo", {
      icon: reloadingIcons.reloadingSilo,
      borderRadius: 8.525,
      territoryRadius: 6.525,
      borderType: UnitBorderType.Square,
    });
  }

  // private loadIcon(unitType: string, config: UnitRenderConfig) {
  //   const image = new Image();
  //   image.src = config.icon;
  //   image.onload = () => {
  //     // Create temporary canvas for icon processing
  //     const tempCanvas = document.createElement("canvas");
  //     const tempContext = tempCanvas.getContext("2d");
  //     if (tempContext === null) throw new Error("2d context not supported");
  //     tempCanvas.width = image.width;
  //     tempCanvas.height = image.height;

  //     // Draw the unit icon
  //     tempContext.drawImage(image, 0, 0);
  //     const iconData = tempContext.getImageData(
  //       0,
  //       0,
  //       tempCanvas.width,
  //       tempCanvas.height,
  //     );
  //     this.unitIcons.set(unitType, iconData);
  //     console.log(
  //       `icon data width height: ${iconData.width}, ${iconData.height}`,
  //     );
  //   };
  // }

  private loadIcon(unitType: string, config: UnitRenderConfig) {
    const image = new Image();
    image.src = config.icon;
    image.onload = () => {
      this.unitIcons.set(unitType, image);
      // Optional: maybe trigger a redraw when all images loaded
    };
  }

  private loadIconData() {
    Object.entries(unitConfigs).forEach(([unitType, config]) => {
      this.loadIcon(unitType, config);
    });
  }

  shouldTransform(): boolean {
    return true;
  }

  tick() {
    const updates = this.game.updatesSinceLastTick();
    const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
    for (const u of unitUpdates) {
      const unit = this.game.unit(u.id);
      if (unit === undefined) continue;
      this.handleUnitRendering(unit);
    }
  }

  init() {
    this.redraw();
    this.eventBus.on(MouseUpEvent, (e) => this.onMouseUp(e));
  }

  redraw() {
    console.log("structure layer redrawing");
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d", { alpha: true });
    if (context === null) throw new Error("2d context not supported");
    this.context = context;
    this.canvas.width = this.game.width();
    this.canvas.height = this.game.height();
    this.game.units().forEach((u) => this.handleUnitRendering(u));
  }

  private getUnitRenderState(unit: UnitView): string {
    const type = unit.constructionType() ?? unit.type();
    const status = unit.isCooldown() ? "cooldown" : "ready";
    const active = unit.isActive() ? "active" : "inactive";
    const damaged = unit.isDamaged() ? "damaged" : "healthy";
    const selected =
      this.selectedStructureUnit?.id() === unit.id()
        ? "selected"
        : "unselected";
    const owner = unit.owner().id();

    return [type, status, active, damaged, selected, owner].join("-");
  }

  renderLayer(context: CanvasRenderingContext2D) {
    context.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
      this.game.width(),
      this.game.height(),
    );
  }

  private isUnitTypeSupported(unitType: UnitType): boolean {
    return unitType in unitConfigs;
  }

  private drawBorder(
    unit: UnitView,
    borderColor: Colord,
    config: UnitRenderConfig,
    distanceFN: DistanceFunction,
  ) {
    // Draw border and territory
    for (const tile of this.game.bfs(
      unit.tile(),
      distanceFN(unit.tile(), config.borderRadius, true),
    )) {
      this.paintCell(
        new Cell(this.game.x(tile), this.game.y(tile)),
        borderColor,
        255,
      );
    }

    for (const tile of this.game.bfs(
      unit.tile(),
      distanceFN(unit.tile(), config.territoryRadius, true),
    )) {
      this.paintCell(
        new Cell(this.game.x(tile), this.game.y(tile)),
        unit.type() === UnitType.Construction
          ? underConstructionColor
          : this.theme.territoryColor(unit.owner()),
        130,
      );
    }
  }

  private getDrawFN(type: UnitBorderType) {
    switch (type) {
      case UnitBorderType.Round:
        return euclDistFN;
      case UnitBorderType.Diamond:
        return manhattanDistFN;
      case UnitBorderType.Square:
        return rectDistFN;
      case UnitBorderType.Hexagon:
        return hexDistFN;
    }
  }

  private handleUnitRendering(unit: UnitView) {
    const oldState = this.unitRenderCache.get(unit.id());
    const newState = this.getUnitRenderState(unit);
    if (!oldState) {
      this.unitRenderCache.set(unit.id(), newState);
    } else {
      if (newState !== oldState) {
        this.unitRenderCache.set(unit.id(), newState);
      } else {
        return;
      }
    }

    const unitType = unit.constructionType() ?? unit.type();
    const iconType = unitType;
    if (!this.isUnitTypeSupported(unitType)) return;

    const config = unitConfigs[unitType];
    let icon: CanvasImageSource | undefined;

    if (unitType === UnitType.SAMLauncher && unit.isCooldown()) {
      icon = this.unitIcons.get("reloadingSam");
    } else {
      icon = this.unitIcons.get(iconType);
    }

    if (unitType === UnitType.MissileSilo && unit.isCooldown()) {
      icon = this.unitIcons.get("reloadingSilo");
    } else {
      icon = this.unitIcons.get(iconType);
    }

    if (!config || !icon) return;

    const drawFunction = this.getDrawFN(config.borderType);
    // Clear previous rendering
    for (const tile of this.game.bfs(
      unit.tile(),
      drawFunction(unit.tile(), config.borderRadius, true),
    )) {
      this.clearCell(new Cell(this.game.x(tile), this.game.y(tile)));
    }

    if (!unit.isActive()) return;

    let borderColor = this.theme.borderColor(unit.owner());
    if (unitType === UnitType.SAMLauncher && unit.isCooldown()) {
      borderColor = reloadingColor;
    } else if (unit.type() === UnitType.Construction) {
      borderColor = underConstructionColor;
    }

    if (unitType === UnitType.MissileSilo && unit.isCooldown()) {
      borderColor = reloadingColor;
    } else if (unit.type() === UnitType.Construction) {
      borderColor = underConstructionColor;
    }

    if (this.selectedStructureUnit === unit) {
      borderColor = selectedUnitColor;
    }

    if (unit.isDamaged()) {
      borderColor = colord(underConstructionColor).alpha(0.5);
    }

    this.drawBorder(unit, borderColor, config, drawFunction);

    icon = this.unitIcons.get(iconType);
    if (!icon) return;

    const startX = this.game.x(unit.tile()) - Math.floor(icon.width / 2);
    const startY = this.game.y(unit.tile()) - Math.floor(icon.height / 2);
    // Draw the icon
    this.context.drawImage(icon, startX, startY);
    //this.renderIcon(icon, startX, startY, icon.width, icon.height, unit);
  }

  private renderIcon(
    iconData: ImageData,
    startX: number,
    startY: number,
    width: number,
    height: number,
    unit: UnitView,
  ) {
    let color = this.theme.borderColor(unit.owner());
    if (unit.type() === UnitType.Construction) {
      color = underConstructionColor;
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const iconIndex = (y * width + x) * 4;
        const alpha = iconData.data[iconIndex + 3];

        if (alpha > 0) {
          const targetX = startX + x;
          const targetY = startY + y;

          if (
            targetX >= 0 &&
            targetX < this.game.width() &&
            targetY >= 0 &&
            targetY < this.game.height()
          ) {
            this.paintCell(new Cell(targetX, targetY), color, alpha);
          }
        }
      }
    }
  }

  paintCell(cell: Cell, color: Colord, alpha: number) {
    // this.clearCell(cell);
    this.context.fillStyle = color.alpha(alpha / 255).toRgbString();
    this.context.fillRect(cell.x, cell.y, 1, 1);
  }

  clearCell(cell: Cell) {
    this.context.clearRect(cell.x, cell.y, 1, 1);
  }

  private findStructureUnitAtCell(
    cell: { x: number; y: number },
    maxDistance: number = 10,
  ): UnitView | null {
    const targetRef = this.game.ref(cell.x, cell.y);

    const allUnitTypes = Object.values(UnitType);

    const nearby = this.game.nearbyUnits(targetRef, maxDistance, allUnitTypes);

    for (const { unit } of nearby) {
      if (unit.isActive() && this.isUnitTypeSupported(unit.type())) {
        return unit;
      }
    }

    return null;
  }

  isStructureOwner(unit: UnitView): boolean {
    return unit.owner().id() === this.game.myPlayer()?.id();
  }

  isLocalhost(): boolean {
    const host = window.location.hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      // in case you’re using the IPv6 loopback
      host === "[::1]"
    );
  }

  private onMouseUp(event: MouseUpEvent) {
    const cell = this.transformHandler.screenToWorldCoordinates(
      event.x,
      event.y,
    );
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      return;
    }

    const clickedUnit = this.findStructureUnitAtCell(cell);
    this.previouslySelected = this.selectedStructureUnit;

    //&& (this.isStructureOwner(clickedUnit) || this.isLocalhost())
    if (clickedUnit && this.isStructureOwner(clickedUnit)) {
      const wasSelected = this.previouslySelected === clickedUnit;
      if (wasSelected) {
        this.selectedStructureUnit = null;
        if (this.previouslySelected) {
          this.handleUnitRendering(this.previouslySelected);
        }
        this.unitInfoModal?.onCloseStructureModal();
      } else {
        this.selectedStructureUnit = clickedUnit;
        if (
          this.previouslySelected &&
          this.previouslySelected !== clickedUnit
        ) {
          this.handleUnitRendering(this.previouslySelected);
        }
        this.handleUnitRendering(clickedUnit);

        const screenPos = this.transformHandler.worldToScreenCoordinates(cell);
        const unitTile = clickedUnit.tile();
        this.unitInfoModal?.onOpenStructureModal({
          unit: clickedUnit,
          x: screenPos.x,
          y: screenPos.y,
          tileX: this.game.x(unitTile),
          tileY: this.game.y(unitTile),
        });
      }
    } else {
      this.selectedStructureUnit = null;
      if (this.previouslySelected) {
        this.handleUnitRendering(this.previouslySelected);
      }
      this.unitInfoModal?.onCloseStructureModal();
    }
  }

  public unSelectStructureUnit() {
    if (this.selectedStructureUnit) {
      this.previouslySelected = this.selectedStructureUnit;
      this.selectedStructureUnit = null;
      this.handleUnitRendering(this.previouslySelected);
    }
  }
}
