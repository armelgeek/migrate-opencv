#!/usr/bin/env python3
"""
Demo script for the OpenCV-based Kivg library.
Shows how to render SVG files without a UI.
"""
import os
import sys

# Add parent directory to path for development
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kivg import Kivg


def main():
    # Get the directory containing the demo script
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(demo_dir, "icons")
    output_dir = os.path.join(demo_dir, "output")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if icons directory exists
    if not os.path.exists(icons_dir):
        print(f"Icons directory not found: {icons_dir}")
        print("Please run this script from the demo directory.")
        return
    
    # List available SVG files
    svg_files = [f for f in os.listdir(icons_dir) if f.endswith('.svg')]
    print(f"Found {len(svg_files)} SVG files in {icons_dir}")
    
    # Create a Kivg renderer with transparent background
    kivg = Kivg(width=256, height=256, background=(0, 0, 0, 0))
    
    # Render each SVG file
    for svg_file in svg_files[:5]:  # Process first 5 files as demo
        svg_path = os.path.join(icons_dir, svg_file)
        output_path = os.path.join(output_dir, svg_file.replace('.svg', '.png'))
        
        print(f"Processing: {svg_file}")
        
        try:
            # Draw the SVG with fill
            kivg.draw(svg_path, fill=True)
            
            # Save as PNG
            kivg.save_image(output_path)
            print(f"  -> Saved: {output_path}")
            
        except Exception as e:
            print(f"  -> Error: {e}")
    
    print("\nDemo complete!")
    print(f"Output files saved to: {output_dir}")


if __name__ == "__main__":
    main()
