/**
 * Text rendering functionality for OpenCV.js-based SVG rendering.
 * Handles drawing text elements with animation support.
 * 
 * This is the JavaScript equivalent of kivg/rendering/text_renderer.py
 */

/**
 * Handles rendering of SVG text elements to OpenCV canvas.
 */
class TextRenderer {
    /**
     * Map SVG font weights to OpenCV font thickness adjustments.
     */
    static FONT_WEIGHT_MAP = {
        'normal': 1,
        'bold': 2,
        '100': 1,
        '200': 1,
        '300': 1,
        '400': 1,
        '500': 1,
        '600': 2,
        '700': 2,
        '800': 2,
        '900': 3
    };

    /**
     * Available OpenCV fonts (limited selection).
     */
    static OPENCV_FONTS = {
        'sans-serif': () => cv.FONT_HERSHEY_SIMPLEX,
        'serif': () => cv.FONT_HERSHEY_TRIPLEX,
        'monospace': () => cv.FONT_HERSHEY_PLAIN,
        'arial': () => cv.FONT_HERSHEY_SIMPLEX,
        'helvetica': () => cv.FONT_HERSHEY_SIMPLEX,
        'times': () => cv.FONT_HERSHEY_TRIPLEX,
        'times new roman': () => cv.FONT_HERSHEY_TRIPLEX,
        'courier': () => cv.FONT_HERSHEY_PLAIN,
        'courier new': () => cv.FONT_HERSHEY_PLAIN
    };

    /**
     * Map SVG font family to OpenCV font.
     * @param {string} fontFamily - SVG font family name
     * @param {string} fontStyle - Font style (normal, italic)
     * @returns {number} OpenCV font constant
     */
    static getOpenCVFont(fontFamily, fontStyle = 'normal') {
        const fontFamilyLower = fontFamily.toLowerCase().trim();

        // Try to find matching font
        for (const [fontName, fontGetter] of Object.entries(TextRenderer.OPENCV_FONTS)) {
            if (fontFamilyLower.includes(fontName)) {
                let font = fontGetter();
                // Add italic variant if requested
                if (fontStyle === 'italic' || fontStyle === 'oblique') {
                    font = font | cv.FONT_ITALIC;
                }
                return font;
            }
        }

        // Default to sans-serif
        let baseFont = cv.FONT_HERSHEY_SIMPLEX;
        if (fontStyle === 'italic' || fontStyle === 'oblique') {
            baseFont = baseFont | cv.FONT_ITALIC;
        }
        return baseFont;
    }

    /**
     * Calculate OpenCV font scale from SVG font size.
     * @param {number} fontSize - SVG font size in pixels
     * @returns {number} OpenCV font scale value
     */
    static calculateFontScale(fontSize) {
        // OpenCV font scale is approximately: pixel_height = 30 * scale for HERSHEY_SIMPLEX
        return fontSize / 30.0;
    }

    /**
     * Draw text element on the canvas.
     * @param {OpenCVCanvas} canvas - OpenCVCanvas to draw on
     * @param {Object} textData - Dictionary with text properties
     * @param {number} scaleX - X scale factor for coordinate transformation
     * @param {number} scaleY - Y scale factor for coordinate transformation
     * @param {number} offsetX - X offset for positioning
     * @param {number} offsetY - Y offset for positioning
     * @param {number} opacity - Opacity multiplier (0-1)
     * @param {number} charReveal - Number of characters to reveal (-1 for all)
     */
    static drawText(canvas, textData, scaleX = 1.0, scaleY = 1.0, offsetX = 0, offsetY = 0, opacity = 1.0, charReveal = -1) {
        let text = textData.text;
        if (charReveal >= 0) {
            text = text.substring(0, charReveal);
        }

        if (!text) {
            return;
        }

        // Transform coordinates
        let x = Math.floor(textData.x * scaleX + offsetX);
        let y = Math.floor(textData.y * scaleY + offsetY);

        // Get font settings
        const font = TextRenderer.getOpenCVFont(
            textData.font_family || 'sans-serif',
            textData.font_style || 'normal'
        );
        const fontSize = textData.font_size || 16;
        const fontScale = TextRenderer.calculateFontScale(fontSize * Math.min(scaleX, scaleY));

        // Get font weight/thickness
        const fontWeight = textData.font_weight || 'normal';
        const thickness = TextRenderer.FONT_WEIGHT_MAP[String(fontWeight)] || 1;

        // Calculate text size for alignment
        const textSize = cv.getTextSize(text, font, fontScale, thickness);
        const textWidth = textSize.width;
        const textHeight = textSize.height;

        // Adjust position based on text-anchor
        const textAnchor = textData.text_anchor || 'start';
        if (textAnchor === 'middle') {
            x -= Math.floor(textWidth / 2);
        } else if (textAnchor === 'end') {
            x -= textWidth;
        }

        // Adjust baseline
        const dominantBaseline = textData.dominant_baseline || 'auto';
        if (['middle', 'central'].includes(dominantBaseline)) {
            y += Math.floor(textHeight / 2);
        } else if (['hanging', 'text-before-edge'].includes(dominantBaseline)) {
            y += textHeight;
        }

        // Get colors
        const fillColor = textData.fill || [0, 0, 0, 1];
        const strokeColor = textData.stroke;
        const strokeWidth = textData.stroke_width || 1;
        const textOpacity = (textData.opacity || 1.0) * opacity;

        // Apply letter spacing if specified
        const letterSpacing = (textData.letter_spacing || 0) * scaleX;

        // Convert colors to 0-255 range
        let fillRgba = null;
        if (fillColor) {
            fillRgba = [
                Math.floor(fillColor[0] * 255),
                Math.floor(fillColor[1] * 255),
                Math.floor(fillColor[2] * 255),
                Math.floor(fillColor[3] * 255 * textOpacity)
            ];
        }

        let strokeRgba = null;
        if (strokeColor) {
            strokeRgba = [
                Math.floor(strokeColor[0] * 255),
                Math.floor(strokeColor[1] * 255),
                Math.floor(strokeColor[2] * 255),
                Math.floor(strokeColor[3] * 255 * textOpacity)
            ];
        }

        // Draw text with letter spacing
        if (letterSpacing > 0) {
            TextRenderer._drawTextWithSpacing(
                canvas, text, x, y, font, fontScale, thickness,
                letterSpacing, fillRgba, strokeRgba, strokeWidth,
                textData.text_decoration || 'none',
                textHeight
            );
        } else {
            TextRenderer._drawTextSimple(
                canvas, text, x, y, font, fontScale, thickness,
                fillRgba, strokeRgba, strokeWidth,
                textData.text_decoration || 'none',
                textWidth, textHeight
            );
        }
    }

