/**
 * SVG Path parsing utilities.
 * Parses SVG path 'd' attribute commands.
 * 
 * This is the JavaScript equivalent of the svg.path library parsing functionality.
 */

/**
 * Represents a Move command in SVG path.
 */
class Move {
    constructor(to) {
        this.start = to;
        this.end = to;
    }
}

/**
 * Represents a Close command in SVG path.
 */
class Close {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

/**
 * Represents a Line command in SVG path.
 */
class Line {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

/**
 * Represents a CubicBezier curve in SVG path.
 */
class CubicBezier {
    constructor(start, control1, control2, end) {
        this.start = start;
        this.control1 = control1;
        this.control2 = control2;
        this.end = end;
    }
}

/**
 * Represents a QuadraticBezier curve in SVG path.
 */
class QuadraticBezier {
    constructor(start, control, end) {
        this.start = start;
        this.control = control;
        this.end = end;
    }
}

/**
 * Represents an Arc in SVG path.
 */
class Arc {
    constructor(start, radius, rotation, largeArc, sweep, end) {
        this.start = start;
        this.radius = radius;
        this.rotation = rotation;
        this.largeArc = largeArc;
        this.sweep = sweep;
        this.end = end;
    }
}

/**
 * Create a complex number-like point object.
 * @param {number} x - Real component (x coordinate)
 * @param {number} y - Imaginary component (y coordinate)
 * @returns {Object} Point object with real and imag properties
 */
function point(x, y) {
    return { real: x, imag: y, x: x, y: y };
}

/**
 * Tokenize SVG path string.
 * @param {string} pathString - SVG path d attribute
 * @returns {string[]} Array of tokens
 */
function tokenizePath(pathString) {
    // Split by commands and numbers, keeping delimiters
    const tokens = [];
    let current = '';
    
    for (let i = 0; i < pathString.length; i++) {
        const char = pathString[i];
        
        // Check for command letters
        if (/[MmZzLlHhVvCcSsQqTtAa]/.test(char)) {
            if (current.trim()) {
                tokens.push(current.trim());
            }
            tokens.push(char);
            current = '';
        }
        // Check for separators
        else if (/[\s,]/.test(char)) {
            if (current.trim()) {
                tokens.push(current.trim());
            }
            current = '';
        }
        // Check for negative sign as number separator
        else if (char === '-' && current.trim() && !/e$/i.test(current)) {
            if (current.trim()) {
                tokens.push(current.trim());
            }
            current = char;
        }
        else {
            current += char;
        }
    }
    
    if (current.trim()) {
        tokens.push(current.trim());
    }
    
    return tokens;
}

/**
 * Parse SVG path string into path elements.
 * @param {string} pathString - SVG path d attribute
 * @returns {Array} Array of path elements (Move, Line, CubicBezier, etc.)
 */
function parsePath(pathString) {
    const elements = [];
    const tokens = tokenizePath(pathString);
    
    let currentPoint = point(0, 0);
    let startPoint = point(0, 0);
    let lastControl = null;
    let i = 0;
    
    while (i < tokens.length) {
        const command = tokens[i];
        i++;
        
        switch (command) {
            case 'M': // Absolute moveto
            case 'm': { // Relative moveto
                const x = parseFloat(tokens[i++]);
                const y = parseFloat(tokens[i++]);
                
                if (command === 'M') {
                    currentPoint = point(x, y);
                } else {
                    currentPoint = point(currentPoint.real + x, currentPoint.imag + y);
                }
                startPoint = currentPoint;
                elements.push(new Move(currentPoint));
                
                // Subsequent coordinates are treated as lineto
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const lx = parseFloat(tokens[i++]);
                    const ly = parseFloat(tokens[i++]);
                    const endPoint = command === 'M' 
                        ? point(lx, ly) 
                        : point(currentPoint.real + lx, currentPoint.imag + ly);
                    elements.push(new Line(currentPoint, endPoint));
                    currentPoint = endPoint;
                }
                break;
            }
            
            case 'Z': // Closepath
            case 'z': {
                elements.push(new Close(currentPoint, startPoint));
                currentPoint = startPoint;
                break;
            }
            
            case 'L': // Absolute lineto
            case 'l': { // Relative lineto
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    const endPoint = command === 'L' 
                        ? point(x, y) 
                        : point(currentPoint.real + x, currentPoint.imag + y);
                    elements.push(new Line(currentPoint, endPoint));
                    currentPoint = endPoint;
                }
                break;
            }
            
            case 'H': // Absolute horizontal lineto
            case 'h': { // Relative horizontal lineto
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const x = parseFloat(tokens[i++]);
                    const endX = command === 'H' ? x : currentPoint.real + x;
                    const endPoint = point(endX, currentPoint.imag);
                    elements.push(new Line(currentPoint, endPoint));
                    currentPoint = endPoint;
                }
                break;
            }
            
