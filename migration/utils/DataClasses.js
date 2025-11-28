/**
 * Data classes/structures for Kivg.
 * 
 * This is the JavaScript equivalent of kivg/data_classes.py
 */

/**
 * AnimationContext - Contains all parameters needed for shape animation.
 */
class AnimationContext {
    /**
     * Create an AnimationContext.
     * @param {Object} options - Context options
     * @param {Object} options.widget - The widget being animated
     * @param {string} options.shapeId - ID of the shape to animate
     * @param {string} options.direction - Animation direction (left, right, top, bottom, center_x, center_y)
     * @param {string} options.transition - Transition/easing function name
     * @param {number} options.duration - Animation duration in seconds
     * @param {Object} options.closedShapes - SVG path data organized by shape ID
     * @param {number[]} options.swSize - SVG dimensions [width, height]
     * @param {string} options.svgFile - SVG file path
     */
    constructor({ widget, shapeId, direction, transition, duration, closedShapes, swSize, svgFile }) {
        this.widget = widget;
        this.shapeId = shapeId;
        this.direction = direction;
        this.transition = transition;
        this.duration = duration;
        this.closedShapes = closedShapes;
        this.swSize = swSize;
        this.svgFile = svgFile;
    }
}

/**
 * PathElement - Represents a single path element (Line or Bezier).
 */
class PathElement {
    /**
     * Create a PathElement.
     * @param {string} type - Element type ('line' or 'bezier')
     * @param {Object} start - Start point {x, y}
     * @param {Object} end - End point {x, y}
     * @param {Object} control1 - First control point for bezier {x, y}
     * @param {Object} control2 - Second control point for bezier {x, y}
     */
    constructor({ type, start, end, control1 = null, control2 = null }) {
        this.type = type;
        this.start = start;
        this.end = end;
        this.control1 = control1;
        this.control2 = control2;
    }

    /**
     * Check if this is a line element.
     * @returns {boolean} True if line
     */
    isLine() {
        return this.type === 'line';
    }

    /**
     * Check if this is a bezier element.
     * @returns {boolean} True if bezier
     */
    isBezier() {
        return this.type === 'bezier';
    }
}

/**
 * SVGPathData - Contains parsed SVG path data.
 */
class SVGPathData {
    /**
     * Create SVGPathData.
     * @param {string} pathString - Raw SVG path string
     * @param {string} id - Element ID
     * @param {Object} attributes - Path attributes (fill, stroke, etc.)
     */
    constructor(pathString, id, attributes = {}) {
        this.pathString = pathString;
        this.id = id;
        this.attributes = attributes;
        this.elements = [];
    }

    /**
     * Add a path element.
     * @param {PathElement} element - Path element to add
     */
    addElement(element) {
        this.elements.push(element);
    }
}

/**
 * TextData - Contains parsed text element data.
 */
class TextData {
    /**
     * Create TextData.
     * @param {Object} options - Text options
     */
    constructor({
        text = '',
        x = 0,
        y = 0,
        fontFamily = 'sans-serif',
        fontSize = 16,
        fontWeight = 'normal',
        fontStyle = 'normal',
        fill = [0, 0, 0, 1],
        stroke = null,
        strokeWidth = null,
        textAnchor = 'start',
        dominantBaseline = 'auto',
        letterSpacing = 0,
        textDecoration = 'none',
        opacity = 1.0,
        id = ''
    } = {}) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
        this.fontWeight = fontWeight;
        this.fontStyle = fontStyle;
        this.fill = fill;
        this.stroke = stroke;
        this.strokeWidth = strokeWidth;
        this.textAnchor = textAnchor;
        this.dominantBaseline = dominantBaseline;
        this.letterSpacing = letterSpacing;
        this.textDecoration = textDecoration;
        this.opacity = opacity;
        this.id = id;
    }

    /**
     * Convert to plain object for serialization.
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            text: this.text,
            x: this.x,
            y: this.y,
            font_family: this.fontFamily,
            font_size: this.fontSize,
            font_weight: this.fontWeight,
            font_style: this.fontStyle,
            fill: this.fill,
            stroke: this.stroke,
            stroke_width: this.strokeWidth,
            text_anchor: this.textAnchor,
            dominant_baseline: this.dominantBaseline,
            letter_spacing: this.letterSpacing,
            text_decoration: this.textDecoration,
            opacity: this.opacity,
            id: this.id
        };
    }
}

/**
 * RenderingContext - Contains canvas and rendering settings.
 */
class RenderingContext {
    /**
     * Create RenderingContext.
     * @param {Object} options - Rendering options
     * @param {number} options.width - Canvas width
     * @param {number} options.height - Canvas height
     * @param {number[]} options.background - Background color RGBA
     * @param {boolean} options.fill - Whether to fill shapes
     * @param {number} options.lineWidth - Default line width
     * @param {number[]} options.lineColor - Default line color RGBA
     */
    constructor({
        width = 512,
        height = 512,
        background = [255, 255, 255, 255],
        fill = true,
        lineWidth = 1,
        lineColor = [0, 0, 0, 255]
    } = {}) {
        this.width = width;
        this.height = height;
        this.background = background;
        this.fill = fill;
        this.lineWidth = lineWidth;
        this.lineColor = lineColor;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AnimationContext,
        PathElement,
        SVGPathData,
        TextData,
        RenderingContext
    };
}

if (typeof window !== 'undefined') {
    window.DataClasses = {
        AnimationContext,
        PathElement,
        SVGPathData,
        TextData,
        RenderingContext
    };
}