    /**
     * Draw text without letter spacing.
     * @private
     */
    static _drawTextSimple(canvas, text, x, y, font, fontScale, thickness, fillRgba, strokeRgba, strokeWidth, textDecoration, textWidth, textHeight) {
        // Draw stroke first (if any)
        if (strokeRgba && strokeWidth) {
            const strokeThickness = thickness + Math.floor(strokeWidth * 2);
            if (strokeRgba[3] > 0) {
                cv.putText(
                    canvas.mat,
                    text,
                    new cv.Point(x, y),
                    font,
                    fontScale,
                    new cv.Scalar(strokeRgba[0], strokeRgba[1], strokeRgba[2], 255),
                    strokeThickness,
                    cv.LINE_AA
                );
            }
        }

        // Draw fill
        if (fillRgba && fillRgba[3] > 0) {
            cv.putText(
                canvas.mat,
                text,
                new cv.Point(x, y),
                font,
                fontScale,
                new cv.Scalar(fillRgba[0], fillRgba[1], fillRgba[2], 255),
                thickness,
                cv.LINE_AA
            );
        }

        // Draw text decoration
        TextRenderer._drawDecoration(
            canvas, textDecoration, x, y, textWidth, textHeight,
            fillRgba, thickness
        );
    }

    /**
     * Draw text with custom letter spacing.
     * @private
     */
    static _drawTextWithSpacing(canvas, text, x, y, font, fontScale, thickness, letterSpacing, fillRgba, strokeRgba, strokeWidth, textDecoration, textHeight) {
        let currentX = x;
        let totalWidth = 0;

        for (const char of text) {
            // Get character width
            const charSize = cv.getTextSize(char, font, fontScale, thickness);
            const charWidth = charSize.width;

            // Draw stroke first
            if (strokeRgba && strokeWidth) {
                const strokeThickness = thickness + Math.floor(strokeWidth * 2);
                if (strokeRgba[3] > 0) {
                    cv.putText(
                        canvas.mat,
                        char,
                        new cv.Point(Math.floor(currentX), y),
                        font,
                        fontScale,
                        new cv.Scalar(strokeRgba[0], strokeRgba[1], strokeRgba[2], 255),
                        strokeThickness,
                        cv.LINE_AA
                    );
                }
            }

            // Draw fill
            if (fillRgba && fillRgba[3] > 0) {
                cv.putText(
                    canvas.mat,
                    char,
                    new cv.Point(Math.floor(currentX), y),
                    font,
                    fontScale,
                    new cv.Scalar(fillRgba[0], fillRgba[1], fillRgba[2], 255),
                    thickness,
                    cv.LINE_AA
                );
            }

            currentX += charWidth + letterSpacing;
            totalWidth += charWidth + letterSpacing;
        }

        // Draw text decoration
        TextRenderer._drawDecoration(
            canvas, textDecoration, x, y, Math.floor(totalWidth - letterSpacing),
            textHeight, fillRgba, thickness
        );
    }

