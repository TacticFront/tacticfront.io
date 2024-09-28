import {EventBus} from "../../../core/EventBus";
import {Cell, Game, Player, PlayerID} from "../../../core/game/Game";
import {ClientID} from "../../../core/Schemas";
import {manhattanDist, sourceDstOceanShore} from "../../../core/Util";
import {ContextMenuEvent, MouseUpEvent} from "../../InputHandler";
import {SendAllianceRequestIntentEvent, SendAttackIntentEvent, SendBoatAttackIntentEvent, SendBreakAllianceIntentEvent} from "../../Transport";
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
    private isCenterButtonEnabled = false

    private menuElement: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private isVisible: boolean = false;
    private readonly menuItems = new Map([
        [RadialElement.RequestAlliance, {name: "alliance", color: "#3498db", disabled: true, action: () => { }}],
        [RadialElement.BoatAttack, {name: "boat", color: "#3498db", disabled: true, action: () => { }}],
        [RadialElement.BreakAlliance, {name: "breakAlliance", color: "#3498db", disabled: true, action: () => { }}],
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

        const centerButton = svg.append('g')
            .attr('class', 'center-button');

        centerButton.append('circle')
            .attr('class', 'center-button-hitbox')
            .attr('r', this.centerButtonSize)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', () => this.handleCenterButtonClick())
            .on('touchstart', (event: Event) => {
                event.preventDefault();
                this.handleCenterButtonClick();
            })
            .on('mouseover', () => this.onCenterButtonHover(true))
            .on('mouseout', () => this.onCenterButtonHover(false));

        centerButton.append('circle')
            .attr('class', 'center-button-visible')
            .attr('r', this.centerButtonSize)
            .attr('fill', '#2c3e50')
            .style('pointer-events', 'none');

        centerButton.append('text')
            .attr('class', 'center-button-text')
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
        this.isCenterButtonEnabled = false
        this.updateCenterButtonState()
        for (const item of this.menuItems.values()) {
            item.disabled = true
            this.updateMenuItemState(item)
        }
        const myPlayer = this.game.players().find(p => p.clientID() == this.clientID)
        if (!myPlayer) {
            console.warn('my player not found')
            return
        }

        this.clickedCell = this.transformHandler.screenToWorldCoordinates(event.x, event.y)
        if (!this.game.isOnMap(this.clickedCell)) {
            return
        }
        const tile = this.game.tile(this.clickedCell)
        const other = tile.owner()

        if (tile.owner() != myPlayer && tile.isLand() && myPlayer.sharesBorderWith(other)) {
            if (!other.isPlayer() || !myPlayer.isAlliedWith(other)) {
                this.isCenterButtonEnabled = true
                this.updateCenterButtonState()
            }
        }

        if (tile.hasOwner()) {
            const other = tile.owner() as Player
            if (other.clientID() == this.clientID) {
                return
            }

            if (myPlayer.pendingAllianceRequestWith(other)) {
                return
            }

            if (myPlayer.isAlliedWith(other)) {
                this.activateMenuElement(RadialElement.BreakAlliance, () => {
                    this.eventBus.emit(
                        new SendBreakAllianceIntentEvent(myPlayer, other)
                    )
                })
            } else {
                this.activateMenuElement(RadialElement.RequestAlliance, () => {
                    this.eventBus.emit(
                        new SendAllianceRequestIntentEvent(myPlayer, other)
                    )
                    this.game.displayMessage(`sending alliance request to ${other.name()}`, MessageType.INFO, myPlayer.id())
                })
            }
        }

        if (!tile.isLand()) {
            return
        }
        if (myPlayer.boats().length >= this.game.config().boatMaxNumber()) {
            return
        }

        let myPlayerBordersOcean = false
        for (const bt of myPlayer.borderTiles()) {
            if (bt.isOceanShore()) {
                myPlayerBordersOcean = true
                break
            }
        }
        let otherPlayerBordersOcean = false
        if (!tile.hasOwner()) {
            otherPlayerBordersOcean = true
        } else {
            for (const bt of (other as Player).borderTiles()) {
                if (bt.isOceanShore()) {
                    otherPlayerBordersOcean = true
                    break
                }
            }
        }

        if (other.isPlayer() && myPlayer.allianceWith(other)) {
            return
        }

        if (myPlayerBordersOcean && otherPlayerBordersOcean) {
            const [src, dst] = sourceDstOceanShore(this.game, myPlayer, other, this.clickedCell)
            if (src != null && dst != null) {
                if (manhattanDist(src.cell(), dst.cell()) < this.game.config().boatMaxDistance()) {
                    this.activateMenuElement(RadialElement.BoatAttack, () => {
                        this.eventBus.emit(
                            new SendBoatAttackIntentEvent(other.id(), this.clickedCell, null)
                        )
                    })
                }
            }
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

    private onCenterButtonHover(isHovering: boolean) {
        if (!this.isCenterButtonEnabled) return;

        const scale = isHovering ? 1.2 : 1;
        const fontSize = isHovering ? '18px' : '16px';

        this.menuElement.select('.center-button-hitbox').transition().duration(200).attr('r', this.centerButtonSize * scale);
        this.menuElement.select('.center-button-visible').transition().duration(200).attr('r', this.centerButtonSize * scale);
        this.menuElement.select('.center-button-text').transition().duration(200).style('font-size', fontSize);
    }

    private updateCenterButtonState() {
        const centerButton = this.menuElement.select('.center-button');

        centerButton.select('.center-button-hitbox')
            .style('cursor', this.isCenterButtonEnabled ? 'pointer' : 'not-allowed');

        centerButton.select('.center-button-visible')
            .attr('fill', this.isCenterButtonEnabled ? '#2c3e50' : '#999999');

        centerButton.select('.center-button-text')
            .attr('fill', this.isCenterButtonEnabled ? 'white' : '#cccccc');
    }

    private getDisabledColor(color: string): string {
        const rgb = d3.rgb(color);
        const gray = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
        return d3.rgb(gray, gray, gray).toString();
    }
}
