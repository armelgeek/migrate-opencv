/**
 * Video export functionality using MediaRecorder API.
 * 
 * This is the JavaScript equivalent of kivg/export/video.py
 */

/**
 * Video exporter using MediaRecorder API.
 */
class VideoExporter {
    /**
     * Initialize the video exporter.
     * @param {number} width - Video width
     * @param {number} height - Video height
     * @param {number} fps - Frames per second
     * @param {string} mimeType - Video mime type (default: 'video/webm;codecs=vp9')
     */
    constructor(width, height, fps = 30, mimeType = 'video/webm;codecs=vp9') {
        this.width = width;
        this.height = height;
        this.fps = fps;
        this.mimeType = mimeType;
        this.mediaRecorder = null;
        this.chunks = [];
        this.stream = null;
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Export frames to WebM video.
     * @param {Array} frames - List of ImageData or cv.Mat frames
     * @returns {Promise<Blob>} Promise resolving to video blob
     */
    async exportToWebM(frames) {
        if (!frames || frames.length === 0) {
            throw new Error('No frames to export');
        }

        return new Promise((resolve, reject) => {
            try {
                // Create canvas for rendering frames
                this.canvas = document.createElement('canvas');
                this.canvas.width = this.width;
                this.canvas.height = this.height;
                this.ctx = this.canvas.getContext('2d');

                // Create media stream
                this.stream = this.canvas.captureStream(this.fps);

                // Check for supported mime type
                let actualMimeType = this.mimeType;
                if (!MediaRecorder.isTypeSupported(actualMimeType)) {
                    actualMimeType = 'video/webm';
                    if (!MediaRecorder.isTypeSupported(actualMimeType)) {
                        reject(new Error('WebM video recording not supported'));
                        return;
                    }
                }

                this.mediaRecorder = new MediaRecorder(this.stream, {
                    mimeType: actualMimeType
                });

                this.chunks = [];

                this.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        this.chunks.push(e.data);
                    }
                };

                this.mediaRecorder.onstop = () => {
                    const blob = new Blob(this.chunks, { type: 'video/webm' });
                    resolve(blob);
                };

                this.mediaRecorder.onerror = (e) => {
                    reject(new Error(`MediaRecorder error: ${e.error}`));
                };

                this.mediaRecorder.start();

                // Render frames
                let frameIndex = 0;
                const frameDuration = 1000 / this.fps;

                const drawFrame = () => {
                    if (frameIndex < frames.length) {
                        this._drawFrame(frames[frameIndex]);
                        frameIndex++;
                        setTimeout(drawFrame, frameDuration);
                    } else {
                        // Wait a bit before stopping to ensure last frame is captured
                        setTimeout(() => {
                            this.mediaRecorder.stop();
                        }, frameDuration * 2);
                    }
                };

                drawFrame();
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Draw a single frame to the canvas.
     * @private
     */
    _drawFrame(frame) {
        if (frame instanceof ImageData) {
            this.ctx.putImageData(frame, 0, 0);
        } else if (frame.data && frame.cols && frame.rows) {
            // OpenCV Mat - convert to ImageData
            let displayMat;
            
            if (frame.channels() === 4) {
                // RGBA or BGRA - convert BGRA to RGBA if needed
                displayMat = new cv.Mat();
                cv.cvtColor(frame, displayMat, cv.COLOR_BGRA2RGBA);
            } else if (frame.channels() === 3) {
                // BGR to RGB
                displayMat = new cv.Mat();
                cv.cvtColor(frame, displayMat, cv.COLOR_BGR2RGB);
            } else {
                displayMat = frame.clone();
            }

            const imageData = new ImageData(
                new Uint8ClampedArray(displayMat.data),
                displayMat.cols,
                displayMat.rows
            );
            this.ctx.putImageData(imageData, 0, 0);
            displayMat.delete();
        } else if (frame instanceof HTMLCanvasElement) {
            this.ctx.drawImage(frame, 0, 0);
        } else if (frame instanceof HTMLImageElement) {
            this.ctx.drawImage(frame, 0, 0);
        }
    }

    /**
     * Download the exported video.
     * @param {Blob} blob - Video blob
     * @param {string} filename - Output filename
     */
    static download(blob, filename = 'animation.webm') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
}

/**
 * Write frames to a video file (triggers download).
 * @param {Array} frames - List of frames
 * @param {string} filename - Output filename
 * @param {number} fps - Frames per second
 * @returns {Promise<boolean>} Promise resolving to true if successful
 */
async function writeVideo(frames, filename = 'animation.webm', fps = 30) {
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

        const exporter = new VideoExporter(width, height, fps);
        const blob = await exporter.exportToWebM(frames);
        VideoExporter.download(blob, filename);
        return true;
    } catch (e) {
        console.error('Failed to write video:', e);
        return false;
    }
}

/**
 * Check if video export is supported.
 * @returns {boolean} True if supported
 */
function isVideoExportSupported() {
    if (typeof MediaRecorder === 'undefined') {
        return false;
    }
    
    // Check for WebM support
    return MediaRecorder.isTypeSupported('video/webm') || 
           MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
           MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VideoExporter,
        writeVideo,
        isVideoExportSupported
    };
}

if (typeof window !== 'undefined') {
    window.VideoExporter = VideoExporter;
    window.writeVideo = writeVideo;
    window.isVideoExportSupported = isVideoExportSupported;
}
