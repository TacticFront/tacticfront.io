
export function renderTroops(troops: number): string {
    return renderNumber(troops / 10)
}

export function renderNumber(num: number) {
    let numStr = ''
    if (num >= 10_000_000) {
        numStr = (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1_000_000) {
        numStr = (num / 1000000).toFixed(2) + "M"
    } else if (num >= 100000) {
        numStr = Math.floor(num / 1000) + "K"
    } else if (num >= 10000) {
        numStr = (num / 1000).toFixed(1) + "K"
    } else if (num >= 1000) {
        numStr = (num / 1000).toFixed(2) + "K"
    } else {
        numStr = Math.floor(num).toString()
    }
    return numStr
}

export function createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    // Set canvas style to fill the screen
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';

    return canvas
}

// WARNING: DO NOT EXPOSE THIS ID
export function getPersistentIDFromCookie(): string {
    const COOKIE_NAME = 'player_persistent_id';

    // Try to get existing cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim());
        if (cookieName === COOKIE_NAME) {
            return cookieValue;
        }
    }

    // If no cookie exists, create new ID and set cookie
    const newId = crypto.randomUUID(); // Using built-in UUID generator
    document.cookie = [
        `${COOKIE_NAME}=${newId}`,
        `max-age=${5 * 365 * 24 * 60 * 60}`, // 5 years
        'path=/',
        'SameSite=Strict',
        'Secure'
    ].join(';');

    return newId;
}