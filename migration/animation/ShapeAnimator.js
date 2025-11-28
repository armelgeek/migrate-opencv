/**
 * Shape-specific animation functionality for Kivg.
 * 
 * This is the JavaScript equivalent of kivg/animation/animation_shapes.py
 */

const { Animation } = require('../core/Animation.js');
const { linePoints, bezierPoints, findCenter } = require('../utils/PathUtils.js');
const { Line, CubicBezier } = require('../parsing/PathParser.js');

/**
 * Handles creation and management of shape-specific animations.
 */
class ShapeAnimator {
    /**
     * Set up the animation for a given shape.
     * @param {Object} caller - The widget calling the animation
     * @param {AnimationContext} context - AnimationContext containing animation parameters
     * @returns {Animation[]} List of Animation objects
     */
    static setupAnimation(caller, context) {
        if (!(context.shapeId in context.closedShapes)) {
            return null;
        }

        caller.prevShapes = [];
        caller.currShape = [];

        let lineCount = 0;
        let bezierCount = 0;
        const animList = [];

        // Extract path data and transform to animation format
        const pathData = ShapeAnimator._extractPathData(
            context.widget,
            context.shapeId,
            context.closedShapes,
            context.swSize,
            context.svgFile
        );

        if (!pathData || pathData.length === 0) {
            return null;
        }

        // Calculate base point for animation, can be null if direct reveal
        const basePoint = ShapeAnimator._calculateBasePoint(pathData, context.direction);

        // Set up animation properties for each path element
        for (let i = 0; i < pathData.length; i++) {
            const pathElements = pathData[i];
            for (let j = 0; j < pathElements.length; j++) {
                const element = pathElements[j];

                if (element.length === 2) { // Line
                    const newAnims = ShapeAnimator._setupLineAnimation(
                        context.widget,
                        context.shapeId,
                        lineCount,
                        element,
                        basePoint,
                        context.direction,
                        context.transition,
                        context.duration
                    );
                    animList.push(newAnims);
                    lineCount++;
                } else if (element.length === 4) { // Bezier
                    const newAnims = ShapeAnimator._setupBezierAnimation(
                        context.widget,
                        context.shapeId,
                        bezierCount,
                        element,
                        basePoint,
                        context.direction,
                        context.transition,
                        context.duration
                    );
                    animList.push(newAnims);
                    bezierCount++;
                }
            }
        }

        // Store the extracted path data for later use
        caller[`${context.shapeId}_tmp`] = pathData;
        return animList;
    }

    /**
     * Extract and transform path data for animation.
     * @private
     */
    static _extractPathData(widget, shapeId, closedShapes, swSize, sf) {
        const result = [];
        const pathsKey = `${shapeId}paths`;

        for (const path of closedShapes[shapeId][pathsKey]) {
            const pathElements = [];

            for (const element of path) {
                if (element instanceof Line || element.type === 'line') {
                    const lp = linePoints(
                        element,
                        [...widget.size],
                        [...widget.pos],
                        [...swSize],
                        sf
                    );
                    pathElements.push([
                        [lp[0], lp[1]],
                        [lp[2], lp[3]]
                    ]);
                } else if (element instanceof CubicBezier || element.type === 'bezier') {
                    const bp = bezierPoints(
                        element,
                        [...widget.size],
                        [...widget.pos],
                        [...swSize],
                        sf
                    );
                    pathElements.push([
                        [bp[0], bp[1]],
                        [bp[2], bp[3]],
                        [bp[4], bp[5]],
                        [bp[6], bp[7]]
                    ]);
                }
            }

            result.push(pathElements);
        }

        return result;
    }

    /**
     * Calculate the starting point for an animation based on direction.
     * @private
     */
    static _calculateBasePoint(pathData, direction) {
        if (!direction) {
            return null;
        }

        const coordinates = [];

        // Extract relevant coordinates based on direction
        for (const path of pathData) {
            for (const element of path) {
                for (const point of element) {
                    if (['left', 'right', 'center_x'].includes(direction)) {
                        coordinates.push(point[0]);
                    } else {
                        coordinates.push(point[1]);
                    }
                }
            }
        }

        // Determine base point based on direction
        if (['top', 'right'].includes(direction)) {
            return Math.max(...coordinates); // Start from rightmost/topmost point
        } else if (['left', 'bottom'].includes(direction)) {
            return Math.min(...coordinates); // Start from leftmost/bottommost point
        } else if (['center_x', 'center_y'].includes(direction)) {
            return findCenter([...coordinates].sort((a, b) => a - b));
        }

        return null;
    }

