"""
SVG parsing utilities for Kivg.
Handles parsing SVG files and extracting path data.
"""
from typing import Tuple, List, Dict, Any
from xml.dom import minidom

from .color_utils import hex_to_rgba, color_to_0_1_range


def parse_svg(svg_file: str) -> Tuple[List[float], List[Tuple[str, str, 
                                                                  Dict[str, Any]]]]:
    """
    Parse an SVG file and extract relevant information.
    
    Args:
        svg_file: Path to the SVG file
        
    Returns:
        Tuple containing (svg_dimensions, path_data)
            - svg_dimensions: [width, height]
            - path_data: List of tuples (path_string, element_id, attributes_dict)
              where attributes_dict contains:
                - 'fill': fill color in 0-1 range [r, g, b, a]
                - 'stroke': stroke color in 0-1 range [r, g, b, a] or None
                - 'stroke_width': stroke width or None
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
        
        # Parse fill attribute
        fill_attr = path.getAttribute("fill")
        if fill_attr and fill_attr.lower() != 'none':
            try:
                fill_rgba = hex_to_rgba(fill_attr)
                fill_color = color_to_0_1_range(fill_rgba)
            except (ValueError, AttributeError):
                fill_color = [1, 1, 1, 0]  # Transparent white
        else:
            fill_color = [1, 1, 1, 0]  # Transparent (no fill)
        
        # Parse stroke attribute
        stroke_attr = path.getAttribute("stroke")
        stroke_color = None
        if stroke_attr and stroke_attr.lower() != 'none':
            try:
                stroke_rgba = hex_to_rgba(stroke_attr)
                stroke_color = color_to_0_1_range(stroke_rgba)
            except (ValueError, AttributeError):
                stroke_color = None
        
        # Parse stroke-width attribute
        stroke_width_attr = path.getAttribute("stroke-width")
        stroke_width = None
        if stroke_width_attr:
            try:
                stroke_width = float(stroke_width_attr)
            except ValueError:
                stroke_width = None
        
        # Create attributes dictionary
        attrs = {
            'fill': fill_color,
            'stroke': stroke_color,
            'stroke_width': stroke_width
        }
        
        path_strings.append((d, id_, attrs))
        path_count += 1
    
    doc.unlink()
    return sw_size, path_strings
