/**
 * SVG parsing utilities for Kivg.
 * Handles parsing SVG files and extracting path data and text elements.
 * 
 * This is the JavaScript equivalent of kivg/svg_parser.py
 */

const { hexToRgba, colorTo01Range } = require('../utils/ColorUtils.js');

/**
 * Parse SVG length value (e.g., '12px', '10', '1.5em') to float.
 * @param {string} value - SVG length string
 * @returns {number|null} Float value or null if parsing fails
 */
function parseLength(value) {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    // Match valid decimal numbers (with optional decimal point and digits)
    const match = trimmed.match(/^(\d*\.?\d+)\s*(px|pt|em|rem|%)?$/i);
    if (match) {
        try {
            let num = parseFloat(match[1]);
            const unit = match[2];
            // Convert pt to px (1pt = 1.333px approximately)
            if (unit && unit.toLowerCase() === 'pt') {
                num *= 1.333;
            }
            return num;
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Parse an SVG file/string and extract relevant information.
 * @param {string|Document} svgInput - Path to SVG file, SVG string, or DOM Document
 * @returns {Array} Tuple containing [svg_dimensions, path_data]
 */
function parseSVG(svgInput) {
    let doc;

    if (typeof svgInput === 'string') {
        // Check if it's a URL/file path or raw SVG content
        if (svgInput.trim().startsWith('<')) {
            // Raw SVG content
            const parser = new DOMParser();
            doc = parser.parseFromString(svgInput, 'image/svg+xml');
        } else if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
            // In browser, this should be called asynchronously
            throw new Error('For file paths in browser, use parseSVGAsync instead');
        } else {
            throw new Error('Cannot parse SVG file in this environment');
        }
    } else {
        doc = svgInput;
    }

    // Extract viewBox
    const svgElement = doc.getElementsByTagName('svg')[0];
    if (!svgElement) {
        throw new Error('No SVG element found');
    }

    const viewboxString = svgElement.getAttribute('viewBox');
    let swSize;

    // Parse viewBox dimensions
    if (viewboxString) {
        if (viewboxString.includes(',')) {
            swSize = viewboxString.split(',').slice(2).map(parseFloat);
        } else {
            swSize = viewboxString.split(' ').slice(2).map(parseFloat);
        }
    } else {
        // Fall back to width/height attributes
        const width = parseFloat(svgElement.getAttribute('width')) || 512;
        const height = parseFloat(svgElement.getAttribute('height')) || 512;
        swSize = [width, height];
    }

    // Extract path data
    let pathCount = 0;
    const pathStrings = [];
    const paths = doc.getElementsByTagName('path');

    for (const path of paths) {
        const id = path.getAttribute('id') || `path_${pathCount}`;
        const d = path.getAttribute('d');

        // Parse fill attribute
        const fillAttr = path.getAttribute('fill');
        let fillColor;
        if (fillAttr && fillAttr.toLowerCase() !== 'none') {
            try {
                const fillRgba = hexToRgba(fillAttr);
                fillColor = colorTo01Range(fillRgba);
            } catch (e) {
                fillColor = [1, 1, 1, 0]; // Transparent white
            }
        } else {
            fillColor = [1, 1, 1, 0]; // Transparent (no fill)
        }

        // Parse stroke attribute
        const strokeAttr = path.getAttribute('stroke');
        let strokeColor = null;
        if (strokeAttr && strokeAttr.toLowerCase() !== 'none') {
            try {
                const strokeRgba = hexToRgba(strokeAttr);
                strokeColor = colorTo01Range(strokeRgba);
            } catch (e) {
                strokeColor = null;
            }
        }

        // Parse stroke-width attribute
        const strokeWidthAttr = path.getAttribute('stroke-width');
        let strokeWidth = null;
        if (strokeWidthAttr) {
            try {
                strokeWidth = parseFloat(strokeWidthAttr);
            } catch (e) {
                strokeWidth = null;
            }
        }

        // Create attributes dictionary
        const attrs = {
            fill: fillColor,
            stroke: strokeColor,
            stroke_width: strokeWidth
        };

        pathStrings.push([d, id, attrs]);
        pathCount++;
    }

    return [swSize, pathStrings];
}

/**
 * Parse an SVG file asynchronously (for browser file loading).
 * @param {string} svgUrl - URL to the SVG file
 * @returns {Promise<Array>} Promise resolving to [svg_dimensions, path_data]
 */
async function parseSVGAsync(svgUrl) {
    const response = await fetch(svgUrl);
    const svgText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    return parseSVG(doc);
}

/**
 * Parse text elements from an SVG file/string.
 * @param {string|Document} svgInput - Path to SVG file, SVG string, or DOM Document
 * @returns {Array} Tuple containing [svg_dimensions, text_elements]
 */
function parseTextElements(svgInput) {
    let doc;

    if (typeof svgInput === 'string') {
        if (svgInput.trim().startsWith('<')) {
            const parser = new DOMParser();
            doc = parser.parseFromString(svgInput, 'image/svg+xml');
        } else {
            throw new Error('For file paths, use parseTextElementsAsync instead');
        }
    } else {
        doc = svgInput;
    }

    // Extract viewBox
    const svgElement = doc.getElementsByTagName('svg')[0];
    if (!svgElement) {
        throw new Error('No SVG element found');
    }

    const viewboxString = svgElement.getAttribute('viewBox');
    let swSize;

    if (viewboxString) {
        if (viewboxString.includes(',')) {
            swSize = viewboxString.split(',').slice(2).map(parseFloat);
        } else {
            swSize = viewboxString.split(' ').slice(2).map(parseFloat);
        }
    } else {
        const width = parseFloat(svgElement.getAttribute('width')) || 512;
        const height = parseFloat(svgElement.getAttribute('height')) || 512;
        swSize = [width, height];
    }

    const textElements = [];
    let textCount = 0;

    const textElems = doc.getElementsByTagName('text');
    for (const textElem of textElems) {
        const textData = parseTextElement(textElem, textCount);
        if (textData) {
            textElements.push(textData);
            textCount++;
        }
    }

    return [swSize, textElements];
}

/**
 * Parse text elements asynchronously.
 * @param {string} svgUrl - URL to the SVG file
 * @returns {Promise<Array>} Promise resolving to [svg_dimensions, text_elements]
 */
async function parseTextElementsAsync(svgUrl) {
    const response = await fetch(svgUrl);
    const svgText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    return parseTextElements(doc);
}

/**
 * Parse a single text element and extract its properties.
 * @param {Element} textElem - DOM text element
 * @param {number} textCount - Current text element count for ID generation
 * @returns {Object|null} Dictionary of text properties or null if parsing fails
 */
function parseTextElement(textElem, textCount) {
    // Get text content (handle nested tspan elements)
    const textContent = getTextContent(textElem);
    if (!textContent) {
        return null;
    }

    // Get element ID
    const id = textElem.getAttribute('id') || `text_${textCount}`;

    // Parse position
    const x = parseLength(textElem.getAttribute('x')) || 0;
    const y = parseLength(textElem.getAttribute('y')) || 0;

    // Parse font properties
    const fontFamily = textElem.getAttribute('font-family') || 'sans-serif';
    const fontSize = parseLength(textElem.getAttribute('font-size')) || 16;
    const fontWeight = textElem.getAttribute('font-weight') || 'normal';
    const fontStyle = textElem.getAttribute('font-style') || 'normal';

    // Parse fill color
    const fillAttr = textElem.getAttribute('fill');
    let fillColor;
    if (fillAttr && fillAttr.toLowerCase() !== 'none') {
        try {
            const fillRgba = hexToRgba(fillAttr);
            fillColor = colorTo01Range(fillRgba);
        } catch (e) {
            fillColor = [0, 0, 0, 1]; // Default: opaque black
        }
    } else {
        fillColor = [0, 0, 0, 1]; // Default: opaque black
    }

    // Parse stroke color
    const strokeAttr = textElem.getAttribute('stroke');
    let strokeColor = null;
    if (strokeAttr && strokeAttr.toLowerCase() !== 'none') {
        try {
            const strokeRgba = hexToRgba(strokeAttr);
            strokeColor = colorTo01Range(strokeRgba);
        } catch (e) {
            strokeColor = null;
        }
    }

    // Parse stroke width
    const strokeWidthAttr = textElem.getAttribute('stroke-width');
    let strokeWidth = null;
    if (strokeWidthAttr) {
        try {
            strokeWidth = parseFloat(strokeWidthAttr);
        } catch (e) {
            strokeWidth = null;
        }
    }

    // Parse text alignment
    const textAnchor = textElem.getAttribute('text-anchor') || 'start';
    const dominantBaseline = textElem.getAttribute('dominant-baseline') || 'auto';

    // Parse letter spacing
    const letterSpacingAttr = textElem.getAttribute('letter-spacing');
    const letterSpacing = letterSpacingAttr ? parseLength(letterSpacingAttr) || 0 : 0;

    // Parse text decoration
    const textDecoration = textElem.getAttribute('text-decoration') || 'none';

    // Parse opacity
    const opacityAttr = textElem.getAttribute('opacity');
    let opacity = 1.0;
    if (opacityAttr) {
        try {
            opacity = parseFloat(opacityAttr);
        } catch (e) {
            opacity = 1.0;
        }
    }

    return {
        text: textContent,
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
        dominant_baseline: dominantBaseline,
        letter_spacing: letterSpacing,
        text_decoration: textDecoration,
        opacity: opacity,
        id: id
    };
}

/**
 * Extract text content from a text element, handling nested tspan elements.
 * @param {Element} textElem - DOM text element
 * @returns {string} Combined text content string
 */
function getTextContent(textElem) {
    const textParts = [];

    for (const child of textElem.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            const text = child.data.trim();
            if (text) {
                textParts.push(text);
            }
        } else if (child.nodeName === 'tspan') {
            // Recursively get text from tspan
            const tspanText = getTextContent(child);
            if (tspanText) {
                textParts.push(tspanText);
            }
        }
    }

    return textParts.join(' ');
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseLength,
        parseSVG,
        parseSVGAsync,
        parseTextElements,
        parseTextElementsAsync,
        parseTextElement,
        getTextContent
    };
}

if (typeof window !== 'undefined') {
    window.SVGParser = {
        parseLength,
        parseSVG,
        parseSVGAsync,
        parseTextElements,
        parseTextElementsAsync,
        parseTextElement,
        getTextContent
    };
}
