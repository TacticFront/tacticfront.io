import { Colord } from "colord";
import { Theme } from "../../../core/configuration/Config";
import { Unit, UnitEvent, Cell, Game, Tile, UnitType, Player } from "../../../core/game/Game";
import { bfs, dist, euclDist } from "../../../core/Util";
import { Layer } from "./Layer";
import { EventBus } from "../../../core/EventBus";
import { AlternateViewEvent } from "../../InputHandler";
import { ClientID } from "../../../core/Schemas";

enum Relationship {
    Self,
    Ally,
    Enemy
}

export class UnitLayer implements Layer {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    private boatToTrail = new Map<Unit, Set<Tile>>();

    private theme: Theme = null;

    private alternateView = false

    private myPlayer: Player | null = null

    private oldShellTile = new Map<Unit, Tile>()


    constructor(private game: Game, private eventBus: EventBus, private clientID: ClientID) {
        this.theme = game.config().theme();
    }


    shouldTransform(): boolean {
        return true;
    }

    tick() {
        if (this.myPlayer == null) {
            this.myPlayer = this.game.playerByClientID(this.clientID)
        }
    }

    init(game: Game) {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext("2d");

        this.canvas.width = this.game.width();
        this.canvas.height = this.game.height();

        this.eventBus.on(UnitEvent, e => this.onUnitEvent(e));
        this.eventBus.on(AlternateViewEvent, e => this.onAlternativeViewEvent(e))
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

    onAlternativeViewEvent(event: AlternateViewEvent) {
        this.alternateView = event.alternateView
        this.redraw()
    }


    redraw() {
        for (const unit of this.game.units()) {
            this.onUnitEvent(new UnitEvent(unit, unit.tile()))
        }
    }

    private relationship(unit: Unit): Relationship {
        if (this.myPlayer == null) {
            return Relationship.Enemy
        }
        if (this.myPlayer == unit.owner()) {
            return Relationship.Self
        }
        if (this.myPlayer.isAlliedWith(unit.owner())) {
            return Relationship.Ally
        }
        return Relationship.Enemy
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
        const rel = this.relationship(event.unit)
        bfs(event.oldTile, euclDist(event.oldTile, 4)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (!event.unit.isActive()) {
            return
        }
        bfs(event.unit.tile(), euclDist(event.unit.tile(), 4))
            .forEach(t => this.paintCell(t.cell(), rel, this.theme.borderColor(event.unit.owner().info()), 255));
        bfs(event.unit.tile(), dist(event.unit.tile(), 3))
            .forEach(t => this.paintCell(t.cell(), rel, this.theme.territoryColor(event.unit.owner().info()), 255));
    }

    private handleBattleshipEvent(event: UnitEvent) {
        const rel = this.relationship(event.unit)
        bfs(event.oldTile, euclDist(event.oldTile, 6)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (!event.unit.isActive()) {
            return
        }
        bfs(event.unit.tile(), euclDist(event.unit.tile(), 5))
            .forEach(t => this.paintCell(t.cell(), rel, this.theme.territoryColor(event.unit.owner().info()), 255));
        bfs(event.unit.tile(), dist(event.unit.tile(), 4))
            .forEach(t => this.paintCell(t.cell(), rel, this.theme.borderColor(event.unit.owner().info()), 255));
        bfs(event.unit.tile(), euclDist(event.unit.tile(), 1))
            .forEach(t => this.paintCell(t.cell(), rel, this.theme.territoryColor(event.unit.owner().info()), 255));
    }

    private handleShellEvent(event: UnitEvent) {
        const rel = this.relationship(event.unit)

        this.clearCell(event.oldTile.cell())
        if (this.oldShellTile.has(event.unit)) {
            this.clearCell(this.oldShellTile.get(event.unit).cell())
        }

        this.oldShellTile.set(event.unit, event.oldTile)
        if (!event.unit.isActive()) {
            return
        }
        this.paintCell(event.unit.tile().cell(), rel, this.theme.borderColor(event.unit.owner().info()), 255)
        this.paintCell(event.oldTile.cell(), rel, this.theme.borderColor(event.unit.owner().info()), 255)
    }


    private handleNuke(event: UnitEvent) {
        const rel = this.relationship(event.unit)
        bfs(event.oldTile, euclDist(event.oldTile, 2)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (event.unit.isActive()) {
            bfs(event.unit.tile(), euclDist(event.unit.tile(), 2))
                .forEach(t => this.paintCell(t.cell(), rel, this.theme.borderColor(event.unit.owner().info()), 255));
        }

    }

    private handleTradeShipEvent(event: UnitEvent) {
        const rel = this.relationship(event.unit)
        bfs(event.oldTile, euclDist(event.oldTile, 3)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (event.unit.isActive()) {
            bfs(event.unit.tile(), dist(event.unit.tile(), 2))
                .forEach(t => this.paintCell(t.cell(), rel, this.theme.territoryColor(event.unit.owner().info()), 255));
        }
        if (event.unit.isActive()) {
            bfs(event.unit.tile(), dist(event.unit.tile(), 1))
                .forEach(t => this.paintCell(t.cell(), rel, this.theme.borderColor(event.unit.owner().info()), 255));
        }
    }

    private handleBoatEvent(event: UnitEvent) {
        const rel = this.relationship(event.unit)
        if (!this.boatToTrail.has(event.unit)) {
            this.boatToTrail.set(event.unit, new Set<Tile>());
        }
        const trail = this.boatToTrail.get(event.unit);
        trail.add(event.oldTile);
        bfs(event.oldTile, dist(event.oldTile, 3)).forEach(t => {
            this.clearCell(t.cell());
        });
        if (event.unit.isActive()) {
            for (const t of trail) {
                this.paintCell(t.cell(), rel, this.theme.territoryColor(event.unit.owner().info()), 150);
            }
            bfs(event.unit.tile(), dist(event.unit.tile(), 2))
                .forEach(t => this.paintCell(t.cell(), rel, this.theme.borderColor(event.unit.owner().info()), 255));
            bfs(event.unit.tile(), dist(event.unit.tile(), 1))
                .forEach(t => this.paintCell(t.cell(), rel, this.theme.territoryColor(event.unit.owner().info()), 255));
        } else {
            trail.forEach(t => this.clearCell(t.cell()));
            this.boatToTrail.delete(event.unit);
        }
    }

    paintCell(cell: Cell, relationship: Relationship, color: Colord, alpha: number) {
        this.clearCell(cell)
        if (this.alternateView) {
            switch (relationship) {
                case Relationship.Self:
                    this.context.fillStyle = this.theme.selfColor().toRgbString()
                    break
                case Relationship.Ally:
                    this.context.fillStyle = this.theme.allyColor().toRgbString()
                    break
                case Relationship.Enemy:
                    this.context.fillStyle = this.theme.enemyColor().toRgbString()
                    break
            }
        } else {
            this.context.fillStyle = color.alpha(alpha / 255).toRgbString();
        }
        this.context.fillRect(cell.x, cell.y, 1, 1);
    }

    clearCell(cell: Cell) {
        this.context.clearRect(cell.x, cell.y, 1, 1);
    }
}