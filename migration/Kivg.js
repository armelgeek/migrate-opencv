/**
 * Kivg - SVG drawing and animation using OpenCV.js
 * Core class and main API (headless, no UI required)
 * 
 * This is the JavaScript equivalent of kivg/main.py
 */

const { OpenCVCanvas } = require('./core/OpenCVCanvas.js');
const { Animation } = require('./core/Animation.js');
const { DrawingManager } = require('./drawing/DrawingManager.js');
const { PathRenderer } = require('./rendering/PathRenderer.js');
const { ShapeRenderer } = require('./rendering/ShapeRenderer.js');
const { TextRenderer } = require('./rendering/TextRenderer.js');
const { HandOverlay } = require('./rendering/HandOverlay.js');

// Threshold for considering fill animation complete (handles floating-point precision)
const FILL_COMPLETION_THRESHOLD = 0.99;

/**
 * Simple class to hold dynamic properties for animation.
 * Replaces Kivy widget for headless rendering.
 */
class PropertyHolder {
    /**
     * Initialize the property holder.
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    constructor(width = 512, height = 512) {
        this.size = [width, height];
        this.pos = [0, 0];
        this.mesh_opacity = 1.0;
    }
}

/**
 * Main class for rendering and animating SVG files using OpenCV.js.
 */
class Kivg {
    /**
     * Initialize the Kivg renderer.
     * @param {Object} options - Configuration options
     * @param {number} options.width - Canvas width in pixels
     * @param {number} options.height - Canvas height in pixels
     * @param {number[]} options.background - RGBA background color (0-255 for each component)
     * @param {HTMLCanvasElement|string} options.canvasElement - Canvas element or selector
     */
    constructor({ width = 512, height = 512, background = [0, 0, 0, 0], canvasElement = null } = {}) {
        this.width = width;
        this.height = height;
        this.canvas = new OpenCVCanvas(width, height, background);
        this.canvasElement = canvasElement;

        // Property holder (replaces Kivy widget)
        this.widget = new PropertyHolder(width, height);

        // Default settings
        this._fill = true;
        this._lineWidth = 1;
        this._lineColor = [0, 0, 0, 255];
        this._animationDuration = 0.02;
        this._previousSvgFile = '';

        // SVG data
        this.path = [];
        this.closedShapes = {};
        this.svgSize = [];
        this.currentSvgFile = '';

        // Animation state
        this.allAnim = [];
        this.currCount = 0;
        this.prevShapes = [];
        this.currShape = [];

        // Stored animation frames
        this._frames = [];

        // Hand overlay for whiteboard-style animation
        this._handOverlay = null;
        this._handDrawEnabled = false;
    }

    /**
     * Fill shapes with specified color.
     * @param {number[][]} shapes - List of shape point lists to fill
     * @param {number[]} color - RGB or RGBA color (0-1 range for compatibility)
     */
    fillUp(shapes, color) {
        ShapeRenderer.renderMesh(this.canvas, this.widget, shapes, color, 'mesh_opacity');
    }

    /**
     * Fill all shapes in the current SVG file, using lineColor for transparent fills.
     */
    fillUpShapes() {
        for (const [id, closedPaths] of Object.entries(this.closedShapes)) {
            const color = closedPaths.color;
            const shapesKey = `${id}shapes`;

            // For shapes with transparent fill (fill="none" or invalid color),
            // use the lineColor to fill them instead of skipping
            if (color && color.length >= 4 && color[3] === 0) {
                // Use lineColor for transparent fills
                let fillColor = [...this._lineColor];
                // Convert from 0-255 to 0-1 if needed
                if (!fillColor.every(c => c <= 1.0)) {
                    fillColor = fillColor.map(c => c / 255.0);
                }
                this.fillUp(closedPaths[shapesKey], fillColor);
            } else {
                this.fillUp(closedPaths[shapesKey], color);
            }
        }
    }

    /**
     * Fill shapes during animation.
     * @param {Array} shapes - Array of [color, points] tuples
     */
    fillUpShapesAnim(shapes) {
        for (const shape of shapes) {
            const color = shape[0];
            this.fillUp([shape[1]], color);
        }
    }

    /**
     * Update the canvas with the current drawing state.
     */
    updateCanvas() {
        // Convert line color from 0-1 to 0-255 if needed
        let defaultColor;
        if (this._lineColor.slice(0, 3).every(c => c <= 1.0)) {
            defaultColor = this._lineColor.map(c => Math.floor(c * 255));
        } else {
            defaultColor = this._lineColor;
        }

        PathRenderer.updateCanvas(this.canvas, this.widget, this.path, defaultColor, this._lineWidth);
    }

