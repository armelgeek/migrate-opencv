"""
Shape rendering (polygon filling) for OpenCV-based SVG rendering.
Replaces kivy.graphics.Mesh and Tesselator.
"""
import cv2
import numpy as np
from typing import List, Tuple, Any

from ..core.canvas import OpenCVCanvas


class ShapeRenderer:
    """Handler for rendering filled shapes using OpenCV."""
    
    @staticmethod
    def render_shapes(canvas: OpenCVCanvas, shapes: List[List[float]], 
                     color: Tuple[int, int, int, int], opacity: float = 1.0) -> None:
        """
        Render filled shapes onto the canvas.
        
        OpenCV's fillPoly handles tessellation automatically for concave polygons.
        
        Args:
            canvas: OpenCVCanvas to draw on
            shapes: List of shapes, each shape is a flat list of points [x1, y1, x2, y2, ...]
            color: RGBA color (0-255 for each component)
            opacity: Additional opacity modifier (0.0-1.0)
        """
        # Apply opacity to color alpha
        final_alpha = int(color[3] * opacity)
        final_color = (color[0], color[1], color[2], final_alpha)
        
        for shape in shapes:
            if len(shape) >= 6:  # At least 3 points (6 values)
                # Convert flat list to points
                points = ShapeRenderer._flat_to_points(shape)
                canvas.fill_polygon(points, final_color)
    
    @staticmethod
    def _flat_to_points(flat_list: List[float]) -> List[Tuple[int, int]]:
        """
        Convert flat list [x1, y1, x2, y2, ...] to list of points [(x1, y1), ...].
        
        Args:
            flat_list: Flat list of coordinates
            
        Returns:
            List of (x, y) tuples
        """
        points = []
        for i in range(0, len(flat_list), 2):
            if i + 1 < len(flat_list):
                points.append((int(flat_list[i]), int(flat_list[i + 1])))
        return points
    
    @staticmethod
    def render_mesh(canvas: OpenCVCanvas, widget: Any, shapes: List[List[float]], 
                    color: List[float], opacity_attr: str) -> None:
        """
        Render meshes onto the canvas (compatible with Kivy-style API).
        
        Args:
            canvas: OpenCVCanvas to draw on
            widget: Widget that may contain opacity attribute
            shapes: List of shapes represented as lists of points
            color: RGB or RGBA color values (0-1 range for Kivy compatibility)
            opacity_attr: Name of the attribute containing opacity value
        """
        # Get the opacity value
        opacity = getattr(widget, opacity_attr, 1.0)
        
        # Convert color from 0-1 range to 0-255 range
        if len(color) >= 3:
            r = int(color[0] * 255)
            g = int(color[1] * 255)
            b = int(color[2] * 255)
            a = int((color[3] if len(color) > 3 else 1.0) * 255 * opacity)
            rgba_color = (r, g, b, a)
        else:
            rgba_color = (255, 255, 255, int(255 * opacity))
        
        ShapeRenderer.render_shapes(canvas, shapes, rgba_color, opacity=1.0)
