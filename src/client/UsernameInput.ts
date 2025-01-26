import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { v4 as uuidv4 } from 'uuid';
import { MAX_USERNAME_LENGTH, validateUsername } from '../core/validations/username';

const usernameKey: string = 'username';

@customElement('username-input')
export class UsernameInput extends LitElement {
    @state() private username: string = '';
    @property({ type: String }) validationError: string = '';

    private _isValid: boolean = true

    static styles = css`
        input {
            width: 15rem;
            padding: .5rem;
            background-color: white;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            font-size: 1rem;
            line-height: 1.5;
            color: #111827;
            text-align: center;
        }
        input:focus {
            outline: none;
            ring: 2px;
            ring-color: #3b82f6;
            border-color: #3b82f6;
        }
        .error {
            color: #dc2626;
            background-color: #fff;
            padding: 4px;
            font-size: 0.875rem;
            border: 1px solid #dc2626;
            margin-top: 0.5rem;
        }
    `;

    public getCurrentUsername(): string {
        return this.username;
    }

    connectedCallback() {
        super.connectedCallback();
        this.username = this.getStoredUsername();
        this.dispatchUsernameEvent();
    }

    render() {
        return html`
            <input 
                type="text" 
                .value=${this.username}
                @input=${this.handleChange}
                @change=${this.handleChange}
                placeholder="Enter your username"
                maxlength="${MAX_USERNAME_LENGTH}"
            >
            ${this.validationError
                ? html`<div class="error">${this.validationError}</div>`
                : null}
        `;
    }

    private handleChange(e: Event) {
        const input = e.target as HTMLInputElement;
        this.username = input.value.trim();


        const result = validateUsername(this.username)
        this._isValid = result.isValid
        if (result.isValid) {
            this.storeUsername(this.username);
            this.validationError = ''
        } else {
            this.validationError = result.error
        }
    }

    private getStoredUsername(): string {
        const storedUsername = localStorage.getItem(usernameKey);
        if (storedUsername) {
            return storedUsername;
        }
        return this.generateNewUsername();
    }

    private storeUsername(username: string) {
        if (username) {
            localStorage.setItem(usernameKey, username);
        }
    }

    private dispatchUsernameEvent() {
        this.dispatchEvent(new CustomEvent('username-change', {
            detail: { username: this.username },
            bubbles: true,
            composed: true
        }));
    }

    private generateNewUsername(): string {
        const newUsername = "Anon" + this.uuidToThreeDigits();
        this.storeUsername(newUsername);
        return newUsername;
    }

    private uuidToThreeDigits(): string {
        const uuid = uuidv4();
        const cleanUuid = uuid.replace(/-/g, '').toLowerCase();
        const decimal = BigInt(`0x${cleanUuid}`);
        const threeDigits = decimal % 1000n;
        return threeDigits.toString().padStart(3, '0');
    }

    public isValid(): boolean {
        return true
        return this._isValid
    }
}