    /**
     * Draw an SVG file onto the canvas.
     * @param {string} svgInput - SVG content, URL, or Document
     * @param {Object} options - Drawing options
     * @param {boolean} options.animate - Whether to generate animation frames
     * @param {string} options.animType - Animation type ('seq' for sequential or 'par' for parallel)
     * @param {boolean} options.fill - Whether to fill the drawing
     * @param {number} options.lineWidth - Width of lines
     * @param {number[]} options.lineColor - Color of lines (RGBA tuple)
     * @param {number} options.dur - Duration of each animation step
     * @param {number} options.fps - Frames per second for animation
     * @param {boolean} options.fromShapeAnim - Whether called from shape_animate
     * @param {boolean} options.handDraw - Whether to show a hand drawing
     * @param {string} options.handImage - Path to custom hand image
     * @param {number} options.handScale - Scale factor for hand image
     * @param {number[]} options.handOffset - Offset [x, y] from drawing point
     * @returns {Array|null} List of animation frames if animate=true, null otherwise
     */
    draw(svgInput, options = {}) {
        const {
            animate = false,
            animType = 'seq',
            fill = this._fill,
            lineWidth = this._lineWidth,
            lineColor = this._lineColor,
            dur = this._animationDuration,
            fps = 30,
            fromShapeAnim = false,
            handDraw = false,
            handImage = null,
            handScale = 0.30,
            handOffset = [-15, -140]
        } = options;

        const effectiveAnimType = ['seq', 'par'].includes(animType) ? animType : 'seq';

        // Update instance attributes
        this._fill = fill;
        this._lineWidth = lineWidth;
        this._lineColor = lineColor;
        this._animationDuration = dur;
        this.currentSvgFile = svgInput;

        // Set up hand overlay if enabled
        this._handDrawEnabled = handDraw && animate;
        if (this._handDrawEnabled) {
            this._handOverlay = new HandOverlay({
                handImagePath: handImage,
                scale: handScale,
                offset: handOffset
            });
        } else {
            this._handOverlay = null;
        }

        // Process SVG if different from previous
        if (svgInput !== this._previousSvgFile) {
            const [svgSize, closedShapes, path] = DrawingManager.processPathData(svgInput);
            this.svgSize = svgSize;
            this.closedShapes = closedShapes;
            this.path = path;
            this._previousSvgFile = svgInput;
        }

        // Calculate paths
        const animList = DrawingManager.calculatePaths(
            this.widget,
            this.closedShapes,
            this.svgSize,
            svgInput,
            animate,
            lineWidth,
            dur
        );

        // Handle rendering
        if (!fromShapeAnim) {
            if (animate) {
                // Generate animation frames
                const frames = this._generateAnimationFrames(animList, fill, fps, effectiveAnimType);
                this._frames = frames;
                return frames;
            } else {
                // Static rendering
                Animation.cancelAll(this.widget);
                this.canvas.clear();

                if (fill) {
                    // Draw fills first
                    this.fillUpShapes();
                    // Then draw strokes on top
                    this.updateCanvas();
                } else {
                    // Draw only strokes
                    this.updateCanvas();
                }

                // Show on canvas element if provided
                if (this.canvasElement) {
                    this.canvas.show(this.canvasElement);
                }

                return null;
            }
        }

        return null;
    }

    /**
     * Draw SVG asynchronously (for browser file loading).
     * @param {string} svgUrl - URL to the SVG file
     * @param {Object} options - Drawing options (same as draw())
     * @returns {Promise<Array|null>} Promise resolving to frames or null
     */
    async drawAsync(svgUrl, options = {}) {
        // Load and process SVG
        const [svgSize, closedShapes, path] = await DrawingManager.processPathDataAsync(svgUrl);
        this.svgSize = svgSize;
        this.closedShapes = closedShapes;
        this.path = path;
        this._previousSvgFile = svgUrl;

        // Continue with regular draw using parsed data
        return this.draw(svgUrl, { ...options, fromShapeAnim: false });
    }

