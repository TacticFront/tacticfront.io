import {Colord} from "colord";
import {Cell, Game, PlayerEvent, Tile, TileEvent, Player, Execution, BoatEvent} from "../../core/Game";
import {Theme} from "../../core/configuration/Config";
import {DragEvent, ZoomEvent} from "../InputHandler";
import {NameRenderer} from "./NameRenderer";
import {TerrainRenderer} from "./TerrainRenderer";
import {TerritoryRenderer} from "./TerritoryRenderer";
import {ClientID} from "../../core/Schemas";
import {createCanvas, renderTroops} from "./Utils";
import {UIRenderer} from "./UIRenderer";
import {EventBus} from "../../core/EventBus";
import {TransformHandler} from "./TransformHandler";
import {Layer} from "./Layer";


export function createRenderer(game: Game, eventBus: EventBus, clientID: ClientID): GameRenderer {
	const canvas = createCanvas()
	const transformHandler = new TransformHandler(game, eventBus, canvas.getBoundingClientRect())

	const layers: Layer[] = [
		new TerrainRenderer(game),
		new TerritoryRenderer(game, eventBus),
		new NameRenderer(game, game.config().theme()),
		new UIRenderer(eventBus, game, game.config().theme(), clientID)
	]

	return new GameRenderer(game, eventBus, canvas, transformHandler, layers)
}


export class GameRenderer {

	private context: CanvasRenderingContext2D

	constructor(private game: Game, private eventBus: EventBus, private canvas: HTMLCanvasElement, public transformHandler: TransformHandler, private layers: Layer[]) {
		this.context = canvas.getContext("2d")
	}

	initialize() {
		this.layers.forEach(l => l.init())

		document.body.appendChild(this.canvas);
		window.addEventListener('resize', () => this.resizeCanvas());
		this.resizeCanvas();

		this.transformHandler = new TransformHandler(this.game, this.eventBus, this.canvas.getBoundingClientRect())

		requestAnimationFrame(() => this.renderGame());
	}

	resizeCanvas() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		//this.redraw()
	}

	renderGame() {
		// Set background
		this.context.fillStyle = this.game.config().theme().backgroundColor().toHex();
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Save the current context state
		this.context.save();

		this.transformHandler.handleTransform(this.context)

		this.layers.forEach(l => {
			if (l.shouldTransform()) {
				l.render(this.context, this.transformHandler)
			}
		})

		this.context.restore()

		this.layers.forEach(l => {
			if (!l.shouldTransform()) {
				l.render(this.context, this.transformHandler)
			}
		})

		this.renderSpawnBar()

		requestAnimationFrame(() => this.renderGame());
	}

	// TODO: move to UIRenderer
	renderSpawnBar() {
		if (!this.game.inSpawnPhase()) {
			return
		}

		const barHeight = 15;
		const barBackgroundWidth = this.canvas.width;

		const ratio = this.game.ticks() / this.game.config().numSpawnPhaseTurns()

		// Draw bar background
		this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
		this.context.fillRect(0, 0, barBackgroundWidth, barHeight);

		this.context.fillStyle = 'rgba(0, 128, 255, 0.7)';
		this.context.fillRect(0, 0, barBackgroundWidth * ratio, barHeight);
	}

	tick() {
		this.layers.forEach(l => l.tick())
	}

	resize(width: number, height: number): void {
		this.canvas.width = Math.ceil(width / window.devicePixelRatio);
		this.canvas.height = Math.ceil(height / window.devicePixelRatio);
	}

}