    /**
     * Set up animation for a line element.
     * @private
     */
    static _setupLineAnimation(widget, shapeId, lineCount, linePoints, basePoint, direction, transition, duration) {
        const isHorizontal = ['left', 'right', 'center_x'].includes(direction);
        const isVertical = ['top', 'bottom', 'center_y'].includes(direction);
        const [startPoint, endPoint] = linePoints;

        // Set initial property values
        widget[`${shapeId}_mesh_line${lineCount}_start_x`] = isHorizontal ? basePoint : startPoint[0];
        widget[`${shapeId}_mesh_line${lineCount}_start_y`] = isVertical ? basePoint : startPoint[1];
        widget[`${shapeId}_mesh_line${lineCount}_end_x`] = isHorizontal ? basePoint : endPoint[0];
        widget[`${shapeId}_mesh_line${lineCount}_end_y`] = isVertical ? basePoint : endPoint[1];

        // Create animation properties
        let animProps = {};
        if (isHorizontal) {
            animProps = {
                [`${shapeId}_mesh_line${lineCount}_start_x`]: startPoint[0],
                [`${shapeId}_mesh_line${lineCount}_end_x`]: endPoint[0]
            };
        } else {
            animProps = {
                [`${shapeId}_mesh_line${lineCount}_start_y`]: startPoint[1],
                [`${shapeId}_mesh_line${lineCount}_end_y`]: endPoint[1]
            };
        }

        return new Animation({ d: duration, t: transition, ...animProps });
    }

    /**
     * Set up animation for a bezier curve element.
     * @private
     */
    static _setupBezierAnimation(widget, shapeId, bezierCount, bezierPoints, basePoint, direction, transition, duration) {
        const isHorizontal = ['left', 'right', 'center_x'].includes(direction);
        const isVertical = ['top', 'bottom', 'center_y'].includes(direction);
        const [start, ctrl1, ctrl2, end] = bezierPoints;

        // Set initial properties
        ShapeAnimator._setBezierProperties(
            widget, shapeId, bezierCount, start, ctrl1, ctrl2, end,
            basePoint, isHorizontal, isVertical
        );

        // Create animation properties
        let animProps = {};
        if (isHorizontal) {
            animProps = {
                [`${shapeId}_mesh_bezier${bezierCount}_start_x`]: start[0],
                [`${shapeId}_mesh_bezier${bezierCount}_control1_x`]: ctrl1[0],
                [`${shapeId}_mesh_bezier${bezierCount}_control2_x`]: ctrl2[0],
                [`${shapeId}_mesh_bezier${bezierCount}_end_x`]: end[0]
            };
        } else {
            animProps = {
                [`${shapeId}_mesh_bezier${bezierCount}_start_y`]: start[1],
                [`${shapeId}_mesh_bezier${bezierCount}_control1_y`]: ctrl1[1],
                [`${shapeId}_mesh_bezier${bezierCount}_control2_y`]: ctrl2[1],
                [`${shapeId}_mesh_bezier${bezierCount}_end_y`]: end[1]
            };
        }

        return new Animation({ d: duration, t: transition, ...animProps });
    }

    /**
     * Set initial bezier curve properties.
     * @private
     */
    static _setBezierProperties(widget, shapeId, index, start, ctrl1, ctrl2, end, basePoint, isHorizontal, isVertical) {
        // Start point
        widget[`${shapeId}_mesh_bezier${index}_start_x`] = isHorizontal ? basePoint : start[0];
        widget[`${shapeId}_mesh_bezier${index}_start_y`] = isVertical ? basePoint : start[1];

        // Control point 1
        widget[`${shapeId}_mesh_bezier${index}_control1_x`] = isHorizontal ? basePoint : ctrl1[0];
        widget[`${shapeId}_mesh_bezier${index}_control1_y`] = isVertical ? basePoint : ctrl1[1];

        // Control point 2
        widget[`${shapeId}_mesh_bezier${index}_control2_x`] = isHorizontal ? basePoint : ctrl2[0];
        widget[`${shapeId}_mesh_bezier${index}_control2_y`] = isVertical ? basePoint : ctrl2[1];

        // End point
        widget[`${shapeId}_mesh_bezier${index}_end_x`] = isHorizontal ? basePoint : end[0];
        widget[`${shapeId}_mesh_bezier${index}_end_y`] = isVertical ? basePoint : end[1];
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShapeAnimator };
}

if (typeof window !== 'undefined') {
    window.ShapeAnimator = ShapeAnimator;
}