            case 'V': // Absolute vertical lineto
            case 'v': { // Relative vertical lineto
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const y = parseFloat(tokens[i++]);
                    const endY = command === 'V' ? y : currentPoint.imag + y;
                    const endPoint = point(currentPoint.real, endY);
                    elements.push(new Line(currentPoint, endPoint));
                    currentPoint = endPoint;
                }
                break;
            }
            
            case 'C': // Absolute cubic bezier
            case 'c': { // Relative cubic bezier
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const x1 = parseFloat(tokens[i++]);
                    const y1 = parseFloat(tokens[i++]);
                    const x2 = parseFloat(tokens[i++]);
                    const y2 = parseFloat(tokens[i++]);
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    
                    let control1, control2, endPoint;
                    if (command === 'C') {
                        control1 = point(x1, y1);
                        control2 = point(x2, y2);
                        endPoint = point(x, y);
                    } else {
                        control1 = point(currentPoint.real + x1, currentPoint.imag + y1);
                        control2 = point(currentPoint.real + x2, currentPoint.imag + y2);
                        endPoint = point(currentPoint.real + x, currentPoint.imag + y);
                    }
                    
                    elements.push(new CubicBezier(currentPoint, control1, control2, endPoint));
                    lastControl = control2;
                    currentPoint = endPoint;
                }
                break;
            }
            
            case 'S': // Absolute smooth cubic bezier
            case 's': { // Relative smooth cubic bezier
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const x2 = parseFloat(tokens[i++]);
                    const y2 = parseFloat(tokens[i++]);
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    
                    // Control1 is reflection of last control point
                    let control1;
                    if (lastControl) {
                        control1 = point(
                            2 * currentPoint.real - lastControl.real,
                            2 * currentPoint.imag - lastControl.imag
                        );
                    } else {
                        control1 = currentPoint;
                    }
                    
                    let control2, endPoint;
                    if (command === 'S') {
                        control2 = point(x2, y2);
                        endPoint = point(x, y);
                    } else {
                        control2 = point(currentPoint.real + x2, currentPoint.imag + y2);
                        endPoint = point(currentPoint.real + x, currentPoint.imag + y);
                    }
                    
                    elements.push(new CubicBezier(currentPoint, control1, control2, endPoint));
                    lastControl = control2;
                    currentPoint = endPoint;
                }
                break;
            }
            
            case 'Q': // Absolute quadratic bezier
            case 'q': { // Relative quadratic bezier
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const x1 = parseFloat(tokens[i++]);
                    const y1 = parseFloat(tokens[i++]);
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    
                    let control, endPoint;
                    if (command === 'Q') {
                        control = point(x1, y1);
                        endPoint = point(x, y);
                    } else {
                        control = point(currentPoint.real + x1, currentPoint.imag + y1);
                        endPoint = point(currentPoint.real + x, currentPoint.imag + y);
                    }
                    
                    // Convert quadratic to cubic bezier
                    const control1 = point(
                        currentPoint.real + 2/3 * (control.real - currentPoint.real),
                        currentPoint.imag + 2/3 * (control.imag - currentPoint.imag)
                    );
                    const control2 = point(
                        endPoint.real + 2/3 * (control.real - endPoint.real),
                        endPoint.imag + 2/3 * (control.imag - endPoint.imag)
                    );
                    
                    elements.push(new CubicBezier(currentPoint, control1, control2, endPoint));
                    lastControl = control;
                    currentPoint = endPoint;
                }
                break;
            }
            
            case 'T': // Absolute smooth quadratic bezier
            case 't': { // Relative smooth quadratic bezier
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    
                    // Control is reflection of last control point
                    let control;
                    if (lastControl) {
                        control = point(
                            2 * currentPoint.real - lastControl.real,
                            2 * currentPoint.imag - lastControl.imag
                        );
                    } else {
                        control = currentPoint;
                    }
                    
                    const endPoint = command === 'T' 
                        ? point(x, y) 
                        : point(currentPoint.real + x, currentPoint.imag + y);
                    
                    // Convert quadratic to cubic bezier
                    const control1 = point(
                        currentPoint.real + 2/3 * (control.real - currentPoint.real),
                        currentPoint.imag + 2/3 * (control.imag - currentPoint.imag)
                    );
                    const control2 = point(
                        endPoint.real + 2/3 * (control.real - endPoint.real),
                        endPoint.imag + 2/3 * (control.imag - endPoint.imag)
                    );
                    
                    elements.push(new CubicBezier(currentPoint, control1, control2, endPoint));
                    lastControl = control;
                    currentPoint = endPoint;
                }
                break;
            }
            
            case 'A': // Absolute arc
            case 'a': { // Relative arc
                while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                    const rx = parseFloat(tokens[i++]);
                    const ry = parseFloat(tokens[i++]);
                    const rotation = parseFloat(tokens[i++]);
                    const largeArc = parseInt(tokens[i++]) === 1;
                    const sweep = parseInt(tokens[i++]) === 1;
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    
                    const endPoint = command === 'A' 
                        ? point(x, y) 
                        : point(currentPoint.real + x, currentPoint.imag + y);
                    
                    // For simplicity, approximate arc with bezier curves
                    // This is a simplified implementation
                    const arcElement = new Arc(
                        currentPoint,
                        point(rx, ry),
                        rotation,
                        largeArc,
                        sweep,
                        endPoint
                    );
                    
                    // Convert arc to cubic bezier approximation
                    const beziers = arcToBezier(arcElement);
                    elements.push(...beziers);
                    
                    currentPoint = endPoint;
                }
                break;
            }
            
            default:
                // Unknown command, skip
                break;
        }
    }
    
    return elements;
}

