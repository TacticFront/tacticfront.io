import {EventBus} from "../../../core/EventBus";
import {Cell, Game, Player, PlayerID} from "../../../core/game/Game";
import {ClientID} from "../../../core/Schemas";
import {manhattanDist, manhattanDistWrapped, sourceDstOceanShore} from "../../../core/Util";
import {ContextMenuEvent, MouseUpEvent} from "../../InputHandler";
import {SendAllianceRequestIntentEvent, SendAttackIntentEvent, SendBoatAttackIntentEvent, SendBreakAllianceIntentEvent, SendSpawnIntentEvent, SendTargetPlayerIntentEvent} from "../../Transport";
import {TransformHandler} from "../TransformHandler";
import {MessageType} from "./EventsDisplay";
import {Layer} from "./Layer";
import * as d3 from 'd3';
import traitorIcon from '../../../../resources/images/TraitorIconWhite.png';
import allianceIcon from '../../../../resources/images/AllianceIconWhite.png';
import boatIcon from '../../../../resources/images/BoatIconWhite.png';
import swordIcon from '../../../../resources/images/SwordIconWhite.png';
import targetIcon from '../../../../resources/images/TargetIconWhite.png';


enum RadialElement {
    RequestAlliance,
    BreakAlliance,
    BoatAttack,
    Target,
}

enum Slot {
    Alliance,
    Boat,
    Target,
    FOURTH
}

export class RadialMenu implements Layer {
    private clickedCell: Cell | null = null

    private menuElement: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private isVisible: boolean = false;
    private readonly menuItems = new Map([
        [Slot.Alliance, {name: "alliance", disabled: true, action: () => { }, color: null, icon: null, defaultIcon: allianceIcon}],
        [Slot.Boat, {name: "boat", disabled: true, action: () => { }, color: null, icon: null, defaultIcon: boatIcon}],
        [Slot.Target, {name: "target", disabled: true, action: () => { }, defaultIcon: targetIcon}],

    ]);

    private readonly menuSize = 190;
    private readonly centerButtonSize = 30;
    private readonly iconSize = 32;
    private readonly centerIconSize = 48;
    private readonly disabledColor = d3.rgb(128, 128, 128).toString();

    private isCenterButtonEnabled = false


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
            .attr('fill', d => d.data.disabled ? this.disabledColor : d.data.color)
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
        arcs.append('image')
            .attr('xlink:href', d => d.data.icon)
            .attr('width', this.iconSize)
            .attr('height', this.iconSize)
            .attr('x', d => arc.centroid(d)[0] - this.iconSize / 2)
            .attr('y', d => arc.centroid(d)[1] - this.iconSize / 2)
            .style('pointer-events', 'none')
            .attr('data-name', d => d.data.name);

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

        // Replace text with sword icon
        centerButton.append('image')
            .attr('class', 'center-button-icon')
            .attr('xlink:href', swordIcon)
            .attr('width', this.centerIconSize)
            .attr('height', this.centerIconSize)
            .attr('x', -this.centerIconSize / 2)
            .attr('y', -this.centerIconSize / 2)
            .style('pointer-events', 'none');
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
        this.renderCenterButton(false)
        for (const item of this.menuItems.values()) {
            item.disabled = true
            item.icon = item.defaultIcon
            this.updateMenuItemState(item)
        }

        this.clickedCell = this.transformHandler.screenToWorldCoordinates(event.x, event.y)
        if (!this.game.isOnMap(this.clickedCell)) {
            return
        }
        const tile = this.game.tile(this.clickedCell)
        const other = tile.owner()

        if (this.game.inSpawnPhase()) {
            if (tile.isLand() && !tile.hasOwner()) {
                this.renderCenterButton(true)
            }
            return
        }

        const myPlayer = this.game.players().find(p => p.clientID() == this.clientID)
        if (!myPlayer) {
            console.warn('my player not found')
            return
        }

        if (tile.owner() != myPlayer && tile.isLand() && myPlayer.sharesBorderWith(other)) {
            if (!other.isPlayer() || !myPlayer.isAlliedWith(other)) {
                this.renderCenterButton(true)
            }
        }

        if (tile.hasOwner()) {
            const other = tile.owner() as Player
            if (other.clientID() == this.clientID) {
                return
            }

            if (myPlayer.isAlliedWith(other)) {
                this.activateMenuElement(Slot.Alliance, "#b1593f", traitorIcon, () => {
                    this.eventBus.emit(
                        new SendBreakAllianceIntentEvent(myPlayer, other)
                    )
                })
            } else if (!myPlayer.recentOrPendingAllianceRequestWith(other)) {
                this.activateMenuElement(Slot.Alliance, "#53ac75", allianceIcon, () => {
                    this.eventBus.emit(
                        new SendAllianceRequestIntentEvent(myPlayer, other)
                    )
                })
            }
            if (myPlayer.canTarget(other)) {
                this.activateMenuElement(Slot.Target, "#c74848", targetIcon, () => {
                    this.eventBus.emit(
                        new SendTargetPlayerIntentEvent(other.id())
                    )
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
                if (manhattanDistWrapped(src.cell(), dst.cell(), this.game.width()) < this.game.config().boatMaxDistance()) {
                    this.activateMenuElement(Slot.Boat, "#3f6ab1", boatIcon, () => {
                        this.eventBus.emit(
                            new SendBoatAttackIntentEvent(other.id(), this.clickedCell, null)
                        )
                    })
                }
            }
        }
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
        if (!this.isCenterButtonEnabled) {
            return
        }
        console.log('Center button clicked');
        const clicked = this.game.tile(this.clickedCell)
        if (this.game.inSpawnPhase()) {
            this.eventBus.emit(new SendSpawnIntentEvent(this.clickedCell))
        } else {
            if (clicked.owner().clientID() != this.clientID) {
                this.eventBus.emit(new SendAttackIntentEvent(clicked.owner().id()))
            }
        }
        this.hideRadialMenu();
    }

    private activateMenuElement(slot: Slot, color: string, icon: string, action: () => void) {
        const menuItem = this.menuItems.get(slot)
        menuItem.action = action
        menuItem.disabled = false
        menuItem.color = color
        menuItem.icon = icon
        this.updateMenuItemState(menuItem)
    }

    private updateMenuItemState(item: any) {
        const menuItem = this.menuElement.select(`path[data-name="${item.name}"]`);
        menuItem
            .attr('fill', item.disabled ? this.disabledColor : item.color)
            .style('cursor', item.disabled ? 'not-allowed' : 'pointer')
            .style('opacity', item.disabled ? 0.5 : 1);

        this.menuElement.select(`image[data-name="${item.name}"]`)
            .attr('xlink:href', item.icon || item.defaultIcon)
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

    private renderCenterButton(enabled: boolean) {
        this.isCenterButtonEnabled = enabled
        // Add delay so center button is clicked immediately on creation.
        setTimeout(() => {
            const centerButton = this.menuElement.select('.center-button');

            centerButton.select('.center-button-hitbox')
                .style('cursor', enabled ? 'pointer' : 'not-allowed');

            centerButton.select('.center-button-visible')
                .attr('fill', enabled ? '#2c3e50' : '#999999');

            centerButton.select('.center-button-text')
                .attr('fill', enabled ? 'white' : '#cccccc');
        }, 25);
    }
}
