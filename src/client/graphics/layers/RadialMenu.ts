import {EventBus} from "../../../core/EventBus";
import {Cell, Game, Player, PlayerID} from "../../../core/game/Game";
import {ClientID} from "../../../core/Schemas";
import {ContextMenuEvent, MouseUpEvent} from "../../InputHandler";
import {SendAllianceRequestIntentEvent, SendAttackIntentEvent, SendBreakAllianceIntentEvent} from "../../Transport";
import {TransformHandler} from "../TransformHandler";
import {MessageType} from "./EventsDisplay";
import {Layer} from "./Layer";
import * as d3 from 'd3';

enum RadialElement {
    RequestAlliance,
    BreakAlliance,
    BoatAttack
}

export class RadialMenu implements Layer {
    private clickedCell: Cell | null = null

    private menuElement: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private isVisible: boolean = false;
    private readonly menuItems = new Map([
        [RadialElement.RequestAlliance, {name: "alliance", color: "#3498db", disabled: true, action: () => { }}],
        [RadialElement.BreakAlliance, {name: "breakAlliance", color: "#3498db", disabled: true, action: () => { }}],
        [RadialElement.BoatAttack, {name: "boat", color: "#3498db", disabled: true, action: () => { }}],
    ]);
    private readonly menuSize = 190;
    private readonly centerButtonSize = 30;

    constructor(
        private eventBus: EventBus,
        private game: Game,
        private transformHandler: TransformHandler,
        private clientID: ClientID,
    ) { }

    init() {
        this.eventBus.on(ContextMenuEvent, e => this.onContextMenu(e))
        this.eventBus.on(MouseUpEvent, e => this.onPointerUp(e))
        this.createMenuElement();
    }