    /**
     * Draw text decoration (underline, strikethrough, etc.).
     * @private
     */
    static _drawDecoration(canvas, decoration, x, y, textWidth, textHeight, color, thickness) {
        if (!color || color[3] === 0 || decoration === 'none') {
            return;
        }

        const lineThickness = Math.max(1, Math.floor(thickness / 2));
        const colorScalar = new cv.Scalar(color[0], color[1], color[2], color[3]);

        if (decoration.includes('underline')) {
            const lineY = y + Math.floor(textHeight / 4);
            cv.line(
                canvas.mat,
                new cv.Point(x, lineY),
                new cv.Point(x + textWidth, lineY),
                colorScalar,
                lineThickness,
                cv.LINE_AA
            );
        }

        if (decoration.includes('line-through') || decoration.includes('strikethrough')) {
            const lineY = y - Math.floor(textHeight / 3);
            cv.line(
                canvas.mat,
                new cv.Point(x, lineY),
                new cv.Point(x + textWidth, lineY),
                colorScalar,
                lineThickness,
                cv.LINE_AA
            );
        }

        if (decoration.includes('overline')) {
            const lineY = y - textHeight;
            cv.line(
                canvas.mat,
                new cv.Point(x, lineY),
                new cv.Point(x + textWidth, lineY),
                colorScalar,
                lineThickness,
                cv.LINE_AA
            );
        }
    }

    /**
     * Calculate bounding box for text element.
     * @param {Object} textData - Dictionary with text properties
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     * @returns {number[]} Tuple [x, y, width, height]
     */
    static getTextBounds(textData, scaleX = 1.0, scaleY = 1.0) {
        const text = textData.text;
        const font = TextRenderer.getOpenCVFont(
            textData.font_family || 'sans-serif',
            textData.font_style || 'normal'
        );
        const fontSize = textData.font_size || 16;
        const fontScale = TextRenderer.calculateFontScale(fontSize * Math.min(scaleX, scaleY));

        const fontWeight = textData.font_weight || 'normal';
        const thickness = TextRenderer.FONT_WEIGHT_MAP[String(fontWeight)] || 1;

        const textSize = cv.getTextSize(text, font, fontScale, thickness);
        const textWidth = textSize.width;
        const textHeight = textSize.height;
        const baseline = textSize.baseLine;

        const x = Math.floor(textData.x * scaleX);
        const y = Math.floor(textData.y * scaleY);

        return [x, y - textHeight, textWidth, textHeight + baseline];
    }

    /**
     * Get the position (x, y) of a specific character in the text.
     * @param {Object} textData - Dictionary with text properties
     * @param {number} charIndex - Index of the character (0-based)
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     * @param {number} offsetX - X offset for positioning
     * @param {number} offsetY - Y offset for positioning
     * @returns {number[]|null} Tuple [x, y] of the character position, or null if invalid
     */
    static getCharPosition(textData, charIndex, scaleX = 1.0, scaleY = 1.0, offsetX = 0, offsetY = 0) {
        const text = textData.text;
        if (charIndex < 0 || charIndex > text.length) {
            return null;
        }

        if (charIndex === 0) {
            // Return the starting position
            const x = Math.floor(textData.x * scaleX + offsetX);
            const y = Math.floor(textData.y * scaleY + offsetY);
            return [x, y];
        }

        // Get font settings
        const font = TextRenderer.getOpenCVFont(
            textData.font_family || 'sans-serif',
            textData.font_style || 'normal'
        );
        const fontSize = textData.font_size || 16;
        const fontScale = TextRenderer.calculateFontScale(fontSize * Math.min(scaleX, scaleY));

        const fontWeight = textData.font_weight || 'normal';
        const thickness = TextRenderer.FONT_WEIGHT_MAP[String(fontWeight)] || 1;

        // Calculate base position
        let x = Math.floor(textData.x * scaleX + offsetX);
        let y = Math.floor(textData.y * scaleY + offsetY);

        // Calculate full text size for alignment
        const fullTextSize = cv.getTextSize(text, font, fontScale, thickness);
        const fullWidth = fullTextSize.width;
        const textHeight = fullTextSize.height;

        // Adjust position based on text-anchor
        const textAnchor = textData.text_anchor || 'start';
        if (textAnchor === 'middle') {
            x -= Math.floor(fullWidth / 2);
        } else if (textAnchor === 'end') {
            x -= fullWidth;
        }

        // Adjust baseline
        const dominantBaseline = textData.dominant_baseline || 'auto';
        if (['middle', 'central'].includes(dominantBaseline)) {
            y += Math.floor(textHeight / 2);
        } else if (['hanging', 'text-before-edge'].includes(dominantBaseline)) {
            y += textHeight;
        }

        // Calculate width of text up to charIndex
        const letterSpacing = (textData.letter_spacing || 0) * scaleX;

        if (letterSpacing > 0) {
            // Calculate width character by character
            let currentX = x;
            for (let i = 0; i < Math.min(charIndex, text.length); i++) {
                const char = text[i];
                const charSize = cv.getTextSize(char, font, fontScale, thickness);
                currentX += charSize.width + letterSpacing;
            }
            x = Math.floor(currentX);
        } else {
            // Calculate width of substring
            const substring = text.substring(0, charIndex);
            const subSize = cv.getTextSize(substring, font, fontScale, thickness);
            x += subSize.width;
        }

        return [x, y];
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TextRenderer };
}

if (typeof window !== 'undefined') {
    window.TextRenderer = TextRenderer;
}
