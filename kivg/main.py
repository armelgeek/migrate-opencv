"""
Kivg - SVG drawing and animation using OpenCV
Core class and main API (headless, no UI required)
"""

from collections import OrderedDict
from typing import List, Tuple, Dict, Any, Callable, Optional
import numpy as np

from .core.canvas import OpenCVCanvas
from .core.animation import Animation
from .drawing.manager import DrawingManager
from .rendering.path_renderer import PathRenderer
from .rendering.shape_renderer import ShapeRenderer


class PropertyHolder:
    """
    Simple class to hold dynamic properties for animation.
    Replaces Kivy widget for headless rendering.
    """
    
    def __init__(self, width: int = 512, height: int = 512):
        """
        Initialize the property holder.
        
        Args:
            width: Canvas width
            height: Canvas height
        """
        self.size = (width, height)
        self.pos = (0, 0)
        self.mesh_opacity = 1.0


class Kivg:
    """
    Main class for rendering and animating SVG files using OpenCV.
    
    This class provides methods to draw SVG files to an OpenCV canvas
    and generate animation frames for export.
    """

    def __init__(self, width: int = 512, height: int = 512,
                 background: Tuple[int, int, int, int] = (0, 0, 0, 0)):
        """
        Initialize the Kivg renderer.
        
        Args:
            width: Canvas width in pixels
            height: Canvas height in pixels
            background: RGBA background color (0-255 for each component)
        """
        self.width = width
        self.height = height
        self.canvas = OpenCVCanvas(width, height, background)
        
        # Property holder (replaces Kivy widget)
        self.widget = PropertyHolder(width, height)
        
        # Default settings
        self._fill = True
        self._line_width = 1  # Thin stroke for smooth rendering
        self._line_color = (0, 0, 0, 255)  # RGBA 0-255
        self._animation_duration = 0.02
        self._previous_svg_file = ""
        
        # SVG data
        self.path = []
        self.closed_shapes = OrderedDict()
        self.svg_size = []
        self.current_svg_file = ""
        
        # Animation state
        self.all_anim = []
        self.curr_count = 0
        self.prev_shapes = []
        self.curr_shape = []
        
        # Stored animation frames
        self._frames: List[np.ndarray] = []

    def fill_up(self, shapes: List[List[float]], color: List[float]) -> None:
        """
        Fill shapes with specified color.
        
        Args:
            shapes: List of shape point lists to fill
            color: RGB or RGBA color (0-1 range for compatibility)
        """
        ShapeRenderer.render_mesh(self.canvas, self.widget, shapes, color, "mesh_opacity")

    def fill_up_shapes(self, *args) -> None:
        """Fill all shapes in the current SVG file, using line_color for transparent fills."""
        for id_, closed_paths in self.closed_shapes.items():
            color = self.closed_shapes[id_]["color"]
            # For shapes with transparent fill (fill="none" or invalid color),
            # use the line_color to fill them instead of skipping
            if len(color) >= 4 and color[3] == 0:
                # Use line_color for transparent fills
                fill_color = list(self._line_color)
                # Convert from 0-255 to 0-1 if needed:
                if all(c <= 1.0 for c in fill_color[:3]):
                    pass  # Already in 0-1 range
                else:
                    fill_color = [c / 255.0 for c in fill_color]
                self.fill_up(closed_paths[id_ + "shapes"], fill_color)
            else:
                self.fill_up(closed_paths[id_ + "shapes"], color)
    
    def fill_up_shapes_anim(self, shapes: List[Tuple[List[float], List[float]]], *args) -> None:
        """Fill shapes during animation."""
        for shape in shapes:
            color = shape[0]
            self.fill_up([shape[1]], color)

    def update_canvas(self, *args, **kwargs) -> None:
        """Update the canvas with the current drawing state."""
        # Convert line color from 0-1 to 0-255 if needed
        if all(c <= 1.0 for c in self._line_color[:3]):
            default_color = tuple(int(c * 255) for c in self._line_color)
        else:
            default_color = self._line_color
        
        PathRenderer.update_canvas(self.canvas, self.widget, self.path, 
                                  default_color, self._line_width)

    def draw(self, svg_file: str, animate: bool = False, 
             anim_type: str = "seq", *args, **kwargs) -> Optional[List[np.ndarray]]:
        """
        Draw an SVG file onto the canvas.
        
        Args:
            svg_file: Path to the SVG file
            animate: Whether to generate animation frames
            anim_type: Animation type - "seq" for sequential or "par" for parallel
            
        Keyword Args:
            fill: Whether to fill the drawing (bool)
            line_width: Width of lines (int)
            line_color: Color of lines (RGBA tuple, 0-255 or 0-1 range)
            dur: Duration of each animation step (float)
            fps: Frames per second for animation (int)
            from_shape_anim: Whether called from shape_animate (bool)
            
        Returns:
            List of animation frames if animate=True, None otherwise
        """
        # Process arguments
        fill = kwargs.get("fill", self._fill)
        line_width = kwargs.get("line_width", self._line_width)
        line_color = kwargs.get("line_color", self._line_color)
        duration = kwargs.get("dur", self._animation_duration)
        fps = kwargs.get("fps", 30)
        from_shape_anim = kwargs.get("from_shape_anim", False)
        anim_type = anim_type if anim_type in ("seq", "par") else "seq"
        
        # Update instance attributes
        self._fill = fill
        self._line_width = line_width
        self._line_color = line_color
        self._animation_duration = duration
        self.current_svg_file = svg_file
        
        # Process SVG if different from previous
        if svg_file != self._previous_svg_file:
            self.svg_size, self.closed_shapes, self.path = DrawingManager.process_path_data(svg_file)
            self._previous_svg_file = svg_file
        
        # Calculate paths
        anim_list = DrawingManager.calculate_paths(
            self.widget, self.closed_shapes, self.svg_size, 
            svg_file, animate, line_width, duration
        )
        
        # Handle rendering
        if not from_shape_anim:
            if animate:
                # Generate animation frames
                frames = self._generate_animation_frames(anim_list, fill, fps, anim_type)
                self._frames = frames
                return frames
            else:
                # Static rendering
                Animation.cancel_all(self.widget)
                self.canvas.clear()
                
                if fill:
                    # Draw fills first
                    self.fill_up_shapes()
                    # Then draw strokes on top
                    self.update_canvas()
                else:
                    # Draw only strokes
                    self.update_canvas()
                
                return None
        
        return None

    def _generate_animation_frames(self, anim_list: List[Animation], 
                                   fill: bool, fps: int, 
                                   anim_type: str) -> List[np.ndarray]:
        """
        Generate animation frames for export.
        
        Args:
            anim_list: List of animations
            fill: Whether to fill shapes
            fps: Frames per second
            anim_type: Animation type ("seq" or "par")
            
        Returns:
            List of frame images as numpy arrays
        """
        frames = []
        
        if not anim_list:
            # No animations, just return current canvas
            self.canvas.clear()
            if fill:
                self.fill_up_shapes()
            else:
                self.update_canvas()
            frames.append(self.canvas.get_image())
            return frames
        
        # Calculate total animation duration
        if anim_type == "seq":
            total_duration = sum(anim.duration for anim in anim_list)
        else:
            total_duration = max(anim.duration for anim in anim_list)
        
        # Add time for fill animation if needed
        if fill:
            total_duration += 0.4
        
        num_frames = max(1, int(total_duration * fps))
        
        # Store initial values for all animated properties
        initial_values = {}
        for anim in anim_list:
            for key in anim.animated_properties:
                if key not in initial_values:
                    initial_values[key] = getattr(self.widget, key, 0)
        
        # Generate frames by interpolating animation states
        for frame_idx in range(num_frames + 1):
            progress = frame_idx / num_frames if num_frames > 0 else 1.0
            current_time = progress * total_duration
            
            # Update animation properties for current time
            self._update_animation_state(anim_list, current_time, anim_type, initial_values)
            
            # Clear and redraw
            self.canvas.clear()
            
            # Calculate fill opacity
            fill_start_time = total_duration - 0.4 if fill else total_duration
            if fill and current_time >= fill_start_time:
                fill_progress = (current_time - fill_start_time) / 0.4
                self.widget.mesh_opacity = min(1.0, fill_progress)
                self.fill_up_shapes()
                # Draw strokes on top of fills only while fill is transitioning
                # Once fill is complete (fill_progress >= 0.99), remove strokes to show original image
                # Using 0.99 instead of 1.0 to handle floating-point precision issues
                if fill_progress < 0.99:
                    self.update_canvas()
            elif fill:
                self.widget.mesh_opacity = 0.0
                # Draw strokes during animation
                self.update_canvas()
            else:
                self.update_canvas()
            
            frames.append(self.canvas.get_image())
        
        return frames

    def _update_animation_state(self, anim_list: List[Animation], 
                                current_time: float, anim_type: str,
                                initial_values: Dict[str, Any]) -> None:
        """Update widget properties based on animation state at current time.
        
        Args:
            anim_list: List of animations
            current_time: Current time in the animation
            anim_type: Animation type ("seq" or "par")
            initial_values: Dictionary of initial property values
        """
        if anim_type == "seq":
            # Sequential: run animations one after another
            elapsed = 0
            # Track the end values of completed animations
            completed_values = dict(initial_values)
            
            for anim in anim_list:
                anim_end_time = elapsed + anim.duration
                
                if current_time < elapsed:
                    # Animation hasn't started yet, use completed values
                    break
                elif current_time >= elapsed and current_time < anim_end_time:
                    # This animation is active
                    local_progress = (current_time - elapsed) / anim.duration if anim.duration > 0 else 1.0
                    local_progress = min(1.0, max(0.0, local_progress))
                    t = anim._transition(local_progress)
                    
                    for key, target in anim.animated_properties.items():
                        start_val = completed_values.get(key, initial_values.get(key, 0))
                        value = start_val + (target - start_val) * t
                        setattr(self.widget, key, value)
                    break
                else:
                    # Animation completed, update completed values
                    for key, target in anim.animated_properties.items():
                        completed_values[key] = target
                        setattr(self.widget, key, target)
                
                elapsed = anim_end_time
        else:
            # Parallel: run all animations at once
            for anim in anim_list:
                progress = current_time / anim.duration if anim.duration > 0 else 1.0
                progress = min(1.0, max(0.0, progress))
                t = anim._transition(progress)
                
                for key, target in anim.animated_properties.items():
                    start_val = initial_values.get(key, 0)
                    value = start_val + (target - start_val) * t
                    setattr(self.widget, key, value)

    def save_image(self, path: str) -> None:
        """
        Save the current canvas to an image file.
        
        Args:
            path: Output file path (.png, .jpg, etc.)
        """
        self.canvas.save(path)
    
    def save_animation(self, path: str, fps: int = 30) -> bool:
        """
        Save animation frames to a video file.
        
        Args:
            path: Output file path (.mp4, .avi, etc.)
            fps: Frames per second
            
        Returns:
            True if successful
        """
        from .export.video import write_video
        
        if not self._frames:
            return False
        
        return write_video(self._frames, path, fps)
    
    def save_gif(self, path: str, fps: int = 30) -> bool:
        """
        Save animation frames to a GIF file.
        
        Args:
            path: Output file path (.gif)
            fps: Frames per second
            
        Returns:
            True if successful
        """
        from .export.gif import save_gif
        
        if not self._frames:
            return False
        
        return save_gif(self._frames, path, fps)
    
    def get_image(self) -> np.ndarray:
        """
        Get the current canvas as a numpy array.
        
        Returns:
            Canvas image as RGBA numpy array
        """
        return self.canvas.get_image()
    
    def get_frames(self) -> List[np.ndarray]:
        """
        Get the stored animation frames.
        
        Returns:
            List of frame images as numpy arrays
        """
        return self._frames.copy()
    
    def clear(self) -> None:
        """Clear the canvas."""
        self.canvas.clear()
        self._frames = []