/**
 * Convert an arc to cubic bezier curves (approximation).
 * @param {Arc} arc - Arc element
 * @returns {CubicBezier[]} Array of cubic bezier approximations
 */
function arcToBezier(arc) {
    // Simplified implementation: just return a line for very simple arcs
    // For a complete implementation, you would need to compute the actual bezier approximation
    const beziers = [];
    
    // Simple approximation: use a single bezier
    const midX = (arc.start.real + arc.end.real) / 2;
    const midY = (arc.start.imag + arc.end.imag) / 2;
    
    // Offset the control points based on arc parameters
    const dx = arc.end.real - arc.start.real;
    const dy = arc.end.imag - arc.start.imag;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Simple control point calculation
    const offset = dist * 0.5;
    const control1 = point(arc.start.real + dx * 0.25, arc.start.imag + dy * 0.25 - offset);
    const control2 = point(arc.end.real - dx * 0.25, arc.end.imag - dy * 0.25 - offset);
    
    beziers.push(new CubicBezier(arc.start, control1, control2, arc.end));
    
    return beziers;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Move,
        Close,
        Line,
        CubicBezier,
        QuadraticBezier,
        Arc,
        point,
        parsePath,
        tokenizePath,
        arcToBezier
    };
}

if (typeof window !== 'undefined') {
    window.PathParser = {
        Move,
        Close,
        Line,
        CubicBezier,
        QuadraticBezier,
        Arc,
        point,
        parsePath,
        tokenizePath,
        arcToBezier
    };
}
