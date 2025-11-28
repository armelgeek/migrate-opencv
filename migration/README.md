# Kivg.js - SVG Drawing and Animation using OpenCV.js

This is the JavaScript migration of the Python `kivg` library. It provides SVG drawing and animation capabilities using OpenCV.js for browser-based rendering.

## Overview

This library is a direct port of the Python `kivg` library to JavaScript, following the migration strategy documented in `MIGRATION_OPENCVJS.md`. It maintains the same API structure and functionality while adapting to browser and JavaScript environments.

## Directory Structure

```
migration/
├── core/
│   ├── OpenCVCanvas.js    # Canvas wrapper for OpenCV.js (replaces kivy.graphics.Canvas)
│   ├── Animation.js       # Animation engine (replaces kivy.animation)
│   └── Easing.js          # Easing/transition functions
├── parsing/
│   ├── SVGParser.js       # SVG file parsing
│   └── PathParser.js      # SVG path command parsing
├── rendering/
│   ├── PathRenderer.js    # Path stroke rendering
│   ├── ShapeRenderer.js   # Shape filling
│   ├── TextRenderer.js    # Text rendering
│   └── HandOverlay.js     # Hand animation overlay
├── drawing/
│   └── DrawingManager.js  # SVG path processing
├── animation/
│   ├── AnimationHandler.js # Animation orchestration
│   └── ShapeAnimator.js   # Shape-specific animations
├── export/
│   ├── ImageExporter.js   # Image export (PNG, JPEG)
│   ├── VideoExporter.js   # Video export (WebM)
│   └── GIFExporter.js     # GIF export
├── utils/
│   ├── ColorUtils.js      # Color conversion utilities
│   ├── PathUtils.js       # Path transformation utilities
│   └── DataClasses.js     # Data structures
├── Kivg.js                # Main API class
├── index.js               # Module exports
├── package.json           # npm package configuration
└── README.md              # This file
```

## Python to JavaScript Mapping

| Python Module | JavaScript Module | Description |
|--------------|-------------------|-------------|
| `kivg/main.py` | `Kivg.js` | Main API class |
| `kivg/core/canvas.py` | `core/OpenCVCanvas.js` | OpenCV canvas wrapper |
| `kivg/core/animation.py` | `core/Animation.js` | Animation system |
| `kivg/core/easing.py` | `core/Easing.js` | Easing functions |
| `kivg/svg_parser.py` | `parsing/SVGParser.js` | SVG parsing |
| `kivg/rendering/path_renderer.py` | `rendering/PathRenderer.js` | Path rendering |
| `kivg/rendering/shape_renderer.py` | `rendering/ShapeRenderer.js` | Shape filling |
| `kivg/rendering/text_renderer.py` | `rendering/TextRenderer.js` | Text rendering |
| `kivg/rendering/hand_overlay.py` | `rendering/HandOverlay.js` | Hand overlay |
| `kivg/drawing/manager.py` | `drawing/DrawingManager.js` | Drawing management |
| `kivg/animation/handler.py` | `animation/AnimationHandler.js` | Animation handling |
| `kivg/animation/animation_shapes.py` | `animation/ShapeAnimator.js` | Shape animation |
| `kivg/export/video.py` | `export/VideoExporter.js` | Video export |
| `kivg/export/gif.py` | `export/GIFExporter.js` | GIF export |
| `kivg/export/image.py` | `export/ImageExporter.js` | Image export |
| `kivg/color_utils.py` | `utils/ColorUtils.js` | Color utilities |
| `kivg/path_utils.py` | `utils/PathUtils.js` | Path utilities |
| `kivg/data_classes.py` | `utils/DataClasses.js` | Data structures |

## Requirements

- OpenCV.js (must be loaded before using this library)
- Modern browser with Canvas and MediaRecorder API support
- Optional: GIF.js library for GIF export

## Usage

### In Browser (ES6 Modules)

```html
<!-- Load OpenCV.js first -->
<script async src="https://docs.opencv.org/4.x/opencv.js" onload="onOpenCvReady();"></script>

<!-- Load Kivg.js modules -->
<script type="module">
import { Kivg } from './migration/Kivg.js';

function onOpenCvReady() {
    const kivg = new Kivg({
        width: 512,
        height: 512,
        canvasElement: 'myCanvas'
    });

    // Draw SVG
    kivg.draw(svgContent, { fill: true });
}
</script>
```

### In Browser (Script Tags)

