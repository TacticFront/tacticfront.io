import { Colord } from "colord";
import { Theme } from "../../../core/configuration/Config";
import { Unit, UnitEvent, Cell, Game, Tile, UnitType } from "../../../core/game/Game";
import { bfs, dist, euclDist } from "../../../core/Util";
import { Layer } from "./Layer";
import { EventBus } from "../../../core/EventBus";

export class UnitLayer implements Layer {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    private boatToTrail = new Map<Unit, Set<Tile>>();

    private theme: Theme = null;

    constructor(private game: Game, private eventBus: EventBus) {
        this.theme = game.config().theme();
    }


    shouldTransform(): boolean {
        return true;
    }

    tick() {
    }

    init(game: Game) {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext("2d");

        this.canvas.width = this.game.width();
        this.canvas.height = this.game.height();

        this.eventBus.on(UnitEvent, e => this.onUnitEvent(e));
    }

    renderLayer(context: CanvasRenderingContext2D) {
        context.drawImage(
            this.canvas,
            -this.game.width() / 2,
            -this.game.height() / 2,
            this.game.width(),
            this.game.height()
        );
    }

    onUnitEvent(event: UnitEvent) {
        switch (event.unit.type()) {
            case UnitType.TransportShip:
                this.handleBoatEvent(event);
                break;
            case UnitType.Destroyer:
                this.handleDestroyerEvent(event);
                break;
            case UnitType.Battleship:
                this.handleBattleshipEvent(event);
                break;
            case UnitType.Shell:
                this.handleShellEvent(event)
                break;
            case UnitType.TradeShip:
                this.handleTradeShipEvent(event)
                break;
            case UnitType.AtomBomb:
            case UnitType.HydrogenBomb:
                this.handleNuke(event)
                break
        }
    }

    private handleDestroyerEvent(event: UnitEvent) {
        bfs(event.oldTile, euclDist(event.oldTile, 4)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (!event.unit.isActive()) {
            return
        }
        bfs(event.unit.tile(), euclDist(event.unit.tile(), 4))
            .forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.unit.owner().info()), 255));
        bfs(event.unit.tile(), dist(event.unit.tile(), 3))
            .forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 255));
    }

    private handleBattleshipEvent(event: UnitEvent) {
        bfs(event.oldTile, euclDist(event.oldTile, 6)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (!event.unit.isActive()) {
            return
        }
        bfs(event.unit.tile(), euclDist(event.unit.tile(), 5))
            .forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 255));
        bfs(event.unit.tile(), dist(event.unit.tile(), 4))
            .forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.unit.owner().info()), 255));
        bfs(event.unit.tile(), euclDist(event.unit.tile(), 1))
            .forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 255));
    }

    private handleShellEvent(event: UnitEvent) {
        this.clearCell(event.oldTile.cell())
        if (!event.unit.isActive()) {
            return
        }
        this.paintCell(event.unit.tile().cell(), this.theme.borderColor(event.unit.owner().info()), 255)
    }


    private handleNuke(event: UnitEvent) {
        bfs(event.oldTile, euclDist(event.oldTile, 2)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (event.unit.isActive()) {
            bfs(event.unit.tile(), euclDist(event.unit.tile(), 2))
                .forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.unit.owner().info()), 255));
        }

    }

    private handleTradeShipEvent(event: UnitEvent) {
        bfs(event.oldTile, euclDist(event.oldTile, 3)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (event.unit.isActive()) {
            bfs(event.unit.tile(), dist(event.unit.tile(), 2))
                .forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 255));
        }
        if (event.unit.isActive()) {
            bfs(event.unit.tile(), dist(event.unit.tile(), 1))
                .forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.unit.owner().info()), 255));
        }
    }

    private handleBoatEvent(event: UnitEvent) {
        if (!this.boatToTrail.has(event.unit)) {
            this.boatToTrail.set(event.unit, new Set<Tile>());
        }
        const trail = this.boatToTrail.get(event.unit);
        trail.add(event.oldTile);
        bfs(event.oldTile, dist(event.oldTile, 3)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (event.unit.isActive()) {
            try {
                bfs(event.unit.tile(), dist(event.unit.tile(), 4)).forEach(
                    t => {
                        if (trail.has(t)) {
                            this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 150);
                        }
                    }
                );
            } catch {
                console.log('uh oh')
            }
            bfs(event.unit.tile(), dist(event.unit.tile(), 2))
                .forEach(t => this.paintCell(t.cell(), this.theme.borderColor(event.unit.owner().info()), 255));
            bfs(event.unit.tile(), dist(event.unit.tile(), 1))
                .forEach(t => this.paintCell(t.cell(), this.theme.territoryColor(event.unit.owner().info()), 255));
        } else {
            trail.forEach(t => this.clearCell(t.cell()));
            this.boatToTrail.delete(event.unit);
        }
    }

    paintCell(cell: Cell, color: Colord, alpha: number) {
        this.clearCell(cell)
        this.context.fillStyle = color.alpha(alpha / 255).toRgbString();
        this.context.fillRect(cell.x, cell.y, 1, 1);
    }

    clearCell(cell: Cell) {
        this.context.clearRect(cell.x, cell.y, 1, 1);
    }
}