    /**
     * Generate animation frames for export.
     * @private
     */
    _generateAnimationFrames(animList, fill, fps, animType) {
        const frames = [];

        if (!animList || animList.length === 0) {
            // No animations, just return current canvas
            this.canvas.clear();
            if (fill) {
                this.fillUpShapes();
            } else {
                this.updateCanvas();
            }
            frames.push(this.canvas.getImage());
            return frames;
        }

        // Calculate total animation duration
        let totalDuration;
        if (animType === 'seq') {
            totalDuration = animList.reduce((sum, anim) => sum + anim.duration, 0);
        } else {
            totalDuration = Math.max(...animList.map(anim => anim.duration));
        }

        // Store the stroke animation duration for hand visibility
        const strokeDuration = totalDuration;

        // Add time for fill animation if needed
        if (fill) {
            totalDuration += 0.4;
        }

        const numFrames = Math.max(1, Math.floor(totalDuration * fps));

        // Store initial values for all animated properties
        const initialValues = {};
        for (const anim of animList) {
            for (const key of Object.keys(anim.animatedProperties)) {
                if (!(key in initialValues)) {
                    initialValues[key] = this.widget[key] || 0;
                }
            }
        }

        // Generate frames by interpolating animation states
        for (let frameIdx = 0; frameIdx <= numFrames; frameIdx++) {
            const progress = numFrames > 0 ? frameIdx / numFrames : 1.0;
            const currentTime = progress * totalDuration;

            // Update animation properties for current time
            const currentAnimIdx = this._updateAnimationState(animList, currentTime, animType, initialValues);

            // Clear and redraw
            this.canvas.clear();

            // Calculate fill opacity
            const fillStartTime = fill ? totalDuration - 0.4 : totalDuration;
            const isDuringStroke = currentTime < strokeDuration;

            if (fill && currentTime >= fillStartTime) {
                const fillProgress = (currentTime - fillStartTime) / 0.4;
                this.widget.mesh_opacity = Math.min(1.0, fillProgress);
                this.fillUpShapes();
                // Draw strokes on top of fills only while fill is transitioning
                if (fillProgress < FILL_COMPLETION_THRESHOLD) {
                    this.updateCanvas();
                }
            } else if (fill) {
                this.widget.mesh_opacity = 0.0;
                this.updateCanvas();
            } else {
                this.updateCanvas();
            }

            // Get the current frame image
            let frameImage = this.canvas.getImage();

            // Add hand overlay if enabled and we're during stroke animation
            if (this._handDrawEnabled && this._handOverlay && this._handOverlay.isLoaded && isDuringStroke) {
                const handPos = this._getCurrentDrawingPosition(animList, currentAnimIdx, animType);
                if (handPos) {
                    frameImage = this._handOverlay.overlayAtPosition(frameImage, handPos[0], handPos[1]);
                }
            }

            frames.push(frameImage);
        }

        return frames;
    }

