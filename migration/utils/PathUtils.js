/**
 * Path utilities for Kivg.
 * Contains functions to convert SVG paths to OpenCV-compatible coordinates.
 * Note: OpenCV and SVG share the same coordinate system (Y increases downward),
 * so no Y-axis inversion is needed (unlike Kivy).
 * 
 * This is the JavaScript equivalent of kivg/path_utils.py
 */

/**
 * Transform an X coordinate from SVG to OpenCV coordinate system.
 * @param {number} xPos - SVG x coordinate
 * @param {number} widgetX - Widget x position
 * @param {number} widgetWidth - Widget width
 * @param {number} svgWidth - SVG width
 * @param {string} svgFile - SVG file path (for special kivy icon handling)
 * @returns {number} Transformed x coordinate
 */
function transformX(xPos, widgetX, widgetWidth, svgWidth, svgFile) {
    // Special handling for Kivy SVG icons (legacy compatibility)
    if (svgFile && svgFile.includes('kivy')) {
        return widgetX + (widgetWidth * (xPos / 10) / svgWidth);
    }
    return widgetX + widgetWidth * xPos / svgWidth;
}

/**
 * Transform a Y coordinate from SVG to OpenCV coordinate system.
 * Note: OpenCV has the same coordinate system as SVG (Y increases downward),
 * so no inversion is needed.
 * 
 * @param {number} yPos - SVG y coordinate
 * @param {number} widgetY - Widget y position
 * @param {number} widgetHeight - Widget height
 * @param {number} svgHeight - SVG height
 * @param {string} svgFile - SVG file path (for special kivy icon handling)
 * @returns {number} Transformed y coordinate
 */
function transformY(yPos, widgetY, widgetHeight, svgHeight, svgFile) {
    // Special handling for Kivy SVG icons (legacy compatibility)
    if (svgFile && svgFile.includes('kivy')) {
        return widgetY + (widgetHeight * (yPos / 10) / svgHeight);
    }
    // OpenCV has same coordinate system as SVG - no Y inversion needed
    return widgetY + widgetHeight * yPos / svgHeight;
}

/**
 * Transform a complex point from SVG to OpenCV coordinate system.
 * @param {Object} complexPoint - SVG point as object with real and imag properties
 * @param {number[]} widgetSize - [width, height] of widget/canvas
 * @param {number[]} widgetPos - [x, y] position of widget/canvas
 * @param {number[]} svgSize - [width, height] of SVG
 * @param {string} svgFile - SVG file path
 * @returns {number[]} [x, y] transformed coordinates
 */
function transformPoint(complexPoint, widgetSize, widgetPos, svgSize, svgFile) {
    const [w, h] = widgetSize;
    const [wx, wy] = widgetPos;
    const [sw, sh] = svgSize;

    // Handle both complex number objects and simple {real, imag} objects
    const real = complexPoint.real !== undefined ? complexPoint.real : complexPoint.x;
    const imag = complexPoint.imag !== undefined ? complexPoint.imag : complexPoint.y;

    return [
        transformX(real, wx, w, sw, svgFile),
        transformY(imag, wy, h, sh, svgFile)
    ];
}

/**
 * Convert a CubicBezier to OpenCV-compatible bezier points.
 * @param {Object} bezier - Bezier object with start, control1, control2, end properties
 * @param {number[]} widgetSize - [width, height] of widget/canvas
 * @param {number[]} widgetPos - [x, y] position of widget/canvas
 * @param {number[]} svgSize - [width, height] of SVG
 * @param {string} svgFile - SVG file path
 * @returns {number[]} List of points [x1, y1, cx1, cy1, cx2, cy2, x2, y2]
 */
function bezierPoints(bezier, widgetSize, widgetPos, svgSize, svgFile) {
    return [
        ...transformPoint(bezier.start, widgetSize, widgetPos, svgSize, svgFile),
        ...transformPoint(bezier.control1, widgetSize, widgetPos, svgSize, svgFile),
        ...transformPoint(bezier.control2, widgetSize, widgetPos, svgSize, svgFile),
        ...transformPoint(bezier.end, widgetSize, widgetPos, svgSize, svgFile)
    ];
}

/**
 * Convert a Line to OpenCV-compatible line points.
 * @param {Object} line - Line object with start and end properties
 * @param {number[]} widgetSize - [width, height] of widget/canvas
 * @param {number[]} widgetPos - [x, y] position of widget/canvas
 * @param {number[]} svgSize - [width, height] of SVG
 * @param {string} svgFile - SVG file path
 * @returns {number[]} List of points [x1, y1, x2, y2]
 */
function linePoints(line, widgetSize, widgetPos, svgSize, svgFile) {
    return [
        ...transformPoint(line.start, widgetSize, widgetPos, svgSize, svgFile),
        ...transformPoint(line.end, widgetSize, widgetPos, svgSize, svgFile)
    ];
}

// Bernstein polynomials for Bezier calculation
const B0_t = (t) => Math.pow(1 - t, 3);
const B1_t = (t) => 3 * t * Math.pow(1 - t, 2);
const B2_t = (t) => 3 * Math.pow(t, 2) * (1 - t);
const B3_t = (t) => Math.pow(t, 3);

/**
 * Generate discrete points along a cubic bezier curve.
 * @param {number[]} start - Starting point [x, y]
 * @param {number[]} control1 - First control point [x, y]
 * @param {number[]} control2 - Second control point [x, y]
 * @param {number[]} end - End point [x, y]
 * @param {number} segments - Number of segments to generate
 * @returns {number[]} Flattened list of points [x1, y1, x2, y2, ...]
 */
function getAllPoints(start, control1, control2, end, segments = 100) {
    const points = [];
    const [ax, ay] = start;
    const [bx, by] = control1;
    const [cx, cy] = control2;
    const [dx, dy] = end;

    const seg = 1 / segments;
    let t = 0;

    while (t <= 1) {
        points.push(
            (B0_t(t) * ax) + (B1_t(t) * bx) + (B2_t(t) * cx) + (B3_t(t) * dx),
            (B0_t(t) * ay) + (B1_t(t) * by) + (B2_t(t) * cy) + (B3_t(t) * dy)
        );
        t += seg;
    }

    return points;
}

/**
 * Find the center value of a sorted list.
 * @param {number[]} sortedList - A sorted list of numbers
 * @returns {number} The center value or average of the two middle values
 */
function findCenter(sortedList) {
    const length = sortedList.length;
    const middle = length / 2;
    if (length % 2 !== 0) {
        return sortedList[Math.floor(middle)];
    } else {
        return (sortedList[Math.floor(middle)] + sortedList[Math.floor(middle - 1)]) / 2;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        transformX,
        transformY,
        transformPoint,
        bezierPoints,
        linePoints,
        getAllPoints,
        findCenter,
        B0_t,
        B1_t,
        B2_t,
        B3_t
    };
}

if (typeof window !== 'undefined') {
    window.PathUtils = {
        transformX,
        transformY,
        transformPoint,
        bezierPoints,
        linePoints,
        getAllPoints,
        findCenter,
        B0_t,
        B1_t,
        B2_t,
        B3_t
    };
}
