#!/usr/bin/env python3
"""
Path Drawing and Filling Animation Example

This example demonstrates how to create SVG path drawing animations
with fill effects using the Kivg library. The output shows paths being
drawn progressively before the shape is filled with color.

This replicates the "Path Drawing & filling" demo shown in the README.
"""
import os
import sys

# Add parent directory to path for development
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kivg import Kivg


def create_path_drawing_animation():
    """
    Create a path drawing animation with fill effect.
    
    This demonstrates the core feature of Kivg: drawing SVG paths
    progressively as an animation, then filling them with color.
    """
    # Get the directory containing the demo script
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(demo_dir, "icons")
    output_dir = os.path.join(demo_dir, "output")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Use the Python icon for this demo (good visibility of path drawing)
    svg_file = os.path.join(icons_dir, "python2.svg")
    
    if not os.path.exists(svg_file):
        print(f"Error: SVG file not found: {svg_file}")
        return False
    
    print("=" * 60)
    print("Path Drawing and Filling Animation Example")
    print("=" * 60)
    
    # Create renderer with white background for better visibility
    # Using higher resolution for better quality
    kivg = Kivg(width=512, height=512, background=(255, 255, 255, 255))
    
    print(f"\nRendering SVG: {svg_file}")
    print("Animation settings:")
    print("  - Type: Sequential (paths draw one after another)")
    print("  - Fill: True (shapes are filled after drawing)")
    print("  - FPS: 30 frames per second")
    print("  - Duration per segment: 0.03 seconds")
    
    # Draw with animation - sequential mode
    # This draws each path element one after another
    frames = kivg.draw(
        svg_file,
        animate=True,          # Enable animation
        anim_type="seq",       # Sequential animation (paths draw one by one)
        fill=True,             # Fill the shape after drawing
        line_width=2,          # Width of the stroke
        line_color=(0, 0, 0, 255),  # Black stroke color
        dur=0.03,              # Duration per animation step
        fps=30                 # Frames per second
    )
    
    if frames:
        print(f"\nGenerated {len(frames)} animation frames")
        
        # Save as GIF
        gif_path = os.path.join(output_dir, "path_drawing_animation.gif")
        print(f"Saving animation to: {gif_path}")
        
        if kivg.save_gif(gif_path, fps=30):
            print(f"✓ GIF saved successfully!")
        else:
            print("✗ Failed to save GIF")
        
        # Save as MP4 video as well
        video_path = os.path.join(output_dir, "path_drawing_animation.mp4")
        print(f"Saving video to: {video_path}")
        
        if kivg.save_animation(video_path, fps=30):
            print(f"✓ Video saved successfully!")
        else:
            print("✗ Failed to save video")
        
        # Also save the final static frame
        static_path = os.path.join(output_dir, "path_drawing_final.png")
        kivg.save_image(static_path)
        print(f"✓ Final frame saved to: {static_path}")
        
        return True
    else:
        print("No frames generated")
        return False


def create_parallel_animation():
    """
    Create a parallel path drawing animation.
    
    This demonstrates parallel animation where all paths
    are drawn simultaneously.
    """
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(demo_dir, "icons")
    output_dir = os.path.join(demo_dir, "output")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Use the GitHub icon for parallel animation demo
    svg_file = os.path.join(icons_dir, "github3.svg")
    
    if not os.path.exists(svg_file):
        print(f"Error: SVG file not found: {svg_file}")
        return False
    
    print("\n" + "=" * 60)
    print("Parallel Animation Example")
    print("=" * 60)
    
    # Create renderer
    kivg = Kivg(width=512, height=512, background=(255, 255, 255, 255))
    
    print(f"\nRendering SVG: {svg_file}")
    print("Animation settings:")
    print("  - Type: Parallel (all paths draw simultaneously)")
    print("  - Fill: True")
    print("  - FPS: 30")
    
    # Draw with parallel animation
    frames = kivg.draw(
        svg_file,
        animate=True,
        anim_type="par",       # Parallel animation (all paths draw together)
        fill=True,
        line_width=2,
        line_color=(0, 0, 0, 255),
        dur=0.05,
        fps=30
    )
    
    if frames:
        print(f"\nGenerated {len(frames)} animation frames")
        
        # Save as GIF
        gif_path = os.path.join(output_dir, "parallel_animation.gif")
        if kivg.save_gif(gif_path, fps=30):
            print(f"✓ GIF saved: {gif_path}")
        
        return True
    
    return False


def create_outline_only_animation():
    """
    Create an outline-only animation (no fill).
    
    This demonstrates path drawing without filling.
    """
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(demo_dir, "icons")
    output_dir = os.path.join(demo_dir, "output")
    
    os.makedirs(output_dir, exist_ok=True)
    
    svg_file = os.path.join(icons_dir, "search.svg")
    
    if not os.path.exists(svg_file):
        print(f"Error: SVG file not found: {svg_file}")
        return False
    
    print("\n" + "=" * 60)
    print("Outline Only Animation Example")
    print("=" * 60)
    
    # Create renderer with transparent background
    kivg = Kivg(width=512, height=512, background=(255, 255, 255, 255))
    
    print(f"\nRendering SVG: {svg_file}")
    print("Animation settings:")
    print("  - Type: Sequential")
    print("  - Fill: False (outline only)")
    print("  - FPS: 30")
    
    # Draw without fill
    frames = kivg.draw(
        svg_file,
        animate=True,
        anim_type="seq",
        fill=False,            # No fill - outline only
        line_width=3,          # Thicker line for visibility
        line_color=(0, 0, 0, 255),
        dur=0.02,
        fps=30
    )
    
    if frames:
        print(f"\nGenerated {len(frames)} animation frames")
        
        # Save as GIF
        gif_path = os.path.join(output_dir, "outline_animation.gif")
        if kivg.save_gif(gif_path, fps=30):
            print(f"✓ GIF saved: {gif_path}")
        
        return True
    
    return False


def main():
    """Run all path drawing animation examples."""
    print("\n" + "=" * 60)
    print("KIVG - Path Drawing and Filling Animation Examples")
    print("=" * 60)
    
    # Run the main path drawing animation
    success = create_path_drawing_animation()
    
    # Run additional examples
    create_parallel_animation()
    create_outline_only_animation()
    
    print("\n" + "=" * 60)
    print("Examples Complete!")
    print("=" * 60)
    print("\nOutput files have been saved to the 'demo/output' directory.")
    print("\nGenerated files:")
    print("  - path_drawing_animation.gif - Sequential path drawing with fill")
    print("  - path_drawing_animation.mp4 - Same as above in video format")
    print("  - path_drawing_final.png     - Final static frame")
    print("  - parallel_animation.gif     - Parallel path drawing")
    print("  - outline_animation.gif      - Outline only (no fill)")
    
    return success


if __name__ == "__main__":
    main()
