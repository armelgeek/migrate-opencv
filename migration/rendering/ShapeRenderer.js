/**
 * Shape rendering (polygon filling) for OpenCV.js-based SVG rendering.
 * Replaces kivy.graphics.Mesh and Tesselator.
 * 
 * This is the JavaScript equivalent of kivg/rendering/shape_renderer.py
 */

const { normalizeColor } = require('../utils/ColorUtils.js');

/**
 * Handler for rendering filled shapes using OpenCV.js.
 */
class ShapeRenderer {
    /**
     * Render filled shapes onto the canvas with hole support.
     * OpenCV's fillPoly handles tessellation automatically for concave polygons.
     * When multiple shapes are passed, they are rendered together to support holes.
     * 
     * @param {OpenCVCanvas} canvas - OpenCVCanvas to draw on
     * @param {number[][]} shapes - List of shapes, each shape is a flat list of points [x1, y1, x2, y2, ...]
     * @param {number[]} color - RGBA color (0-255 for each component)
     * @param {number} opacity - Additional opacity modifier (0.0-1.0)
     */
    static renderShapes(canvas, shapes, color, opacity = 1.0) {
        // Apply opacity to color alpha
        const finalAlpha = Math.floor(color[3] * opacity);
        const finalColor = [color[0], color[1], color[2], finalAlpha];

        // Convert all shapes to point lists
        const contours = [];
        for (const shape of shapes) {
            if (shape.length >= 6) { // At least 3 points (6 values)
                const points = ShapeRenderer._flatToPoints(shape);
                contours.push(points);
            }
        }

        if (contours.length > 1) {
            // Multiple contours - use fill with holes support
            canvas.fillPolygonsWithHoles(contours, finalColor);
        } else if (contours.length === 1) {
            // Single contour - use simple fill
            canvas.fillPolygon(contours[0], finalColor);
        }
    }

    /**
     * Convert flat list [x1, y1, x2, y2, ...] to list of points [[x1, y1], ...].
     * @param {number[]} flatList - Flat list of coordinates
     * @returns {number[][]} List of [x, y] pairs
     */
    static _flatToPoints(flatList) {
        const points = [];
        for (let i = 0; i < flatList.length; i += 2) {
            if (i + 1 < flatList.length) {
                points.push([Math.floor(flatList[i]), Math.floor(flatList[i + 1])]);
            }
        }
        return points;
    }

    /**
     * Render meshes onto the canvas (compatible with Kivy-style API).
     * @param {OpenCVCanvas} canvas - OpenCVCanvas to draw on
     * @param {Object} widget - Widget that may contain opacity attribute
     * @param {number[][]} shapes - List of shapes represented as lists of points
     * @param {number[]} color - RGB or RGBA color values (0-1 range for Kivy compatibility)
     * @param {string} opacityAttr - Name of the attribute containing opacity value
     */
    static renderMesh(canvas, widget, shapes, color, opacityAttr) {
        // Get the opacity value
        const opacity = widget[opacityAttr] !== undefined ? widget[opacityAttr] : 1.0;

        // Convert color from 0-1 range to 0-255 range
        let rgbaColor;
        if (color && color.length >= 3) {
            const r = Math.floor(color[0] * 255);
            const g = Math.floor(color[1] * 255);
            const b = Math.floor(color[2] * 255);
            const a = Math.floor((color.length > 3 ? color[3] : 1.0) * 255 * opacity);
            rgbaColor = [r, g, b, a];
        } else {
            rgbaColor = [255, 255, 255, Math.floor(255 * opacity)];
        }

        ShapeRenderer.renderShapes(canvas, shapes, rgbaColor, 1.0);
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShapeRenderer };
}

if (typeof window !== 'undefined') {
    window.ShapeRenderer = ShapeRenderer;
}