    private createMenuElement() {
        this.menuElement = d3.select(document.body)
            .append('div')
            .style('position', 'fixed')
            .style('display', 'none')
            .style('z-index', '9999')
            .style('touch-action', 'none');

        const svg = this.menuElement.append('svg')
            .attr('width', this.menuSize)
            .attr('height', this.menuSize)
            .append('g')
            .attr('transform', `translate(${this.menuSize / 2},${this.menuSize / 2})`);

        const pie = d3.pie<any>()
            .value(() => 1)
            .padAngle(0.03);

        const arc = d3.arc<any>()
            .innerRadius(this.centerButtonSize + 5)
            .outerRadius(this.menuSize / 2 - 10);

        const arcs = svg.selectAll('path')
            .data(pie(Array.from(this.menuItems.values())))
            .enter()
            .append('g');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.disabled ? this.getDisabledColor(d.data.color) : d.data.color)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', '2')
            .style('cursor', d => d.data.disabled ? 'not-allowed' : 'pointer')
            .style('opacity', d => d.data.disabled ? 0.5 : 1)
            .attr('data-name', d => d.data.name)
            .on('mouseover', function (event, d) {
                if (!d.data.disabled) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('transform', 'scale(1.05)')
                        .attr('filter', 'url(#glow)');
                }
            })
            .on('mouseout', function (event, d) {
                if (!d.data.disabled) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('transform', 'scale(1)')
                        .attr('filter', null);
                }
            })
            .on('click', (event, d) => {
                if (!d.data.disabled) {
                    d.data.action();
                    this.hideRadialMenu();
                }
            })
            .on('touchstart', (event, d) => {
                event.preventDefault();
                if (!d.data.disabled) {
                    d.data.action();
                    this.hideRadialMenu();
                }
            });

        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('fill', d => d.data.disabled ? '#999999' : 'white')
            .style('font-size', '14px')
            .style('pointer-events', 'none')
            .attr('data-name', d => d.data.name)
            .text(d => d.data.name);

        // Add glow filter
        const defs = svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'glow');
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode')
            .attr('in', 'coloredBlur');
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');

        // Create a larger, transparent circle for better click detection
        svg.append('circle')
            .attr('r', this.centerButtonSize)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', () => this.handleCenterButtonClick())
            .on('touchstart', (event) => {
                event.preventDefault();
                this.handleCenterButtonClick();
            });

        // Add visible center button circle
        svg.append('circle')
            .attr('r', this.centerButtonSize)
            .attr('fill', '#2c3e50')
            .style('pointer-events', 'none');

        // Add text to the center button
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .attr('fill', 'white')
            .style('font-size', '16px')
            .style('pointer-events', 'none')
            .text('Attack');
    }

    tick() {
        // Update logic if needed
    }

    render(context: CanvasRenderingContext2D) {
        // No need to render anything on the canvas
    }

    shouldTransform(): boolean {
        return false;
    }

    private onContextMenu(event: ContextMenuEvent) {
        if (this.isVisible) {
            this.hideRadialMenu()
            return
        } else {
            this.showRadialMenu(event.x, event.y);
        }
        for (const item of this.menuItems.values()) {
            item.disabled = true
            this.updateMenuItemState(item)
        }

        const cell = this.transformHandler.screenToWorldCoordinates(event.x, event.y)
        if (!this.game.isOnMap(cell)) {
            return
        }
        const tile = this.game.tile(cell)
        if (!tile.hasOwner()) {
            return
        }
        const owner = tile.owner() as Player
        if (owner.clientID() == this.clientID) {
            return
        }
        const myPlayer = this.game.players().find(p => p.clientID() == this.clientID)
        if (!myPlayer) {
            console.warn('my player not found')
            return
        }

        if (myPlayer.pendingAllianceRequestWith(owner)) {
            return
        }

        if (myPlayer.isAlliedWith(owner)) {
            this.activateMenuElement(RadialElement.BreakAlliance, () => {
                this.eventBus.emit(
                    new SendBreakAllianceIntentEvent(myPlayer, owner)
                )
            })
        } else {
            this.activateMenuElement(RadialElement.RequestAlliance, () => {
                this.eventBus.emit(
                    new SendAllianceRequestIntentEvent(myPlayer, owner)
                )
                this.game.displayMessage(`sending alliance request to ${owner.name()}`, MessageType.INFO, myPlayer.id())
            })
        }
    }

    private activateMenuElement(el: RadialElement, action: () => void) {
        const menuItem = this.menuItems.get(el)
        menuItem.action = action
        menuItem.disabled = false
        this.updateMenuItemState(menuItem)
    }

    private onPointerUp(event: MouseUpEvent) {
        this.hideRadialMenu()
    }

    private showRadialMenu(x: number, y: number) {
        this.menuElement
            .style('left', `${x - this.menuSize / 2}px`)
            .style('top', `${y - this.menuSize / 2}px`)
            .style('display', 'block');
        this.isVisible = true;
    }

    private hideRadialMenu() {
        this.menuElement.style('display', 'none');
        this.isVisible = false;
    }

    private handleCenterButtonClick() {
        console.log('Center button clicked');
        const clicked = this.game.tile(this.clickedCell)
        if (clicked.owner().clientID() != this.clientID) {
            this.eventBus.emit(new SendAttackIntentEvent(clicked.owner().id()))
        }
        this.hideRadialMenu();
    }

    private updateMenuItemState(item: any) {
        this.menuElement.select(`path[data-name="${item.name}"]`)
            .attr('fill', item.disabled ? this.getDisabledColor(item.color) : item.color)
            .style('cursor', item.disabled ? 'not-allowed' : 'pointer')
            .style('opacity', item.disabled ? 0.5 : 1);

        this.menuElement.select(`text[data-name="${item.name}"]`)
            .attr('fill', item.disabled ? '#999999' : 'white');
    }

    private getDisabledColor(color: string): string {
        const rgb = d3.rgb(color);
        const gray = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
        return d3.rgb(gray, gray, gray).toString();
    }
}