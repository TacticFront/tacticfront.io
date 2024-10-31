import twemoji from 'twemoji';
import DOMPurify from 'dompurify';

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

export function processName(name: string): string {
  const sanitized = Array.from(name).slice(0, 10).join('').replace(/[^\p{L}\p{N}\s\p{Emoji}\p{Emoji_Component}]/gu, '');

  // First sanitize the raw input - strip everything except text and emojis
  const withEmojis = twemoji.parse(sanitized, {
    base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',  // Use jsDelivr CDN
    folder: 'svg',  // or 'png' if you prefer
    ext: '.svg'     // or '.png' if you prefer
  });
  return DOMPurify.sanitize(withEmojis, {
    ALLOWED_TAGS: ['img'],
    ALLOWED_ATTR: ['src', 'alt', 'class'],
    // Only allow twemoji CDN URLs
    ALLOWED_URI_REGEXP: /^https:\/\/cdn\.jsdelivr\.net\/gh\/twitter\/twemoji/
  });

}