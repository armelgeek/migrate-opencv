/**
 * Hand overlay functionality for whiteboard-style drawing animation.
 * Overlays a hand image that follows the stroke during animation.
 * 
 * This is the JavaScript equivalent of kivg/rendering/hand_overlay.py
 */

/**
 * Handles loading and overlaying hand images for drawing animation.
 */
class HandOverlay {
    /**
     * Default hand image path (you'll need to set this based on your project structure).
     */
    static DEFAULT_HAND_PATH = 'assets/drawing-hand.png';

    /**
     * Initialize the hand overlay.
     * @param {Object} options - Configuration options
     * @param {string} options.handImagePath - Path to hand image (PNG with transparency)
     * @param {number} options.scale - Scale factor for the hand image (0.0-1.0)
     * @param {number[]} options.offset - Offset [x, y] from the drawing point
     */
    constructor({ handImagePath = null, scale = 0.30, offset = [-35, -15] } = {}) {
        this._handImage = null;
        this._originalHand = null;
        this._scale = scale;
        this._offset = offset;
        this._isLoaded = false;

        // Load hand image
        const imagePath = handImagePath || HandOverlay.DEFAULT_HAND_PATH;
        this._loadHandImage(imagePath);
    }

    /**
     * Load the hand image from file.
     * @param {string} path - Path to the image
     */
    _loadHandImage(path) {
        if (typeof window !== 'undefined') {
            // Browser environment - load via Image element
            const img = new Image();
            img.onload = () => {
                // Convert to cv.Mat
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                try {
                    this._originalHand = cv.matFromImageData(imageData);
                    this._applyScale();
                    this._isLoaded = true;
                } catch (e) {
                    console.warn('Could not convert hand image to cv.Mat:', e);
                }
            };
            img.onerror = () => {
                console.warn(`Could not load hand image from ${path}`);
            };
            img.src = path;
        }
    }

