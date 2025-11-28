/**
 * Color utility functions for consistent color handling across the library.
 * Handles conversion between different color formats (0-1, 0-255, hex).
 * 
 * This is the JavaScript equivalent of kivg/color_utils.py
 */

/**
 * Normalize color to RGBA format with 0-255 range.
 * @param {number[]} color - Color as array (RGB or RGBA)
 * @param {string} inputRange - 'auto' (detect), '0-1', or '0-255'
 * @returns {number[]} RGBA array with values in 0-255 range
 */
function normalizeColor(color, inputRange = 'auto') {
    if (!color || color.length < 3) {
        return [0, 0, 0, 255];
    }

    let r = color[0];
    let g = color[1];
    let b = color[2];
    let a = color.length > 3 ? color[3] : 1.0;

    // Auto-detect range
    if (inputRange === 'auto') {
        // If all RGB values <= 1.0, assume 0-1 range
        if (Math.max(r, g, b) <= 1.0) {
            inputRange = '0-1';
        } else {
            inputRange = '0-255';
        }
    }

    // Convert to 0-255 range
    if (inputRange === '0-1') {
        r = Math.floor(r * 255);
        g = Math.floor(g * 255);
        b = Math.floor(b * 255);
        a = a <= 1.0 ? Math.floor(a * 255) : Math.floor(a);
    } else {
        r = Math.floor(r);
        g = Math.floor(g);
        b = Math.floor(b);
        a = Math.floor(a);
    }

    // Clamp values
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    a = Math.max(0, Math.min(255, a));

    return [r, g, b, a];
}

/**
 * Convert color to 0-1 range (Kivy style).
 * @param {number[]} color - RGBA color in any range
 * @returns {number[]} Array [r, g, b, a] in 0-1 range
 */
function colorTo01Range(color) {
    const rgba = normalizeColor(color);
    return [rgba[0] / 255.0, rgba[1] / 255.0, rgba[2] / 255.0, rgba[3] / 255.0];
}

/**
 * Convert hex color string to RGBA array (0-255 range).
 * @param {string} hexColor - Hex color string (e.g., '#FF0000', '#F00', 'FF0000')
 * @param {number} alpha - Alpha value (0.0-1.0 or 0-255)
 * @returns {number[]} RGBA array (0-255 range)
 */
function hexToRgba(hexColor, alpha = 1.0) {
    let hex = hexColor.replace('#', '');

    // Handle 3-character hex (e.g., 'F00' -> 'FF0000')
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    // Handle 4-character hex with alpha (e.g., 'F00F' -> 'FF0000FF')
    if (hex.length === 4) {
        hex = hex.split('').map(c => c + c).join('');
    }

    try {
        if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const a = alpha <= 1.0 ? Math.floor(alpha * 255) : Math.floor(alpha);
            return [r, g, b, a];
        } else if (hex.length === 8) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const a = parseInt(hex.substring(6, 8), 16);
            return [r, g, b, a];
        }
    } catch (e) {
        // Fall through to default
    }

    // Default: transparent white
    return [255, 255, 255, 0];
}

/**
 * Convert RGBA to BGRA (OpenCV format).
 * @param {number[]} color - RGBA array
 * @returns {number[]} BGRA array
 */
function rgbaToBgra(color) {
    return [color[2], color[1], color[0], color[3]];
}

/**
 * Apply additional opacity to a color.
 * @param {number[]} color - RGBA color
 * @param {number} opacity - Opacity multiplier (0.0-1.0)
 * @returns {number[]} RGBA color with modified alpha
 */
function applyOpacity(color, opacity) {
    opacity = Math.max(0.0, Math.min(1.0, opacity));
    const newAlpha = Math.floor(color[3] * opacity);
    return [color[0], color[1], color[2], newAlpha];
}

/**
 * Convert color from 0-1 range (SVG/Kivy style) to 0-255 RGBA array (OpenCV style).
 * @param {number[]|null} color - Color as array [r, g, b, a] in 0-1 range, or null
 * @returns {number[]|null} RGBA array with values in 0-255 range, or null if input is null
 */
function color01To0255(color) {
    if (color === null || color === undefined) {
        return null;
    }

    if (color.length < 3) {
        return null;
    }

    let r = Math.floor(color[0] * 255);
    let g = Math.floor(color[1] * 255);
    let b = Math.floor(color[2] * 255);
    let a = color.length > 3 ? Math.floor(color[3] * 255) : 255;

    // Clamp values
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    a = Math.max(0, Math.min(255, a));

    return [r, g, b, a];
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizeColor,
        colorTo01Range,
        hexToRgba,
        rgbaToBgra,
        applyOpacity,
        color01To0255
    };
}

if (typeof window !== 'undefined') {
    window.ColorUtils = {
        normalizeColor,
        colorTo01Range,
        hexToRgba,
        rgbaToBgra,
        applyOpacity,
        color01To0255
    };
}
