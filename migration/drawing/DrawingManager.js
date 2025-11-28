/**
 * DrawingManager handles SVG path processing and rendering preparation.
 * 
 * This is the JavaScript equivalent of kivg/drawing/manager.py
 */

const { parsePath, Line, CubicBezier, Close, Move } = require('../parsing/PathParser.js');
const { parseSVG, parseSVGAsync } = require('../parsing/SVGParser.js');
const { getAllPoints, bezierPoints, linePoints } = require('../utils/PathUtils.js');
const { Animation } = require('../core/Animation.js');

/**
 * Handles the drawing and rendering of SVG paths.
 */
class DrawingManager {
    /**
     * Process SVG file/string and extract path data.
     * @param {string|Document} svgInput - SVG content or Document
     * @returns {Array} Tuple of [svg_dimensions, closed_shapes, path_elements]
     */
    static processPathData(svgInput) {
        const [swSize, pathStrings] = parseSVG(svgInput);

        const path = [];
        const closedShapes = {};

        for (const [pathString, id, attrs] of pathStrings) {
            let moveFound = false;
            let tmp = [];
            
            closedShapes[id] = {};
            closedShapes[id][`${id}paths`] = [];
            closedShapes[id][`${id}shapes`] = []; // for drawing meshes
            closedShapes[id]['color'] = attrs.fill;
            closedShapes[id]['stroke'] = attrs.stroke;
            closedShapes[id]['stroke_width'] = attrs.stroke_width;

            const parsedPath = parsePath(pathString);
            
            for (const e of parsedPath) {
                path.push(e);

                if ((e instanceof Close) || ((e instanceof Move) && moveFound)) {
                    closedShapes[id][`${id}paths`].push(tmp);
                    moveFound = false;
                }

                if (e instanceof Move) { // shape started
                    tmp = [];
                    moveFound = true;
                }

                if (!(e instanceof Move) && moveFound) {
                    tmp.push(e);
                }
            }
        }

        return [swSize, closedShapes, path];
    }

    /**
     * Process SVG file asynchronously (for browser file loading).
     * @param {string} svgUrl - URL to the SVG file
     * @returns {Promise<Array>} Promise resolving to [svg_dimensions, closed_shapes, path_elements]
     */
    static async processPathDataAsync(svgUrl) {
        const [swSize, pathStrings] = await parseSVGAsync(svgUrl);
        
        const path = [];
        const closedShapes = {};

        for (const [pathString, id, attrs] of pathStrings) {
            let moveFound = false;
            let tmp = [];
            
            closedShapes[id] = {};
            closedShapes[id][`${id}paths`] = [];
            closedShapes[id][`${id}shapes`] = [];
            closedShapes[id]['color'] = attrs.fill;
            closedShapes[id]['stroke'] = attrs.stroke;
            closedShapes[id]['stroke_width'] = attrs.stroke_width;

            const parsedPath = parsePath(pathString);
            
            for (const e of parsedPath) {
                path.push(e);

                if ((e instanceof Close) || ((e instanceof Move) && moveFound)) {
                    closedShapes[id][`${id}paths`].push(tmp);
                    moveFound = false;
                }

                if (e instanceof Move) {
                    tmp = [];
                    moveFound = true;
                }

                if (!(e instanceof Move) && moveFound) {
                    tmp.push(e);
                }
            }
        }

        return [swSize, closedShapes, path];
    }

