/**
 * Path rendering functionality for OpenCV.js-based SVG rendering.
 * 
 * This is the JavaScript equivalent of kivg/rendering/path_renderer.py
 */

const { getAllPoints } = require('../utils/PathUtils.js');
const { color01To0255 } = require('../utils/ColorUtils.js');
const { Line, CubicBezier } = require('../parsing/PathParser.js');

/**
 * Handles rendering of SVG paths to OpenCV canvas.
 */
class PathRenderer {
    /**
     * Update the canvas with the current path elements.
     * @param {OpenCVCanvas} canvas - OpenCVCanvas to draw on
     * @param {Object} widget - Widget containing path properties
     * @param {Array} pathElements - List of SVG path elements
     * @param {number[]} defaultColor - Default RGBA color for lines without stroke attribute
     * @param {number} defaultWidth - Default width for lines without stroke-width attribute
     */
    static updateCanvas(canvas, widget, pathElements, defaultColor = [0, 0, 0, 255], defaultWidth = 1) {
        let lineCount = 0;
        let bezierCount = 0;

        // Draw each path element
        for (const element of pathElements) {
            if (element instanceof Line || element.type === 'line') {
                PathRenderer._drawLine(canvas, widget, lineCount, defaultColor, defaultWidth);
                lineCount++;
            } else if (element instanceof CubicBezier || element.type === 'bezier') {
                PathRenderer._drawBezier(canvas, widget, bezierCount, defaultColor, defaultWidth);
                bezierCount++;
            }
        }
    }

    /**
     * Draw a line element on the canvas.
     * @param {OpenCVCanvas} canvas - Canvas to draw on
     * @param {Object} widget - Widget with properties
     * @param {number} lineIndex - Index of the line
     * @param {number[]} defaultColor - Default color
     * @param {number} defaultWidth - Default width
     */
    static _drawLine(canvas, widget, lineIndex, defaultColor, defaultWidth) {
        const startX = Math.floor(widget[`line${lineIndex}_start_x`] || 0);
        const startY = Math.floor(widget[`line${lineIndex}_start_y`] || 0);
        const endX = Math.floor(widget[`line${lineIndex}_end_x`] || 0);
        const endY = Math.floor(widget[`line${lineIndex}_end_y`] || 0);

        // Get stroke color from SVG attributes or use default
        const strokeColor = widget[`line${lineIndex}_stroke_color`];
        let color;
        if (strokeColor !== null && strokeColor !== undefined) {
            color = color01To0255(strokeColor);
            if (color === null) {
                color = defaultColor;
            }
        } else {
            color = defaultColor;
        }

        // Get stroke width from SVG attributes or use default/animated width
        let width;
        const strokeWidth = widget[`line${lineIndex}_stroke_width`];
        if (strokeWidth !== null && strokeWidth !== undefined) {
            width = Math.floor(strokeWidth);
        } else {
            // Fall back to animated width or default
            width = Math.floor(widget[`line${lineIndex}_width`] || defaultWidth);
        }

        canvas.drawLine([startX, startY], [endX, endY], color, width);
    }

    /**
     * Draw a bezier curve element on the canvas.
     * @param {OpenCVCanvas} canvas - Canvas to draw on
     * @param {Object} widget - Widget with properties
     * @param {number} bezierIndex - Index of the bezier
     * @param {number[]} defaultColor - Default color
     * @param {number} defaultWidth - Default width
     */
    static _drawBezier(canvas, widget, bezierIndex, defaultColor, defaultWidth) {
        const startX = Math.floor(widget[`bezier${bezierIndex}_start_x`] || 0);
        const startY = Math.floor(widget[`bezier${bezierIndex}_start_y`] || 0);
        const ctrl1X = Math.floor(widget[`bezier${bezierIndex}_control1_x`] || 0);
        const ctrl1Y = Math.floor(widget[`bezier${bezierIndex}_control1_y`] || 0);
        const ctrl2X = Math.floor(widget[`bezier${bezierIndex}_control2_x`] || 0);
        const ctrl2Y = Math.floor(widget[`bezier${bezierIndex}_control2_y`] || 0);
        const endX = Math.floor(widget[`bezier${bezierIndex}_end_x`] || 0);
        const endY = Math.floor(widget[`bezier${bezierIndex}_end_y`] || 0);

        // Get stroke color from SVG attributes or use default
        const strokeColor = widget[`bezier${bezierIndex}_stroke_color`];
        let color;
        if (strokeColor !== null && strokeColor !== undefined) {
            color = color01To0255(strokeColor);
            if (color === null) {
                color = defaultColor;
            }
        } else {
            color = defaultColor;
        }

        // Get stroke width from SVG attributes or use default/animated width
        let width;
        const strokeWidth = widget[`bezier${bezierIndex}_stroke_width`];
        if (strokeWidth !== null && strokeWidth !== undefined) {
            width = Math.floor(strokeWidth);
        } else {
            // Fall back to animated width or default
            width = Math.floor(widget[`bezier${bezierIndex}_width`] || defaultWidth);
        }

        canvas.drawBezier(
            [startX, startY],
            [ctrl1X, ctrl1Y],
            [ctrl2X, ctrl2Y],
            [endX, endY],
            color,
            width
        );
    }

    /**
     * Collect all current points for a shape during animation.
     * @param {Array} tmpElementsLists - Path data from shape_animate
     * @param {Object} widget - Widget containing animation properties
     * @param {string} shapeId - ID of the shape
     * @returns {number[]} List of points representing the current shape state
     */
    static collectShapePoints(tmpElementsLists, widget, shapeId) {
        const shapeList = [];
        let lineCount = 0;
        let bezierCount = 0;

        for (const pathElements of tmpElementsLists) {
            for (const element of pathElements) {
                // Collect line points (element has 2 points)
                if (element.length === 2) {
                    shapeList.push(
                        widget[`${shapeId}_mesh_line${lineCount}_start_x`],
                        widget[`${shapeId}_mesh_line${lineCount}_start_y`],
                        widget[`${shapeId}_mesh_line${lineCount}_end_x`],
                        widget[`${shapeId}_mesh_line${lineCount}_end_y`]
                    );
                    lineCount++;
                }

                // Collect bezier points (element has 4 points)
                if (element.length === 4) {
                    const bezierPoints = getAllPoints(
                        [
                            widget[`${shapeId}_mesh_bezier${bezierCount}_start_x`],
                            widget[`${shapeId}_mesh_bezier${bezierCount}_start_y`]
                        ],
                        [
                            widget[`${shapeId}_mesh_bezier${bezierCount}_control1_x`],
                            widget[`${shapeId}_mesh_bezier${bezierCount}_control1_y`]
                        ],
                        [
                            widget[`${shapeId}_mesh_bezier${bezierCount}_control2_x`],
                            widget[`${shapeId}_mesh_bezier${bezierCount}_control2_y`]
                        ],
                        [
                            widget[`${shapeId}_mesh_bezier${bezierCount}_end_x`],
                            widget[`${shapeId}_mesh_bezier${bezierCount}_end_y`]
                        ]
                    );
                    shapeList.push(...bezierPoints);
                    bezierCount++;
                }
            }
        }

        return shapeList;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PathRenderer };
}

if (typeof window !== 'undefined') {
    window.PathRenderer = PathRenderer;
}