```html
<!-- Load OpenCV.js first -->
<script async src="https://docs.opencv.org/4.x/opencv.js"></script>

<!-- Load Kivg.js (all modules expose to window object) -->
<script src="./migration/core/Easing.js"></script>
<script src="./migration/core/Animation.js"></script>
<script src="./migration/utils/ColorUtils.js"></script>
<script src="./migration/utils/PathUtils.js"></script>
<script src="./migration/core/OpenCVCanvas.js"></script>
<!-- ... load other modules ... -->
<script src="./migration/Kivg.js"></script>

<script>
cv['onRuntimeInitialized'] = () => {
    const kivg = new Kivg({
        width: 512,
        height: 512,
        canvasElement: document.getElementById('myCanvas')
    });

    // Draw SVG
    kivg.draw(svgContent, { fill: true });
};
</script>
```

## API Reference

### Kivg Class

```javascript
const kivg = new Kivg({
    width: 512,        // Canvas width in pixels
    height: 512,       // Canvas height in pixels
    background: [0, 0, 0, 0], // RGBA background color (0-255)
    canvasElement: 'canvasId' // Canvas element or selector
});
```

#### Methods

##### draw(svgInput, options)

Draw an SVG file onto the canvas.

```javascript
const frames = kivg.draw(svgContent, {
    animate: true,           // Generate animation frames
    animType: 'seq',        // 'seq' or 'par'
    fill: true,             // Fill shapes
    lineWidth: 2,           // Stroke width
    lineColor: [0, 0, 0, 255], // Stroke color (RGBA)
    dur: 0.02,              // Animation step duration
    fps: 30,                // Frames per second
    handDraw: false,        // Show drawing hand
    handImage: null,        // Custom hand image
    handScale: 0.30,        // Hand image scale
    handOffset: [-15, -140] // Hand offset from point
});
```

##### drawAsync(svgUrl, options)

Draw an SVG file asynchronously (for browser file loading).

```javascript
const frames = await kivg.drawAsync('/path/to/file.svg', { animate: true });
```

##### drawText(text, x, y, options)

Draw text on the canvas.

```javascript
const frames = kivg.drawText('Hello World', 100, 100, {
    animate: true,
    fontFamily: 'sans-serif',
    fontSize: 32,
    fill: [0, 0, 0, 255],
    fps: 30,
    duration: 1.0
});
```

##### saveImage(filename)

Save the current canvas as an image (triggers download in browser).

```javascript
kivg.saveImage('output.png');
```

##### saveAnimation(filename, fps)

Save animation frames as a WebM video.

```javascript
await kivg.saveAnimation('animation.webm', 30);
```

##### saveGIF(filename, fps)

Save animation frames as a GIF (requires GIF.js library).

```javascript
await kivg.saveGIF('animation.gif', 30);
```

##### getImage()

Get the current canvas as a cv.Mat.

```javascript
const mat = kivg.getImage();
```

##### getFrames()

Get the stored animation frames.

```javascript
const frames = kivg.getFrames();
```

##### clear()

Clear the canvas.

```javascript
kivg.clear();
```

##### delete()

Free memory (IMPORTANT for WASM).

```javascript
kivg.delete();
```

## Animation System

The animation system mirrors the Python implementation:

```javascript
const { Animation, AnimationTransition } = require('./core/Animation.js');

// Create an animation
const anim = new Animation({
    d: 1.0,           // Duration in seconds
    t: 'out_quad',    // Transition function
    x: 100,           // Target value for 'x' property
    y: 200            // Target value for 'y' property
});

// Bind callbacks
anim.bind({
    on_start: (anim, widget) => console.log('Started'),
    on_progress: (anim, widget, progress) => console.log(`Progress: ${progress}`),
    on_complete: (anim, widget) => console.log('Complete')
});

// Start animation
anim.start(widget);

// Sequential animation
const seqAnim = anim1.add(anim2);

// Parallel animation
const parAnim = anim1.and(anim2);
```

### Available Easing Functions

- `linear`
- `in_quad`, `out_quad`, `in_out_quad`
- `in_cubic`, `out_cubic`, `in_out_cubic`
- `in_quart`, `out_quart`, `in_out_quart`
- `in_quint`, `out_quint`, `in_out_quint`
- `in_sine`, `out_sine`, `in_out_sine`
- `in_expo`, `out_expo`, `in_out_expo`
- `in_circ`, `out_circ`, `in_out_circ`
- `in_elastic`, `out_elastic`, `in_out_elastic`
- `in_back`, `out_back`, `in_out_back`
- `in_bounce`, `out_bounce`, `in_out_bounce`

## Memory Management

Since OpenCV.js uses WebAssembly, it's important to properly free memory:

```javascript
// Always delete Mats when done
const mat = kivg.getImage();
// ... use mat ...
mat.delete();

// Delete Kivg instance when done
kivg.delete();
```

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Dependencies

- **OpenCV.js**: Required for all rendering operations
- **GIF.js** (optional): Required for GIF export

## License

MIT License

## Credits

This is a JavaScript port of the Python [kivg](https://github.com/armelgeek/migrate-opencv) library.