    /**
     * Calculate and set up path properties for rendering.
     * @param {Object} widget - Widget to draw on
     * @param {Object} closedShapes - Path data organized by shape ID
     * @param {number[]} svgSize - SVG dimensions [width, height]
     * @param {string} svgFile - SVG file path
     * @param {boolean} animate - Whether to animate the drawing
     * @param {number} lineWidth - Width of the drawn lines
     * @param {number} duration - Duration for each animation step
     * @returns {Animation[]} List of Animation objects if animate=true
     */
    static calculatePaths(widget, closedShapes, svgSize, svgFile, animate = false, lineWidth = 2, duration = 0.02) {
        let lineCount = 0;
        let bezierCount = 0;
        const animList = [];

        for (const [id, closedPaths] of Object.entries(closedShapes)) {
            const pathsKey = `${id}paths`;
            const shapesKey = `${id}shapes`;

            for (const s of closedPaths[pathsKey]) {
                const tmp = [];
                
                for (const e of s) {
                    if (e instanceof Line || e.type === 'line') {
                        const lp = linePoints(
                            e,
                            [...widget.size],
                            [...widget.pos],
                            [...svgSize],
                            svgFile
                        );
                        
                        DrawingManager._setupLineProperties(widget, lineCount, lp, animate, lineWidth);

                        // Store stroke information for this line
                        const strokeColor = closedPaths.stroke;
                        const strokeWidth = closedPaths.stroke_width;
                        widget[`line${lineCount}_stroke_color`] = strokeColor;
                        widget[`line${lineCount}_stroke_width`] = strokeWidth;

                        if (animate) {
                            animList.push(new Animation({
                                d: duration,
                                [`line${lineCount}_end_x`]: lp[2],
                                [`line${lineCount}_end_y`]: lp[3],
                                [`line${lineCount}_width`]: lineWidth
                            }));
                        }
                        lineCount++;
                        tmp.push(...lp);

                    } else if (e instanceof CubicBezier || e.type === 'bezier') {
                        const bp = bezierPoints(
                            e,
                            [...widget.size],
                            [...widget.pos],
                            [...svgSize],
                            svgFile
                        );
                        
                        DrawingManager._setupBezierProperties(widget, bezierCount, bp, animate, lineWidth);

                        // Store stroke information for this bezier
                        const strokeColor = closedPaths.stroke;
                        const strokeWidth = closedPaths.stroke_width;
                        widget[`bezier${bezierCount}_stroke_color`] = strokeColor;
                        widget[`bezier${bezierCount}_stroke_width`] = strokeWidth;

                        if (animate) {
                            animList.push(new Animation({
                                d: duration,
                                [`bezier${bezierCount}_control1_x`]: bp[2],
                                [`bezier${bezierCount}_control1_y`]: bp[3],
                                [`bezier${bezierCount}_control2_x`]: bp[4],
                                [`bezier${bezierCount}_control2_y`]: bp[5],
                                [`bezier${bezierCount}_end_x`]: bp[6],
                                [`bezier${bezierCount}_end_y`]: bp[7],
                                [`bezier${bezierCount}_width`]: lineWidth
                            }));
                        }
                        bezierCount++;

                        tmp.push(...getAllPoints(
                            [bp[0], bp[1]],
                            [bp[2], bp[3]],
                            [bp[4], bp[5]],
                            [bp[6], bp[7]]
                        ));
                    }
                }

                if (!closedPaths[shapesKey].some(shape => 
                    JSON.stringify(shape) === JSON.stringify(tmp))) {
                    closedPaths[shapesKey].push(tmp);
                }
            }
        }

        return animList;
    }

    /**
     * Set up line properties on the widget.
     * @private
     */
    static _setupLineProperties(widget, lineIndex, linePoints, animate, lineWidth) {
        widget[`line${lineIndex}_start_x`] = linePoints[0];
        widget[`line${lineIndex}_start_y`] = linePoints[1];
        widget[`line${lineIndex}_end_x`] = animate ? linePoints[0] : linePoints[2];
        widget[`line${lineIndex}_end_y`] = animate ? linePoints[1] : linePoints[3];
        widget[`line${lineIndex}_width`] = animate ? 1 : lineWidth;
    }

    /**
     * Set up bezier curve properties on the widget.
     * @private
     */
    static _setupBezierProperties(widget, bezierIndex, bezierPoints, animate, lineWidth) {
        // Start point
        widget[`bezier${bezierIndex}_start_x`] = bezierPoints[0];
        widget[`bezier${bezierIndex}_start_y`] = bezierPoints[1];

        // Control points
        widget[`bezier${bezierIndex}_control1_x`] = animate ? bezierPoints[0] : bezierPoints[2];
        widget[`bezier${bezierIndex}_control1_y`] = animate ? bezierPoints[1] : bezierPoints[3];
        widget[`bezier${bezierIndex}_control2_x`] = animate ? bezierPoints[0] : bezierPoints[4];
        widget[`bezier${bezierIndex}_control2_y`] = animate ? bezierPoints[1] : bezierPoints[5];

        // End point
        widget[`bezier${bezierIndex}_end_x`] = animate ? bezierPoints[0] : bezierPoints[6];
        widget[`bezier${bezierIndex}_end_y`] = animate ? bezierPoints[1] : bezierPoints[7];

        // Width
        widget[`bezier${bezierIndex}_width`] = animate ? 1 : lineWidth;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DrawingManager };
}

if (typeof window !== 'undefined') {
    window.DrawingManager = DrawingManager;
}
