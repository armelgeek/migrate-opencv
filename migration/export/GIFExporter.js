/**
 * GIF export functionality using gif.js library.
 * 
 * This is the JavaScript equivalent of kivg/export/gif.py
 */

/**
 * GIF exporter using gif.js library.
 */
class GIFExporter {
    /**
     * Initialize the GIF exporter.
     * @param {Object} options - Configuration options
     * @param {number} options.workers - Number of web workers (default: 2)
     * @param {number} options.quality - Image quality 1-30, lower is better (default: 10)
     * @param {number} options.width - GIF width
     * @param {number} options.height - GIF height
     */
    constructor({ workers = 2, quality = 10, width = 512, height = 512 } = {}) {
        this.workers = workers;
        this.quality = quality;
        this.width = width;
        this.height = height;
    }

    /**
     * Export frames to GIF.
     * @param {Array} frames - List of ImageData or cv.Mat frames
     * @param {number} fps - Frames per second (default: 30)
     * @returns {Promise<Blob>} Promise resolving to GIF blob
     */
    async exportToGIF(frames, fps = 30) {
        return new Promise((resolve, reject) => {
            // Check if GIF library is available
            if (typeof GIF === 'undefined') {
                reject(new Error('GIF.js library is required. Include it from: https://github.com/jnordberg/gif.js'));
                return;
            }

            try {
                // Determine dimensions from first frame
                let width = this.width;
                let height = this.height;
                const firstFrame = frames[0];

                if (firstFrame instanceof ImageData) {
                    width = firstFrame.width;
                    height = firstFrame.height;
                } else if (firstFrame.cols && firstFrame.rows) {
                    width = firstFrame.cols;
                    height = firstFrame.rows;
                }

                const gif = new GIF({
                    workers: this.workers,
                    quality: this.quality,
                    width: width,
                    height: height
                });

                const delay = Math.floor(1000 / fps);

                // Add frames
                for (const frame of frames) {
                    const imageData = this._frameToImageData(frame, width, height);
                    if (imageData) {
                        gif.addFrame(imageData, { delay: delay, copy: true });
                    }
                }

                gif.on('finished', (blob) => {
                    resolve(blob);
                });

                gif.on('error', (error) => {
                    reject(error);
                });

                gif.render();
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Convert a frame to ImageData.
     * @private
     */
    _frameToImageData(frame, width, height) {
        if (frame instanceof ImageData) {
            return frame;
        } else if (frame.data && frame.cols && frame.rows) {
            // OpenCV Mat
            let displayMat;

            if (frame.channels() === 4) {
                // BGRA to RGBA
                displayMat = new cv.Mat();
                cv.cvtColor(frame, displayMat, cv.COLOR_BGRA2RGBA);
            } else if (frame.channels() === 3) {
                // BGR to RGB, add alpha channel
                const rgb = new cv.Mat();
                cv.cvtColor(frame, rgb, cv.COLOR_BGR2RGB);
                displayMat = new cv.Mat();
                cv.cvtColor(rgb, displayMat, cv.COLOR_RGB2RGBA);
                rgb.delete();
            } else {
                displayMat = frame.clone();
            }

            const imageData = new ImageData(
                new Uint8ClampedArray(displayMat.data),
                displayMat.cols,
                displayMat.rows
            );

            displayMat.delete();
            return imageData;
        } else if (frame instanceof HTMLCanvasElement) {
            const ctx = frame.getContext('2d');
            return ctx.getImageData(0, 0, frame.width, frame.height);
        }

        return null;
    }
}

/**
 * Save frames as animated GIF (triggers download).
 * @param {Array} frames - List of frames
 * @param {string} filename - Output filename
 * @param {number} fps - Frames per second
 * @param {number} loop - Number of loops (0 = infinite)
 * @param {number} quality - Quality (1-30, lower is better)
 * @returns {Promise<boolean>} Promise resolving to true if successful
 */
async function saveGIF(frames, filename = 'animation.gif', fps = 30, loop = 0, quality = 10) {
    if (!frames || frames.length === 0) {
        return false;
    }

    try {
        // Determine dimensions from first frame
        let width, height;
        const firstFrame = frames[0];

        if (firstFrame instanceof ImageData) {
            width = firstFrame.width;
            height = firstFrame.height;
        } else if (firstFrame.cols && firstFrame.rows) {
            width = firstFrame.cols;
            height = firstFrame.rows;
        } else {
            throw new Error('Unable to determine frame dimensions');
        }

        const exporter = new GIFExporter({ quality, width, height });
        const blob = await exporter.exportToGIF(frames, fps);

        // Trigger download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        return true;
    } catch (e) {
        console.error('Failed to save GIF:', e);
        return false;
    }
}

/**
 * Check if GIF export is available.
 * @returns {boolean} True if GIF.js library is available
 */
function hasGIFSupport() {
    return typeof GIF !== 'undefined';
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GIFExporter,
        saveGIF,
        hasGIFSupport
    };
}

if (typeof window !== 'undefined') {
    window.GIFExporter = GIFExporter;
    window.saveGIF = saveGIF;
    window.hasGIFSupport = hasGIFSupport;
}
