"""
Path rendering functionality for OpenCV-based SVG rendering.
"""
from typing import List, Tuple, Any
from svg.path.path import Line, CubicBezier, Close, Move

from ..core.canvas import OpenCVCanvas
from ..path_utils import get_all_points


class PathRenderer:
    """Handles rendering of SVG paths to OpenCV canvas."""
    
    @staticmethod
    def update_canvas(canvas: OpenCVCanvas, widget: Any, 
                      path_elements: List, line_color: Tuple[int, int, int, int]) -> None:
        """
        Update the canvas with the current path elements.
        
        Args:
            canvas: OpenCVCanvas to draw on
            widget: Widget containing path properties
            path_elements: List of SVG path elements
            line_color: RGBA color for drawing lines
        """
        canvas.clear()
        
        line_count = 0
        bezier_count = 0
        
        # Draw each path element
        for element in path_elements:
            if isinstance(element, Line):
                PathRenderer._draw_line(canvas, widget, line_count, line_color)
                line_count += 1
            elif isinstance(element, CubicBezier):
                PathRenderer._draw_bezier(canvas, widget, bezier_count, line_color)
                bezier_count += 1
    
    @staticmethod
    def _draw_line(canvas: OpenCVCanvas, widget: Any, 
                   line_index: int, color: Tuple[int, int, int, int]) -> None:
        """Draw a line element on the canvas."""
        start_x = int(getattr(widget, f"line{line_index}_start_x"))
        start_y = int(getattr(widget, f"line{line_index}_start_y"))
        end_x = int(getattr(widget, f"line{line_index}_end_x"))
        end_y = int(getattr(widget, f"line{line_index}_end_y"))
        width = int(getattr(widget, f"line{line_index}_width"))
        
        canvas.draw_line((start_x, start_y), (end_x, end_y), color, width)
    
    @staticmethod
    def _draw_bezier(canvas: OpenCVCanvas, widget: Any, 
                     bezier_index: int, color: Tuple[int, int, int, int]) -> None:
        """Draw a bezier curve element on the canvas."""
        start_x = int(getattr(widget, f"bezier{bezier_index}_start_x"))
        start_y = int(getattr(widget, f"bezier{bezier_index}_start_y"))
        ctrl1_x = int(getattr(widget, f"bezier{bezier_index}_control1_x"))
        ctrl1_y = int(getattr(widget, f"bezier{bezier_index}_control1_y"))
        ctrl2_x = int(getattr(widget, f"bezier{bezier_index}_control2_x"))
        ctrl2_y = int(getattr(widget, f"bezier{bezier_index}_control2_y"))
        end_x = int(getattr(widget, f"bezier{bezier_index}_end_x"))
        end_y = int(getattr(widget, f"bezier{bezier_index}_end_y"))
        width = int(getattr(widget, f"bezier{bezier_index}_width"))
        
        canvas.draw_bezier(
            (start_x, start_y),
            (ctrl1_x, ctrl1_y),
            (ctrl2_x, ctrl2_y),
            (end_x, end_y),
            color, width
        )
    
    @staticmethod
    def collect_shape_points(tmp_elements_lists: List, widget: Any, 
                             shape_id: str) -> List[float]:
        """
        Collect all current points for a shape during animation.
        
        Args:
            tmp_elements_lists: Path data from shape_animate
            widget: Widget containing animation properties
            shape_id: ID of the shape
            
        Returns:
            List of points representing the current shape state
        """
        shape_list = []
        line_count = 0
        bezier_count = 0

        for path_elements in tmp_elements_lists:
            for element in path_elements:
                # Collect line points
                if len(element) == 2:  # Line
                    shape_list.extend([
                        getattr(widget, f"{shape_id}_mesh_line{line_count}_start_x"),
                        getattr(widget, f"{shape_id}_mesh_line{line_count}_start_y"),
                        getattr(widget, f"{shape_id}_mesh_line{line_count}_end_x"),
                        getattr(widget, f"{shape_id}_mesh_line{line_count}_end_y")
                    ])
                    line_count += 1
                
                # Collect bezier points
                if len(element) == 4:  # Bezier
                    shape_list.extend(
                        get_all_points(
                            (getattr(widget, f"{shape_id}_mesh_bezier{bezier_count}_start_x"),
                             getattr(widget, f"{shape_id}_mesh_bezier{bezier_count}_start_y")),
                            (getattr(widget, f"{shape_id}_mesh_bezier{bezier_count}_control1_x"),
                             getattr(widget, f"{shape_id}_mesh_bezier{bezier_count}_control1_y")),
                            (getattr(widget, f"{shape_id}_mesh_bezier{bezier_count}_control2_x"),
                             getattr(widget, f"{shape_id}_mesh_bezier{bezier_count}_control2_y")),
                            (getattr(widget, f"{shape_id}_mesh_bezier{bezier_count}_end_x"),
                             getattr(widget, f"{shape_id}_mesh_bezier{bezier_count}_end_y"))
                        )
                    )
                    bezier_count += 1
        return shape_list
