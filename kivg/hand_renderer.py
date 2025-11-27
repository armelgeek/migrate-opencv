"""
Hand Renderer for Kivg - Drawing Hand Animation Support

This module provides the drawing hand functionality for the Kivg SVG animation library.
It renders a hand image that follows the drawing path, creating a realistic
handwriting effect.

Usage:
    from kivg.hand_renderer import HandRenderer
    
    # Initialize with hand image path
    hand_renderer = HandRenderer(
        hand_image_path='path/to/drawing-hand.png',
        hand_mask_path='path/to/hand-mask.png'
    )
    
    # Attach to a Kivg instance
    kivg_instance = Kivg(widget)
    hand_renderer.attach_to_kivg(kivg_instance)
    
    # Draw with hand animation
    kivg_instance.draw('path/to/svg', animate=True, show_hand=True)
"""

import os
from typing import Tuple, Optional, List, Any, Callable
from dataclasses import dataclass

from kivy.graphics import Rectangle, Color
from kivy.graphics.texture import Texture
from kivy.core.image import Image as CoreImage
from kivy.clock import Clock
from kivy.properties import NumericProperty, ObjectProperty


# Maximum number of path elements to search when finding drawing position
# This is a reasonable upper limit for complex SVG paths
MAX_PATH_ELEMENT_SEARCH = 100


@dataclass
class HandConfig:
    """Configuration for hand rendering."""
    hand_image_path: str
    hand_mask_path: Optional[str] = None
    scale: float = 1.0
    offset_x: int = 0  # Offset from drawing point (pen tip adjustment)
    offset_y: int = 0
    rotation: float = 0.0  # Rotation angle in degrees
    opacity: float = 1.0
    visible: bool = True


