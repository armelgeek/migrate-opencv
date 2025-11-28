/**
 * OpenCVCanvas - Canvas based on OpenCV.js for SVG rendering.
 * Replaces kivy.graphics.Canvas for headless rendering in the browser.
 * 
 * This is the JavaScript equivalent of kivg/core/canvas.py
 */

/**
 * Normalize color to RGBA format with 0-255 range.
 * Inline version to avoid circular dependencies.
 * @param {number[]} color - Color as array (RGB or RGBA)
 * @param {string} inputRange - 'auto' (detect), '0-1', or '0-255'
 * @returns {number[]} RGBA array with values in 0-255 range
 */
function normalizeColorInline(color, inputRange = 'auto') {
    if (!color || color.length < 3) {
        return [0, 0, 0, 255];
    }

    let r = color[0];
    let g = color[1];
    let b = color[2];
    let a = color.length > 3 ? color[3] : 1.0;

    if (inputRange === 'auto') {
        if (Math.max(r, g, b) <= 1.0) {
            inputRange = '0-1';
        } else {
            inputRange = '0-255';
        }
    }

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

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    a = Math.max(0, Math.min(255, a));

    return [r, g, b, a];
}

/**
 * Canvas based on OpenCV.js to replace kivy.graphics.Canvas
 */
class OpenCVCanvas {
    /**
     * Initialize the canvas.
     * @param {number} width - Canvas width in pixels
     * @param {number} height - Canvas height in pixels
     * @param {number[]} background - RGBA background color (0-255 for each component)
     */
    constructor(width, height, background = [255, 255, 255, 255]) {
        this.width = width;
        this.height = height;
        this.background = background;
        
        // Create the Mat RGBA
        this.mat = new cv.Mat(height, width, cv.CV_8UC4);
        this.clear();
    }

    /**
     * Clear the canvas to background color.
     */
    clear() {
        this.mat.setTo(new cv.Scalar(...this.background));
    }

    /**
     * Draw a line on the canvas.
     * @param {number[]} start - Start point [x, y]
     * @param {number[]} end - End point [x, y]
     * @param {number[]} color - RGBA color (0-255 for each component)
     * @param {number} thickness - Line thickness
     */
    drawLine(start, end, color, thickness = 1) {
        const rgba = normalizeColorInline(color, '0-255');

        // Handle alpha blending
        if (rgba[3] < 255) {
            const overlay = this.mat.clone();
            cv.line(
                overlay,
                new cv.Point(start[0], start[1]),
                new cv.Point(end[0], end[1]),
                new cv.Scalar(rgba[0], rgba[1], rgba[2], 255),
                thickness,
                cv.LINE_AA,
                0
            );
            const alpha = rgba[3] / 255.0;
            cv.addWeighted(overlay, alpha, this.mat, 1 - alpha, 0, this.mat);
            overlay.delete();
        } else {
            cv.line(
                this.mat,
                new cv.Point(start[0], start[1]),
                new cv.Point(end[0], end[1]),
                new cv.Scalar(...rgba),
                thickness,
                cv.LINE_AA,
                0
            );
        }
    }

    /**
     * Draw polylines on the canvas.
     * @param {number[][]} points - Array of points [[x1, y1], [x2, y2], ...]
     * @param {number[]} color - RGBA color (0-255 for each component)
     * @param {number} thickness - Line thickness
     * @param {boolean} closed - Whether to close the polyline
     */
    drawPolylines(points, color, thickness = 1, closed = false) {
        const rgba = normalizeColorInline(color, '0-255');

        // Convert points to MatVector
        const flatPoints = points.flat();
        const pointsMat = cv.matFromArray(points.length, 1, cv.CV_32SC2, flatPoints);
        const pts = new cv.MatVector();
        pts.push_back(pointsMat);

        if (rgba[3] < 255) {
            const overlay = this.mat.clone();
            cv.polylines(
                overlay,
                pts,
                closed,
                new cv.Scalar(rgba[0], rgba[1], rgba[2], 255),
                thickness,
                cv.LINE_AA,
                0
            );
            const alpha = rgba[3] / 255.0;
            cv.addWeighted(overlay, alpha, this.mat, 1 - alpha, 0, this.mat);
            overlay.delete();
        } else {
            cv.polylines(
                this.mat,
                pts,
                closed,
                new cv.Scalar(...rgba),
                thickness,
                cv.LINE_AA,
                0
            );
        }

        // Free memory
        pts.delete();
        pointsMat.delete();
    }

    /**
     * Draw a cubic Bezier curve on the canvas.
     * @param {number[]} start - Start point [x, y]
     * @param {number[]} ctrl1 - First control point [x, y]
     * @param {number[]} ctrl2 - Second control point [x, y]
     * @param {number[]} end - End point [x, y]
     * @param {number[]} color - RGBA color (0-255 for each component)
     * @param {number} thickness - Line thickness
     * @param {number} segments - Number of segments for curve approximation
     */
    drawBezier(start, ctrl1, ctrl2, end, color, thickness = 1, segments = 150) {
        const points = OpenCVCanvas.calculateBezierPoints(start, ctrl1, ctrl2, end, segments);
        this.drawPolylines(points, color, thickness, false);
    }