    /**
     * Load hand image asynchronously.
     * @param {string} path - Path to the image
     * @returns {Promise<void>} Promise that resolves when image is loaded
     */
    async loadHandImageAsync(path) {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('loadHandImageAsync is only available in browser environment'));
                return;
            }

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                try {
                    this._originalHand = cv.matFromImageData(imageData);
                    this._applyScale();
                    this._isLoaded = true;
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => {
                reject(new Error(`Could not load hand image from ${path}`));
            };
            img.src = path;
        });
    }

    /**
     * Apply scaling to the hand image.
     */
    _applyScale() {
        if (!this._originalHand) {
            return;
        }

        const h = this._originalHand.rows;
        const w = this._originalHand.cols;
        const newW = Math.floor(w * this._scale);
        const newH = Math.floor(h * this._scale);

        if (newW > 0 && newH > 0) {
            this._handImage = new cv.Mat();
            cv.resize(
                this._originalHand,
                this._handImage,
                new cv.Size(newW, newH),
                0, 0,
                cv.INTER_AREA
            );
        }
    }

    /**
     * Get the current scale factor.
     * @returns {number} Scale factor
     */
    get scale() {
        return this._scale;
    }

    /**
     * Set the scale factor and resize the hand image.
     * @param {number} value - New scale factor
     */
    set scale(value) {
        this._scale = Math.max(0.01, Math.min(2.0, value)); // Clamp between 0.01 and 2.0
        this._applyScale();
    }

    /**
     * Get the current offset.
     * @returns {number[]} Offset [x, y]
     */
    get offset() {
        return this._offset;
    }

    /**
     * Set the offset from drawing point.
     * @param {number[]} value - New offset [x, y]
     */
    set offset(value) {
        this._offset = value;
    }

    /**
     * Check if hand image is loaded successfully.
     * @returns {boolean} True if loaded
     */
    get isLoaded() {
        return this._isLoaded && this._handImage !== null;
    }

    /**
     * Overlay the hand image at the specified position on the canvas.
     * @param {cv.Mat} canvasImage - The canvas image (RGBA format)
     * @param {number} x - X coordinate of the drawing point
     * @param {number} y - Y coordinate of the drawing point
     * @returns {cv.Mat} New canvas image with hand overlaid
     */
    overlayAtPosition(canvasImage, x, y) {
        if (!this._handImage) {
            return canvasImage;
        }

        // Create a copy to avoid modifying original
        const result = canvasImage.clone();

        const handH = this._handImage.rows;
        const handW = this._handImage.cols;
        const canvasH = result.rows;
        const canvasW = result.cols;

        // Calculate hand position (offset from drawing point)
        const handX = x + this._offset[0];
        const handY = y + this._offset[1];

        // Calculate the region to overlay
        // Handle cases where hand extends beyond canvas boundaries
        const srcX1 = Math.max(0, -handX);
        const srcY1 = Math.max(0, -handY);
        const srcX2 = Math.min(handW, canvasW - handX);
        const srcY2 = Math.min(handH, canvasH - handY);

        const dstX1 = Math.max(0, handX);
        const dstY1 = Math.max(0, handY);
        const dstX2 = dstX1 + (srcX2 - srcX1);
        const dstY2 = dstY1 + (srcY2 - srcY1);

        // Check if there's any valid region to overlay
        if (srcX2 <= srcX1 || srcY2 <= srcY1) {
            return result;
        }

        if (dstX2 <= dstX1 || dstY2 <= dstY1) {
            return result;
        }

        // Perform alpha blending
        this._blendRegion(result, this._handImage, 
            srcX1, srcY1, srcX2, srcY2,
            dstX1, dstY1, dstX2, dstY2
        );

        return result;
    }

    /**
     * Blend a region of the hand image onto the canvas.
     * @private
     */
    _blendRegion(canvas, hand, srcX1, srcY1, srcX2, srcY2, dstX1, dstY1, dstX2, dstY2) {
        // Get regions
        const handRegion = hand.roi(new cv.Rect(srcX1, srcY1, srcX2 - srcX1, srcY2 - srcY1));
        const canvasRegion = canvas.roi(new cv.Rect(dstX1, dstY1, dstX2 - dstX1, dstY2 - dstY1));

        // Check channel count
        if (handRegion.channels() >= 4 && canvasRegion.channels() >= 4) {
            // Split channels
            const handChannels = new cv.MatVector();
            const canvasChannels = new cv.MatVector();
            cv.split(handRegion, handChannels);
            cv.split(canvasRegion, canvasChannels);

            // Get alpha channel and convert to float
            const alpha = handChannels.get(3);
            const alpha32f = new cv.Mat();
            alpha.convertTo(alpha32f, cv.CV_32F, 1.0 / 255.0);

            // Create inverse alpha
            const onesMat = new cv.Mat(alpha32f.rows, alpha32f.cols, cv.CV_32F, new cv.Scalar(1.0));
            const invAlpha = new cv.Mat();
            cv.subtract(onesMat, alpha32f, invAlpha);

            // Blend each channel
            for (let c = 0; c < 3; c++) {
                const handC = handChannels.get(c);
                const canvasC = canvasChannels.get(c);
                
                // Convert to float
                const handF = new cv.Mat();
                const canvasF = new cv.Mat();
                handC.convertTo(handF, cv.CV_32F);
                canvasC.convertTo(canvasF, cv.CV_32F);

                // Blend
                const blendedF = new cv.Mat();
                const temp1 = new cv.Mat();
                const temp2 = new cv.Mat();
                cv.multiply(handF, alpha32f, temp1);
                cv.multiply(canvasF, invAlpha, temp2);
                cv.add(temp1, temp2, blendedF);

                // Convert back to uint8
                blendedF.convertTo(canvasC, cv.CV_8U);

                // Cleanup
                handF.delete();
                canvasF.delete();
                blendedF.delete();
                temp1.delete();
                temp2.delete();
            }

            // Blend alpha channel
            const canvasAlpha = canvasChannels.get(3);
            const alphaF = new cv.Mat();
            const canvasAlphaF = new cv.Mat();
            alpha.convertTo(alphaF, cv.CV_32F);
            canvasAlpha.convertTo(canvasAlphaF, cv.CV_32F);

            const blendedAlpha = new cv.Mat();
            const temp = new cv.Mat();
            cv.multiply(canvasAlphaF, invAlpha, temp);
            cv.add(alphaF, temp, blendedAlpha);
            blendedAlpha.convertTo(canvasAlpha, cv.CV_8U);

            // Merge channels back
            cv.merge(canvasChannels, canvasRegion);

            // Cleanup
            alpha.delete();
            alpha32f.delete();
            onesMat.delete();
            invAlpha.delete();
            alphaF.delete();
            canvasAlphaF.delete();
            blendedAlpha.delete();
            temp.delete();
            handChannels.delete();
            canvasChannels.delete();
        }

        handRegion.delete();
        canvasRegion.delete();
    }

    /**
     * Free the OpenCV Mat memory (IMPORTANT for WASM).
     */
    delete() {
        if (this._handImage) {
            this._handImage.delete();
            this._handImage = null;
        }
        if (this._originalHand) {
            this._originalHand.delete();
            this._originalHand = null;
        }
        this._isLoaded = false;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HandOverlay };
}

if (typeof window !== 'undefined') {
    window.HandOverlay = HandOverlay;
}