class HandRenderer:
    """
    Renders a drawing hand that follows SVG path animation.
    
    This class manages the hand image display and updates its position
    based on the current drawing progress in Kivg animations.
    """
    
    def __init__(self, 
                 hand_image_path: str,
                 hand_mask_path: Optional[str] = None,
                 scale: float = 0.15,
                 offset_x: int = -30,
                 offset_y: int = -10):
        """
        Initialize the HandRenderer.
        
        Args:
            hand_image_path: Path to the hand image (PNG with transparency recommended)
            hand_mask_path: Optional path to hand mask for alpha compositing
            scale: Scale factor for the hand image (default 0.15 = 15% of original size)
            offset_x: X offset from drawing point (pen tip adjustment)
            offset_y: Y offset from drawing point (pen tip adjustment)
        """
        self.config = HandConfig(
            hand_image_path=hand_image_path,
            hand_mask_path=hand_mask_path,
            scale=scale,
            offset_x=offset_x,
            offset_y=offset_y
        )
        
        self._texture: Optional[Texture] = None
        self._mask_texture: Optional[Texture] = None
        self._hand_size: Tuple[int, int] = (0, 0)
        self._current_pos: Tuple[float, float] = (0, 0)
        self._kivg_instance: Optional[Any] = None
        self._widget: Optional[Any] = None
        self._hand_instruction: Optional[Rectangle] = None
        self._color_instruction: Optional[Color] = None
        self._is_visible: bool = False
        self._original_update_canvas: Optional[Callable] = None
        self._original_track_progress: Optional[Callable] = None
        
        # Load textures
        self._load_textures()
    
    def _load_textures(self) -> None:
        """Load hand and mask textures from files."""
        if os.path.exists(self.config.hand_image_path):
            try:
                hand_image = CoreImage(self.config.hand_image_path)
                self._texture = hand_image.texture
                
                # Calculate scaled size
                original_width = self._texture.width
                original_height = self._texture.height
                self._hand_size = (
                    int(original_width * self.config.scale),
                    int(original_height * self.config.scale)
                )
            except Exception as e:
                print(f"[HandRenderer] Failed to load hand image: {e}")
        else:
            print(f"[HandRenderer] Hand image not found: {self.config.hand_image_path}")
        
        if self.config.hand_mask_path and os.path.exists(self.config.hand_mask_path):
            try:
                mask_image = CoreImage(self.config.hand_mask_path)
                self._mask_texture = mask_image.texture
            except Exception as e:
                print(f"[HandRenderer] Failed to load hand mask: {e}")
    
    def attach_to_kivg(self, kivg_instance: Any) -> 'HandRenderer':
        """
        Attach this HandRenderer to a Kivg instance.
        
        This method patches the Kivg instance to include hand rendering
        during SVG path animations.
        
        Args:
            kivg_instance: The Kivg instance to attach to
            
        Returns:
            Self for method chaining
        """
        self._kivg_instance = kivg_instance
        self._widget = kivg_instance.widget
        
        # Store original methods
        self._original_update_canvas = kivg_instance.update_canvas
        self._original_track_progress = kivg_instance.track_progress
        
        # Patch methods to include hand rendering
        kivg_instance.update_canvas = self._patched_update_canvas
        kivg_instance.track_progress = self._patched_track_progress
        
        # Add show_hand property to kivg instance
        kivg_instance._show_hand = False
        kivg_instance._hand_renderer = self
        
        return self
    
    def detach(self) -> None:
        """Detach the HandRenderer from the Kivg instance."""
        if self._kivg_instance:
            # Restore original methods
            if self._original_update_canvas:
                self._kivg_instance.update_canvas = self._original_update_canvas
            if self._original_track_progress:
                self._kivg_instance.track_progress = self._original_track_progress
            
            self._kivg_instance._show_hand = False
            self._kivg_instance._hand_renderer = None
            self._kivg_instance = None
        
        self.hide_hand()
    
    def _patched_update_canvas(self, *args, **kwargs) -> None:
        """Patched update_canvas that includes hand rendering."""
        # Call original update_canvas
        self._original_update_canvas(*args, **kwargs)
        
        # Show hand if enabled
        if getattr(self._kivg_instance, '_show_hand', False):
            self._update_hand_position_from_progress()
    
    def _patched_track_progress(self, *args) -> None:
        """Patched track_progress that includes hand rendering."""
        # Call original track_progress
        self._original_track_progress(*args)
        
        # Update hand position if enabled
        if getattr(self._kivg_instance, '_show_hand', False):
            self._update_hand_position_from_shape()
    
    def _update_hand_position_from_progress(self) -> None:
        """Update hand position based on current line/bezier endpoints."""
        if not self._widget:
            return
        
        # Try to get the current drawing position from line properties
        # This looks for the most recently animated line or bezier endpoint
        pos = self._find_current_drawing_position()
        if pos:
            self.show_hand_at(pos[0], pos[1])
    
    def _update_hand_position_from_shape(self) -> None:
        """Update hand position based on current shape animation state."""
        if not self._kivg_instance:
            return
        
        # Get current shape ID
        curr_id = getattr(self._kivg_instance, "curr_id", None)
        if not curr_id:
            return
        
        # Try to find current position from mesh properties
        pos = self._find_shape_position(curr_id)
        if pos:
            self.show_hand_at(pos[0], pos[1])
    
    def _find_current_drawing_position(self) -> Optional[Tuple[float, float]]:
        """Find the current drawing position from widget properties."""
        if not self._widget:
            return None
        
        # Search for line endpoints (most common case)
        pos = self._find_endpoint_position("line", "")
        if pos:
            return pos
        
        # Search for bezier endpoints
        return self._find_endpoint_position("bezier", "")
    
    def _find_shape_position(self, shape_id: str) -> Optional[Tuple[float, float]]:
        """Find position from shape mesh properties."""
        if not self._widget:
            return None
        
        # Search for mesh line endpoints
        pos = self._find_endpoint_position("line", f"{shape_id}_mesh_", check_width=False)
        if pos:
            return pos
        
        # Search for mesh bezier endpoints
        return self._find_endpoint_position("bezier", f"{shape_id}_mesh_", check_width=False)
    
    def _find_endpoint_position(self, element_type: str, prefix: str, 
                                 check_width: bool = True) -> Optional[Tuple[float, float]]:
        """
        Find endpoint position from widget properties.
        
        Args:
            element_type: Type of element ('line' or 'bezier')
            prefix: Property name prefix (e.g., '' for lines, 'shape_id_mesh_' for mesh lines)
            check_width: Whether to check if width > 0 (for detecting active animations)
            
        Returns:
            Tuple of (x, y) coordinates if found, None otherwise
        """
        if not self._widget:
            return None
        
        for i in range(MAX_PATH_ELEMENT_SEARCH):
            prop_prefix = f"{prefix}{element_type}{i}"
            try:
                end_x = getattr(self._widget, f"{prop_prefix}_end_x", None)
                end_y = getattr(self._widget, f"{prop_prefix}_end_y", None)
                if end_x is not None and end_y is not None:
                    if check_width:
                        width = getattr(self._widget, f"{prop_prefix}_width", 0)
                        if width > 0:
                            return (end_x, end_y)
                    else:
                        return (end_x, end_y)
            except AttributeError:
                break
        
        return None
    
    def show_hand_at(self, x: float, y: float) -> None:
        """
        Show the drawing hand at the specified position.
        
        Args:
            x: X coordinate (pen tip position)
            y: Y coordinate (pen tip position)
        """
        if not self._texture or not self._widget:
            return
        
        self._current_pos = (x, y)
        self._is_visible = True
        
        # Calculate hand position with offset (pen tip adjustment)
        hand_x = x + self.config.offset_x
        hand_y = y + self.config.offset_y
        
        # Update or create hand graphics instruction
        if self._hand_instruction:
            self._hand_instruction.pos = (hand_x, hand_y)
            self._hand_instruction.size = self._hand_size
        else:
            with self._widget.canvas:
                self._color_instruction = Color(1, 1, 1, self.config.opacity)
                self._hand_instruction = Rectangle(
                    texture=self._texture,
                    pos=(hand_x, hand_y),
                    size=self._hand_size
                )
    
    def hide_hand(self) -> None:
        """Hide the drawing hand."""
        self._is_visible = False
        
        if self._widget and self._hand_instruction:
            try:
                self._widget.canvas.remove(self._hand_instruction)
                if self._color_instruction:
                    self._widget.canvas.remove(self._color_instruction)
            except (ValueError, AttributeError):
                # Instruction might already be removed or canvas state changed
                pass
            
            self._hand_instruction = None
            self._color_instruction = None
    
    def set_scale(self, scale: float) -> None:
        """Set the hand image scale."""
        self.config.scale = scale
        if self._texture:
            self._hand_size = (
                int(self._texture.width * scale),
                int(self._texture.height * scale)
            )
    
    def set_offset(self, offset_x: int, offset_y: int) -> None:
        """Set the pen tip offset."""
        self.config.offset_x = offset_x
        self.config.offset_y = offset_y
    
    def set_opacity(self, opacity: float) -> None:
        """Set the hand opacity (0.0 to 1.0)."""
        self.config.opacity = max(0.0, min(1.0, opacity))
        if self._color_instruction:
            self._color_instruction.a = self.config.opacity
    
    @property
    def is_visible(self) -> bool:
        """Check if the hand is currently visible."""
        return self._is_visible
    
    @property
    def position(self) -> Tuple[float, float]:
        """Get the current hand position."""
        return self._current_pos
    
    @property
    def size(self) -> Tuple[int, int]:
        """Get the current hand size (width, height)."""
        return self._hand_size


