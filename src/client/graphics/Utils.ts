
export function renderTroops(troops: number): string {
    let troopsStr = ''

    troops = troops / 10

    if (troops > 100000) {
        troopsStr = String(Math.floor(troops / 1000)) + "K"
    } else if (troops > 10000) {
        troopsStr = String((troops / 1000).toFixed(1)) + "K"
    } else if (troops > 1000) {
        troopsStr = String((troops / 1000).toFixed(2)) + "K"
    }
    else {
        troopsStr = String(Math.floor(troops))
    }
    return troopsStr
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
