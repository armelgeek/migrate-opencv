/**
 * Image export functionality for browser.
 * 
 * This is the JavaScript equivalent of kivg/export/image.py
 */

/**
 * Save an image to a file (triggers download in browser).
 * @param {cv.Mat|ImageData|HTMLCanvasElement} image - Image to save
 * @param {string} filename - Output filename
 * @param {number} quality - JPEG quality (0-100)
 * @returns {boolean} True if save was triggered successfully
 */
function saveImage(image, filename, quality = 95) {
    try {
        let dataUrl;
        const mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

        if (image instanceof HTMLCanvasElement) {
            // Canvas element
            dataUrl = image.toDataURL(mimeType, quality / 100);
        } else if (image instanceof ImageData) {
            // ImageData object
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(image, 0, 0);
            dataUrl = canvas.toDataURL(mimeType, quality / 100);
        } else if (image.data && image.cols && image.rows) {
            // OpenCV Mat
            const canvas = document.createElement('canvas');
            canvas.width = image.cols;
            canvas.height = image.rows;
            cv.imshow(canvas, image);
            dataUrl = canvas.toDataURL(mimeType, quality / 100);
        } else {
            console.error('Unsupported image format');
            return false;
        }

        // Trigger download
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();

        return true;
    } catch (e) {
        console.error('Failed to save image:', e);
        return false;
    }
}

/**
 * Get image as data URL.
 * @param {cv.Mat|ImageData|HTMLCanvasElement} image - Image to convert
 * @param {string} type - Image type ('image/png' or 'image/jpeg')
 * @param {number} quality - Quality (0-1)
 * @returns {string|null} Data URL or null on error
 */
function imageToDataURL(image, type = 'image/png', quality = 0.95) {
    try {
        let canvas;

        if (image instanceof HTMLCanvasElement) {
            canvas = image;
        } else if (image instanceof ImageData) {
            canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(image, 0, 0);
        } else if (image.data && image.cols && image.rows) {
            canvas = document.createElement('canvas');
            canvas.width = image.cols;
            canvas.height = image.rows;
            cv.imshow(canvas, image);
        } else {
            return null;
        }

        return canvas.toDataURL(type, quality);
    } catch (e) {
        console.error('Failed to convert image to data URL:', e);
        return null;
    }
}

/**
 * Get image as Blob.
 * @param {cv.Mat|ImageData|HTMLCanvasElement} image - Image to convert
 * @param {string} type - Image type ('image/png' or 'image/jpeg')
 * @param {number} quality - Quality (0-1)
 * @returns {Promise<Blob>} Promise resolving to Blob
 */
function imageToBlob(image, type = 'image/png', quality = 0.95) {
    return new Promise((resolve, reject) => {
        try {
            let canvas;

            if (image instanceof HTMLCanvasElement) {
                canvas = image;
            } else if (image instanceof ImageData) {
                canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.putImageData(image, 0, 0);
            } else if (image.data && image.cols && image.rows) {
                canvas = document.createElement('canvas');
                canvas.width = image.cols;
                canvas.height = image.rows;
                cv.imshow(canvas, image);
            } else {
                reject(new Error('Unsupported image format'));
                return;
            }

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, type, quality);
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Save a sequence of images to blobs.
 * @param {Array} images - List of image objects
 * @param {string} format - Image format ('png' or 'jpeg')
 * @returns {Promise<Blob[]>} Promise resolving to list of blobs
 */
async function saveSequence(images, format = 'png') {
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const blobs = [];

    for (const image of images) {
        const blob = await imageToBlob(image, mimeType);
        blobs.push(blob);
    }

    return blobs;
}

/**
 * Create a ZIP file of image sequence (requires JSZip library).
 * @param {Array} images - List of image objects
 * @param {string} prefix - Filename prefix
 * @param {string} format - Image format
 * @returns {Promise<Blob>} Promise resolving to ZIP blob
 */
async function createImageSequenceZip(images, prefix = 'frame', format = 'png') {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library is required for ZIP creation');
    }

    const zip = new JSZip();
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

    for (let i = 0; i < images.length; i++) {
        const blob = await imageToBlob(images[i], mimeType);
        const filename = `${prefix}_${String(i).padStart(5, '0')}.${format}`;
        zip.file(filename, blob);
    }

    return zip.generateAsync({ type: 'blob' });
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        saveImage,
        imageToDataURL,
        imageToBlob,
        saveSequence,
        createImageSequenceZip
    };
}

if (typeof window !== 'undefined') {
    window.ImageExporter = {
        saveImage,
        imageToDataURL,
        imageToBlob,
        saveSequence,
        createImageSequenceZip
    };
}
