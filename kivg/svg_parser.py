"""
SVG parsing utilities for Kivg.
Handles parsing SVG files and extracting path data.
"""
from typing import Tuple, List, Dict, Any
from xml.dom import minidom


def get_color_from_hex(hex_color: str) -> List[float]:
    """
    Convert a hex color string to RGBA values (0-1 range).
    
    Args:
        hex_color: Hex color string (e.g., '#FF0000', '#F00', 'FF0000')
        
    Returns:
        List of [r, g, b, a] values in 0-1 range
    """
    # Remove '#' prefix if present
    hex_color = hex_color.lstrip('#')
    
    # Handle 3-character hex (e.g., 'F00' -> 'FF0000')
    if len(hex_color) == 3:
        hex_color = ''.join(c * 2 for c in hex_color)
    
    # Handle 4-character hex with alpha (e.g., 'F00F' -> 'FF0000FF')
    if len(hex_color) == 4:
        hex_color = ''.join(c * 2 for c in hex_color)
    
    try:
        if len(hex_color) == 6:
            r = int(hex_color[0:2], 16) / 255.0
            g = int(hex_color[2:4], 16) / 255.0
            b = int(hex_color[4:6], 16) / 255.0
            return [r, g, b, 1.0]
        elif len(hex_color) == 8:
            r = int(hex_color[0:2], 16) / 255.0
            g = int(hex_color[2:4], 16) / 255.0
            b = int(hex_color[4:6], 16) / 255.0
            a = int(hex_color[6:8], 16) / 255.0
            return [r, g, b, a]
    except ValueError:
        pass
    
    return [1, 1, 1, 0]  # Default: transparent white


def parse_svg(svg_file: str) -> Tuple[List[float], List[Tuple[str, str, List[float]]]]:
    """
    Parse an SVG file and extract relevant information.
    
    Args:
        svg_file: Path to the SVG file
        
    Returns:
        Tuple containing (svg_dimensions, path_data)
            - svg_dimensions: [width, height]
            - path_data: List of tuples (path_string, element_id, color)
    """
    try:
        doc = minidom.parse(svg_file)
    except Exception as e:
        raise ValueError(f"Failed to parse SVG file '{svg_file}': {e}")

    # Extract viewBox
    svg_element = doc.getElementsByTagName("svg")[0]
    viewbox_string = svg_element.getAttribute("viewBox")
    
    # Parse viewBox dimensions
    if "," in viewbox_string:
        sw_size = list(map(float, viewbox_string.split(",")[2:]))
    else:
        sw_size = list(map(float, viewbox_string.split(" ")[2:]))

    # Extract path data
    path_count = 0
    path_strings = []
    for path in doc.getElementsByTagName("path"):
        id_ = path.getAttribute("id") or f"path_{path_count}"
        d = path.getAttribute("d")
        try:
            fill_attr = path.getAttribute("fill")
            clr = get_color_from_hex(fill_attr) if fill_attr else [1, 1, 1, 0]
        except ValueError:
            clr = [1, 1, 1, 0]  # Default if color format is different
        
        path_strings.append((d, id_, clr))
        path_count += 1
    
    doc.unlink()
    return sw_size, path_strings
