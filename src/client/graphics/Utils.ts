
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