    /**
     * Fill a polygon with color.
     * @param {number[][]} points - List of polygon vertices [[x1, y1], [x2, y2], ...]
     * @param {number[]} color - RGBA color (0-255 for each component)
     */
    fillPolygon(points, color) {
        const rgba = normalizeColorInline(color, '0-255');

        // Convert points to MatVector
        const flatPoints = points.flat();
        const pointsMat = cv.matFromArray(points.length, 1, cv.CV_32SC2, flatPoints);
        const pts = new cv.MatVector();
        pts.push_back(pointsMat);

        if (rgba[3] < 255) {
            const overlay = this.mat.clone();
            cv.fillPoly(overlay, pts, new cv.Scalar(rgba[0], rgba[1], rgba[2], 255));
            const alpha = rgba[3] / 255.0;
            cv.addWeighted(overlay, alpha, this.mat, 1 - alpha, 0, this.mat);
            overlay.delete();
        } else {
            cv.fillPoly(this.mat, pts, new cv.Scalar(...rgba));
        }

        // Free memory
        pts.delete();
        pointsMat.delete();
    }

    /**
     * Fill multiple polygons with holes support.
     * @param {number[][][]} contours - List of contours
     * @param {number[]} color - RGBA color (0-255 for each component)
     */
    fillPolygonsWithHoles(contours, color) {
        if (!contours || contours.length === 0) {
            return;
        }

        const rgba = normalizeColorInline(color, '0-255');

        // Convert all contours to MatVector
        const pts = new cv.MatVector();
        const matRefs = [];

        for (const contour of contours) {
            if (contour.length >= 3) {
                const flatPoints = contour.flat();
                const pointsMat = cv.matFromArray(contour.length, 1, cv.CV_32SC2, flatPoints);
                pts.push_back(pointsMat);
                matRefs.push(pointsMat);
            }
        }

        if (pts.size() === 0) {
            pts.delete();
            return;
        }

        if (rgba[3] < 255) {
            const overlay = this.mat.clone();
            cv.fillPoly(overlay, pts, new cv.Scalar(rgba[0], rgba[1], rgba[2], 255));
            const alpha = rgba[3] / 255.0;
            cv.addWeighted(overlay, alpha, this.mat, 1 - alpha, 0, this.mat);
            overlay.delete();
        } else {
            cv.fillPoly(this.mat, pts, new cv.Scalar(...rgba));
        }

        // Free memory
        matRefs.forEach(mat => mat.delete());
        pts.delete();
    }

    /**
     * Calculate discrete points along a cubic Bezier curve.
     * Uses Bernstein polynomials: B(t) = (1-t)³P0 + 3t(1-t)²P1 + 3t²(1-t)P2 + t³P3
     * 
     * @param {number[]} start - Start point [x, y]
     * @param {number[]} ctrl1 - First control point [x, y]
     * @param {number[]} ctrl2 - Second control point [x, y]
     * @param {number[]} end - End point [x, y]
     * @param {number} segments - Number of segments
     * @returns {number[][]} List of points along the curve
     */
    static calculateBezierPoints(start, ctrl1, ctrl2, end, segments = 150) {
        const points = [];
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;

            // Bernstein polynomials
            const b0 = Math.pow(1 - t, 3);
            const b1 = 3 * t * Math.pow(1 - t, 2);
            const b2 = 3 * Math.pow(t, 2) * (1 - t);
            const b3 = Math.pow(t, 3);

            const x = b0 * start[0] + b1 * ctrl1[0] + b2 * ctrl2[0] + b3 * end[0];
            const y = b0 * start[1] + b1 * ctrl1[1] + b2 * ctrl2[1] + b3 * end[1];

            // Use Math.round instead of parseInt for better precision
            points.push([Math.round(x), Math.round(y)]);
        }

        return points;
    }

    /**
     * Display on an HTML canvas element.
     * @param {HTMLCanvasElement|string} canvasElement - Canvas element or selector
     */
    show(canvasElement) {
        cv.imshow(canvasElement, this.mat);
    }

    /**
     * Get the image as ImageData for HTML Canvas.
     * @returns {ImageData} Image data object
     */
    getImageData() {
        // Convert BGRA → RGBA for HTML Canvas
        const rgba = new cv.Mat();
        cv.cvtColor(this.mat, rgba, cv.COLOR_BGRA2RGBA);

        const imageData = new ImageData(
            new Uint8ClampedArray(rgba.data),
            this.width,
            this.height
        );

        rgba.delete();
        return imageData;
    }

    /**
     * Export to Data URL (for download).
     * @param {string} type - Image type ('image/png' or 'image/jpeg')
     * @returns {string} Data URL
     */
    toDataURL(type = 'image/png') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.putImageData(this.getImageData(), 0, 0);
        return tempCanvas.toDataURL(type);
    }

    /**
     * Get the current canvas as a numpy-like array (RGBA format).
     * @returns {cv.Mat} Copy of the canvas image
     */
    getImage() {
        return this.mat.clone();
    }

    /**
     * Get the canvas as BGR format (for OpenCV functions).
     * @returns {cv.Mat} Canvas image in BGR format
     */
    getBGRImage() {
        const bgr = new cv.Mat();
        cv.cvtColor(this.mat, bgr, cv.COLOR_RGBA2BGR);
        return bgr;
    }

    /**
     * Save the canvas to a file (browser download).
     * @param {string} filename - Output filename
     */
    save(filename) {
        const dataUrl = this.toDataURL(filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    }

    /**
     * Free the OpenCV Mat memory (IMPORTANT for WASM).
     */
    delete() {
        if (this.mat) {
            this.mat.delete();
            this.mat = null;
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OpenCVCanvas };
}

if (typeof window !== 'undefined') {
    window.OpenCVCanvas = OpenCVCanvas;
}
