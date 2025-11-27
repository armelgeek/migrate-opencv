#!/usr/bin/env python3
"""
Demo script for text drawing and animation functionality.
"""
import os
import sys

# Add parent directory to path for development
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kivg import Kivg


def test_direct_text_drawing():
    """Test direct text drawing on canvas."""
    print("Testing direct text drawing...")
    
    # Create renderer with white background
    kivg = Kivg(width=400, height=200, background=(255, 255, 255, 255))
    
    # Draw text directly
    kivg.draw_text(
        "Hello World!", 
        x=50, y=80,
        font_size=48,
        font_weight='bold',
        fill=(0, 0, 0, 255)
    )
    
    # Draw more text
    kivg.draw_text(
        "Animated Text Demo",
        x=50, y=130,
        font_size=24,
        font_style='italic',
        fill='#0066CC'
    )
    
    # Save to file
    output_path = os.path.join(os.path.dirname(__file__), "output", "text_demo.png")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    kivg.save_image(output_path)
    print(f"  -> Saved: {output_path}")
    
    return True


def test_text_animation():
    """Test text animation (character-by-character reveal)."""
    print("Testing text animation...")
    
    # Create renderer with white background
    kivg = Kivg(width=400, height=100, background=(255, 255, 255, 255))
    
    # Draw animated text
    frames = kivg.draw_text(
        "Hello World!",
        x=50, y=60,
        font_size=48,
        font_weight='bold',
        fill=(0, 0, 0, 255),
        animate=True,
        duration=2.0,
        fps=15
    )
    
    print(f"  -> Generated {len(frames)} frames")
    
    # Save as video
    output_path = os.path.join(os.path.dirname(__file__), "output", "text_animation.mp4")
    success = kivg.save_animation(output_path, fps=15)
    if success:
        print(f"  -> Saved: {output_path}")
    
    return len(frames) > 0


def test_svg_text_parsing():
    """Test SVG text element parsing."""
    print("Testing SVG text parsing...")
    
    from kivg.svg_parser import parse_text_elements
    
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    svg_path = os.path.join(demo_dir, "icons", "sample_text.svg")
    
    if not os.path.exists(svg_path):
        print(f"  -> SVG file not found: {svg_path}")
        return False
    
    svg_size, text_elements = parse_text_elements(svg_path)
    
    print(f"  -> SVG size: {svg_size}")
    print(f"  -> Found {len(text_elements)} text elements:")
    for te in text_elements:
        print(f"     - '{te['text']}' at ({te['x']}, {te['y']})")
    
    return len(text_elements) > 0


def test_svg_text_drawing():
    """Test drawing SVG text elements."""
    print("Testing SVG text drawing...")
    
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    svg_path = os.path.join(demo_dir, "icons", "sample_text.svg")
    output_path = os.path.join(demo_dir, "output", "svg_text_demo.png")
    
    # Create renderer with white background
    kivg = Kivg(width=400, height=200, background=(255, 255, 255, 255))
    
    # Draw SVG text elements
    kivg.draw_text_svg(svg_path, animate=False)
    
    # Save to file
    kivg.save_image(output_path)
    print(f"  -> Saved: {output_path}")
    
    return True


def test_svg_text_animation():
    """Test SVG text animation."""
    print("Testing SVG text animation...")
    
    demo_dir = os.path.dirname(os.path.abspath(__file__))
    svg_path = os.path.join(demo_dir, "icons", "sample_text.svg")
    output_path = os.path.join(demo_dir, "output", "svg_text_animation.mp4")
    
    # Create renderer with white background
    kivg = Kivg(width=400, height=200, background=(255, 255, 255, 255))
    
    # Draw SVG text elements with animation
    frames = kivg.draw_text_svg(
        svg_path, 
        animate=True, 
        duration=3.0, 
        fps=15,
        anim_type='seq'
    )
    
    print(f"  -> Generated {len(frames)} frames")
    
    # Save as video
    success = kivg.save_animation(output_path, fps=15)
    if success:
        print(f"  -> Saved: {output_path}")
    
    return len(frames) > 0


def main():
    """Run all text tests."""
    print("=" * 50)
    print("Text Drawing and Animation Demo")
    print("=" * 50)
    print()
    
    results = []
    
    # Run tests
    results.append(("Direct text drawing", test_direct_text_drawing()))
    results.append(("Text animation", test_text_animation()))
    results.append(("SVG text parsing", test_svg_text_parsing()))
    results.append(("SVG text drawing", test_svg_text_drawing()))
    results.append(("SVG text animation", test_svg_text_animation()))
    
    print()
    print("=" * 50)
    print("Results:")
    print("=" * 50)
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"  {status}: {name}")
    
    all_passed = all(r[1] for r in results)
    print()
    if all_passed:
        print("All tests passed!")
    else:
        print("Some tests failed!")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