def enable_hand_drawing(kivg_instance: Any, 
                        hand_image_path: str,
                        hand_mask_path: Optional[str] = None,
                        scale: float = 0.15,
                        offset_x: int = -30,
                        offset_y: int = -10) -> HandRenderer:
    """
    Convenience function to enable hand drawing on a Kivg instance.
    
    Args:
        kivg_instance: The Kivg instance to enable hand drawing on
        hand_image_path: Path to the hand image
        hand_mask_path: Optional path to hand mask
        scale: Scale factor for the hand image
        offset_x: X offset from drawing point
        offset_y: Y offset from drawing point
        
    Returns:
        The HandRenderer instance for further configuration
        
    Example:
        from kivg import Kivg
        from kivg.hand_renderer import enable_hand_drawing
        
        kivg = Kivg(my_widget)
        hand = enable_hand_drawing(kivg, 'path/to/hand.png')
        kivg._show_hand = True  # Enable hand visibility
        kivg.draw('my_svg.svg', animate=True)
    """
    hand_renderer = HandRenderer(
        hand_image_path=hand_image_path,
        hand_mask_path=hand_mask_path,
        scale=scale,
        offset_x=offset_x,
        offset_y=offset_y
    )
    hand_renderer.attach_to_kivg(kivg_instance)
    return hand_renderer