    /**
     * Get the current drawing position (tip of the stroke being drawn).
     * @private
     */
    _getCurrentDrawingPosition(animList, currentAnimIdx, animType) {
        if (!animList || currentAnimIdx < 0) {
            return null;
        }

        if (animType === 'seq') {
            if (currentAnimIdx >= animList.length) {
                return null;
            }

            const anim = animList[currentAnimIdx];
            const props = anim.animatedProperties;

            // Check for line end points
            for (const key of Object.keys(props)) {
                if (key.endsWith('_end_x')) {
                    const prefix = key.slice(0, -6);
                    const x = this.widget[`${prefix}_end_x`];
                    const y = this.widget[`${prefix}_end_y`];
                    if (x !== undefined && y !== undefined) {
                        return [Math.floor(x), Math.floor(y)];
                    }
                }
            }
        } else {
            // For parallel animation, find the most active animation
            if (animList.length > 0) {
                const anim = animList[animList.length - 1];
                const props = anim.animatedProperties;
                for (const key of Object.keys(props)) {
                    if (key.endsWith('_end_x')) {
                        const prefix = key.slice(0, -6);
                        const x = this.widget[`${prefix}_end_x`];
                        const y = this.widget[`${prefix}_end_y`];
                        if (x !== undefined && y !== undefined) {
                            return [Math.floor(x), Math.floor(y)];
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Update widget properties based on animation state at current time.
     * @private
     */
    _updateAnimationState(animList, currentTime, animType, initialValues) {
        let currentAnimIdx = -1;

        if (animType === 'seq') {
            // Sequential: run animations one after another
            let elapsed = 0;
            const completedValues = { ...initialValues };

            for (let idx = 0; idx < animList.length; idx++) {
                const anim = animList[idx];
                const animEndTime = elapsed + anim.duration;

                if (currentTime < elapsed) {
                    break;
                } else if (currentTime >= elapsed && currentTime < animEndTime) {
                    currentAnimIdx = idx;
                    let localProgress = anim.duration > 0 
                        ? (currentTime - elapsed) / anim.duration 
                        : 1.0;
                    localProgress = Math.min(1.0, Math.max(0.0, localProgress));
                    const t = anim._transition(localProgress);

                    for (const [key, target] of Object.entries(anim.animatedProperties)) {
                        const startVal = completedValues[key] !== undefined 
                            ? completedValues[key] 
                            : (initialValues[key] || 0);
                        const value = startVal + (target - startVal) * t;
                        this.widget[key] = value;
                    }
                    break;
                } else {
                    // Animation completed, update completed values
                    for (const [key, target] of Object.entries(anim.animatedProperties)) {
                        completedValues[key] = target;
                        this.widget[key] = target;
                    }
                }

                elapsed = animEndTime;
            }
        } else {
            // Parallel: run all animations at once
            for (let idx = 0; idx < animList.length; idx++) {
                const anim = animList[idx];
                let progress = anim.duration > 0 ? currentTime / anim.duration : 1.0;
                progress = Math.min(1.0, Math.max(0.0, progress));
                if (progress < 1.0) {
                    currentAnimIdx = idx;
                }
                const t = anim._transition(progress);

                for (const [key, target] of Object.entries(anim.animatedProperties)) {
                    const startVal = initialValues[key] || 0;
                    const value = startVal + (target - startVal) * t;
                    this.widget[key] = value;
                }
            }
        }

        return currentAnimIdx;
    }

    /**
     * Draw text on the canvas with optional animation.
     * @param {string} text - The text to draw
     * @param {number} x - X position in pixels
     * @param {number} y - Y position in pixels
     * @param {Object} options - Text options
     * @returns {Array|null} List of animation frames if animate=true, null otherwise
     */
    drawText(text, x = 0, y = 0, options = {}) {
        const {
            animate = false,
            fontFamily = 'sans-serif',
            fontSize = 32,
            fontWeight = 'normal',
            fontStyle = 'normal',
            fill = [0, 0, 0, 255],
            stroke = null,
            strokeWidth = null,
            textAnchor = 'start',
            letterSpacing = 0,
            textDecoration = 'none',
            opacity = 1.0,
            fps = 30,
            duration = 1.0,
            handDraw = false,
            handImage = null,
            handScale = 0.30,
            handOffset = [-15, -140]
        } = options;

        const { hexToRgba, colorTo01Range } = require('./utils/ColorUtils.js');

        // Parse fill color
        let fillColor;
        if (typeof fill === 'string') {
            const fillRgba = hexToRgba(fill);
            fillColor = colorTo01Range(fillRgba);
        } else if (Array.isArray(fill)) {
            if (fill.length < 3) {
                fillColor = [0, 0, 0, 1.0];
            } else if (fill.slice(0, 3).every(c => c <= 1.0)) {
                fillColor = [...fill];
                if (fillColor.length === 3) fillColor.push(1.0);
            } else {
                fillColor = fill.slice(0, 3).map(c => c / 255.0);
                const alpha = fill.length > 3 ? fill[3] / 255.0 : 1.0;
                fillColor.push(alpha);
            }
        }

        // Parse stroke color
        let strokeColor = null;
        if (stroke) {
            if (typeof stroke === 'string') {
                const strokeRgba = hexToRgba(stroke);
                strokeColor = colorTo01Range(strokeRgba);
            } else if (Array.isArray(stroke) && stroke.length >= 3) {
                if (stroke.slice(0, 3).every(c => c <= 1.0)) {
                    strokeColor = [...stroke];
                    if (strokeColor.length === 3) strokeColor.push(1.0);
                } else {
                    strokeColor = stroke.slice(0, 3).map(c => c / 255.0);
                    const alpha = stroke.length > 3 ? stroke[3] / 255.0 : 1.0;
                    strokeColor.push(alpha);
                }
            }
        }

        // Build text data dictionary
        const textData = {
            text: text,
            x: x,
            y: y,
            font_family: fontFamily,
            font_size: fontSize,
            font_weight: fontWeight,
            font_style: fontStyle,
            fill: fillColor,
            stroke: strokeColor,
            stroke_width: strokeWidth,
            text_anchor: textAnchor,
            dominant_baseline: 'auto',
            letter_spacing: letterSpacing,
            text_decoration: textDecoration,
            opacity: opacity,
            id: 'direct_text'
        };

        if (animate) {
            // Set up hand overlay if enabled
            let handOverlay = null;
            if (handDraw) {
                handOverlay = new HandOverlay({
                    handImagePath: handImage,
                    scale: handScale,
                    offset: handOffset
                });
            }

            // Generate character-by-character animation frames
            const frames = this._generateTextAnimationFrames(textData, fps, duration, handOverlay);
            this._frames = frames;
            return frames;
        } else {
            // Static rendering
            TextRenderer.drawText(this.canvas, textData, 1.0, 1.0, 0, 0, 1.0, -1);

            if (this.canvasElement) {
                this.canvas.show(this.canvasElement);
            }

            return null;
        }
    }

    /**
     * Generate animation frames for a single text element.
     * @private
     */
    _generateTextAnimationFrames(textData, fps, duration, handOverlay = null) {
        const frames = [];
        const text = textData.text;
        const totalChars = text.length;
        const numFrames = Math.max(1, Math.floor(duration * fps));

        for (let frameIdx = 0; frameIdx <= numFrames; frameIdx++) {
            const progress = numFrames > 0 ? frameIdx / numFrames : 1.0;
            const charReveal = Math.floor(progress * totalChars);

            // Clear and redraw
            this.canvas.clear();

            TextRenderer.drawText(this.canvas, textData, 1.0, 1.0, 0, 0, 1.0, charReveal);

            // Get the current frame image
            let frameImage = this.canvas.getImage();

            // Add hand overlay if enabled and animation is in progress
            if (handOverlay && handOverlay.isLoaded && charReveal < totalChars) {
                const handPos = TextRenderer.getCharPosition(textData, charReveal, 1.0, 1.0, 0, 0);
                if (handPos) {
                    frameImage = handOverlay.overlayAtPosition(frameImage, handPos[0], handPos[1]);
                }
            }

            frames.push(frameImage);
        }

        return frames;
    }

    /**
     * Save the current canvas to an image file.
     * @param {string} filename - Output filename
     */
    saveImage(filename) {
        this.canvas.save(filename);
    }

    /**
     * Save animation frames to a video file.
     * @param {string} filename - Output filename
     * @param {number} fps - Frames per second
     * @returns {Promise<boolean>} Promise resolving to true if successful
     */
    async saveAnimation(filename, fps = 30) {
        const { writeVideo } = require('./export/VideoExporter.js');

        if (!this._frames || this._frames.length === 0) {
            return false;
        }

        return writeVideo(this._frames, filename, fps);
    }

    /**
     * Save animation frames to a GIF file.
     * @param {string} filename - Output filename
     * @param {number} fps - Frames per second
     * @returns {Promise<boolean>} Promise resolving to true if successful
     */
    async saveGIF(filename, fps = 30) {
        const { saveGIF } = require('./export/GIFExporter.js');

        if (!this._frames || this._frames.length === 0) {
            return false;
        }

        return saveGIF(this._frames, filename, fps);
    }

    /**
     * Get the current canvas as a cv.Mat.
     * @returns {cv.Mat} Canvas image
     */
    getImage() {
        return this.canvas.getImage();
    }

    /**
     * Get the stored animation frames.
     * @returns {Array} List of frame images
     */
    getFrames() {
        return [...this._frames];
    }

    /**
     * Clear the canvas.
     */
    clear() {
        this.canvas.clear();
        this._frames = [];

        if (this.canvasElement) {
            this.canvas.show(this.canvasElement);
        }
    }

    /**
     * Free memory (IMPORTANT for WASM).
     */
    delete() {
        if (this.canvas) {
            this.canvas.delete();
            this.canvas = null;
        }
        if (this._handOverlay) {
            this._handOverlay.delete();
            this._handOverlay = null;
        }
        // Delete all frame Mats
        for (const frame of this._frames) {
            if (frame && frame.delete) {
                frame.delete();
            }
        }
        this._frames = [];
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Kivg, PropertyHolder, FILL_COMPLETION_THRESHOLD };
}

if (typeof window !== 'undefined') {
    window.Kivg = Kivg;
    window.PropertyHolder = PropertyHolder;
}
