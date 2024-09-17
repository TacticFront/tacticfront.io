import {Theme} from "../../../core/configuration/Config";
import {EventBus} from "../../../core/EventBus";
import {WinEvent} from "../../../core/execution/WinCheckExecution";
import {Game, Player} from "../../../core/Game";
import {ClientID} from "../../../core/Schemas";
import {renderTroops} from "../Utils";
import winModalHtml from '../WinModal.html';
import {RightClickEvent} from "../../InputHandler";
import {Layer} from "./Layer";
import {TransformHandler} from "../TransformHandler";


interface MenuOption {
    label: string;
    action: () => void;
}

export class UILayer implements Layer {
    private exitButton: HTMLButtonElement;
    private winModal: HTMLElement | null = null;

    private customMenu = document.getElementById('customMenu');


    constructor(private eventBus: EventBus, private game: Game, private theme: Theme, private clientID: ClientID, private transformHandler: TransformHandler) {

    }
    render(context: CanvasRenderingContext2D) {
        if (!this.game.inSpawnPhase()) {
            return
        }

        const barHeight = 15;
        const barBackgroundWidth = this.transformHandler.width();

        const ratio = this.game.ticks() / this.game.config().numSpawnPhaseTurns()

        // Draw bar background
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, barBackgroundWidth, barHeight);

        context.fillStyle = 'rgba(0, 128, 255, 0.7)';
        context.fillRect(0, 0, barBackgroundWidth * ratio, barHeight);
    }

    shouldTransform(): boolean {
        return false
    }

    tick() {
    }

    init() {
        this.createExitButton()
        this.createWinModal()
        this.initRightClickMenu()
        this.eventBus.on(WinEvent, (e) => this.onWinEvent(e))
        this.eventBus.on(RightClickEvent, (e) => this.onRightClick(e))
    }

    initRightClickMenu() {
        if (!this.customMenu) {
            console.error('Custom menu not found');
            return;
        }

        document.addEventListener('click', () => {
            this.customMenu!.style.display = 'none';
        });

        const menuItems = this.customMenu.querySelectorAll('li');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                alert(`You clicked: ${item.textContent}`);
                this.customMenu!.style.display = 'none';
            });
        });
    }

    createWinModal() {
        console.log("Creating win modal");
        this.winModal = document.createElement('div');
        this.winModal.style.cssText = `
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border: 2px solid black;
            border-radius: 10px;
            z-index: 2000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        const content = document.createElement('div');

        const title = document.createElement('h2');
        title.textContent = 'Game Over';
        title.id = 'winTitle';
        title.style.marginTop = '0';

        const message = document.createElement('p');
        message.id = 'winMessage';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        buttonContainer.style.marginTop = '20px';

        const exitButton = document.createElement('button');
        exitButton.textContent = 'Exit Game';
        exitButton.onclick = () => this.exitGame();
        this.styleButton(exitButton);

        const continueButton = document.createElement('button');
        continueButton.textContent = 'Keep Playing';
        continueButton.onclick = () => this.closeWinModal();
        this.styleButton(continueButton);

        buttonContainer.appendChild(exitButton);
        buttonContainer.appendChild(continueButton);

        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(buttonContainer);

        this.winModal.appendChild(content);
        document.body.appendChild(this.winModal);

        console.log("Win modal appended to body");
    }

    styleButton(button: HTMLButtonElement) {
        button.style.cssText = `
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            background-color: #4A90E2;
            color: white;
            border: none;
            border-radius: 5px;
            transition: background-color 0.3s;
        `;
        button.onmouseover = () => button.style.backgroundColor = '#3A7BCE';
        button.onmouseout = () => button.style.backgroundColor = '#4A90E2';
    }

    createExitButton() {
        this.exitButton = document.createElement('button');
        this.exitButton.innerHTML = '&#10005;'; // HTML entity for "×" (multiplication sign)
        this.exitButton.style.position = 'fixed';
        this.exitButton.style.top = '20px';
        this.exitButton.style.right = '20px';
        this.exitButton.style.zIndex = '1000';
        this.exitButton.style.width = '40px';
        this.exitButton.style.height = '40px';
        this.exitButton.style.fontSize = '20px';
        this.exitButton.style.fontWeight = 'bold';
        this.exitButton.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; // More translucent red
        this.exitButton.style.color = 'white';
        this.exitButton.style.border = 'none';
        this.exitButton.style.borderRadius = '50%';
        this.exitButton.style.cursor = 'pointer';
        this.exitButton.style.display = 'flex';
        this.exitButton.style.justifyContent = 'center';
        this.exitButton.style.alignItems = 'center';
        this.exitButton.style.transition = 'background-color 0.3s';

        this.exitButton.addEventListener('mouseover', () => {
            this.exitButton.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // Less translucent on hover
        });

        this.exitButton.addEventListener('mouseout', () => {
            this.exitButton.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'; // Back to more translucent
        });

        this.exitButton.addEventListener('click', () => this.onExitButtonClick());
        document.body.appendChild(this.exitButton);
    }


    onWinEvent(event: WinEvent) {
        console.log(`${event.winner.name()} won the game!!}`)
        this.showWinModal(event.winner)
    }

    showWinModal(winner: Player) {
        if (this.winModal) {
            const message = this.winModal.querySelector('#winMessage');
            if (message) {
                message.textContent = `${winner.name()} won the game!`;
            }
            const title = this.winModal.querySelector('#winTitle')
            if (winner.clientID() == this.clientID) {
                title.textContent = 'You Won!!!'
            } else {
                title.textContent = 'You Lost!!!'
            }
            this.winModal.style.display = 'block';
        }
    }

    onExitButtonClick() {
        console.log('Button clicked!');
        window.location.reload();
    }

    closeWinModal() {
        if (this.winModal) {
            this.winModal.style.display = 'none';
        }
    }

    exitGame() {
        this.closeWinModal();
        window.location.reload();
    }

    private onRightClick(e: RightClickEvent) {
        const cell = this.transformHandler.screenToWorldCoordinates(e.x, e.y)
        const tile = this.game.tile(cell)
        if (!tile.hasOwner()) {
            return
        }
        const owner = tile.owner() as Player
        if (owner.clientID() == this.clientID) {
            return
        }

        this.customMenu!.style.display = 'block';
        this.customMenu!.style.left = `${e.x}px`;
        this.customMenu!.style.top = `${e.y}px`;
        this.populateMenu([
            {
                label: "Request Alliance",
                action: (): void => { },
            }
        ])
    }

    private populateMenu(options: MenuOption[]) {
        if (!this.customMenu) return;

        // Clear existing menu items
        this.customMenu.innerHTML = '';

        // Create new menu items
        const ul = document.createElement('ul');
        options.forEach(option => {
            const li = document.createElement('li');
            li.textContent = option.label;
            li.onclick = () => {
                option.action();
                this.hideMenu();
            };
            ul.appendChild(li);
        });

        this.customMenu.appendChild(ul);
    }

    private hideMenu() {
        if (this.customMenu) {
            this.customMenu.style.display = 'none';
        }
    }

}