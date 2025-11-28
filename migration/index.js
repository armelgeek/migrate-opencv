/**
 * Kivg - SVG drawing and animation using OpenCV.js
 * Headless rendering without UI dependencies.
 * 
 * This is the JavaScript migration of the Python kivg library.
 */

// Core modules
const { OpenCVCanvas } = require('./core/OpenCVCanvas.js');
const { Animation, Sequence, Parallel } = require('./core/Animation.js');
const { AnimationTransition } = require('./core/Easing.js');

// Utils
const ColorUtils = require('./utils/ColorUtils.js');
const PathUtils = require('./utils/PathUtils.js');
const { AnimationContext, PathElement, SVGPathData, TextData, RenderingContext } = require('./utils/DataClasses.js');

// Parsing
const SVGParser = require('./parsing/SVGParser.js');
const { Move, Close, Line, CubicBezier, QuadraticBezier, Arc, parsePath } = require('./parsing/PathParser.js');

// Rendering
const { PathRenderer } = require('./rendering/PathRenderer.js');
const { ShapeRenderer } = require('./rendering/ShapeRenderer.js');
const { TextRenderer } = require('./rendering/TextRenderer.js');
const { HandOverlay } = require('./rendering/HandOverlay.js');

// Drawing
const { DrawingManager } = require('./drawing/DrawingManager.js');

// Animation
const { AnimationHandler } = require('./animation/AnimationHandler.js');
const { ShapeAnimator } = require('./animation/ShapeAnimator.js');

// Export
const ImageExporter = require('./export/ImageExporter.js');
const { VideoExporter, writeVideo, isVideoExportSupported } = require('./export/VideoExporter.js');
const { GIFExporter, saveGIF, hasGIFSupport } = require('./export/GIFExporter.js');

// Main
const { Kivg, PropertyHolder } = require('./Kivg.js');

// Version
const VERSION = '1.0.0';

// Export all modules
module.exports = {
    // Main class
    Kivg,
    PropertyHolder,

    // Core
    OpenCVCanvas,
    Animation,
    Sequence,
    Parallel,
    AnimationTransition,

    // Utils
    ColorUtils,
    PathUtils,
    AnimationContext,
    PathElement,
    SVGPathData,
    TextData,
    RenderingContext,

    // Parsing
    SVGParser,
    Move,
    Close,
    Line,
    CubicBezier,
    QuadraticBezier,
    Arc,
    parsePath,

    // Rendering
    PathRenderer,
    ShapeRenderer,
    TextRenderer,
    HandOverlay,

    // Drawing
    DrawingManager,

    // Animation
    AnimationHandler,
    ShapeAnimator,

    // Export
    ImageExporter,
    VideoExporter,
    writeVideo,
    isVideoExportSupported,
    GIFExporter,
    saveGIF,
    hasGIFSupport,

    // Version
    VERSION,
    __version__: VERSION
};
