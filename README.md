## Kivg
*SVG path drawing and animation using OpenCV - Headless rendering without UI dependencies*

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/shashi278/kivg/.github%2Fworkflows%2Fpython-publish.yml) [![Python 3.8+](https://img.shields.io/pypi/pyversions/kivg)](https://www.python.org/downloads/) [![pypi](https://img.shields.io/pypi/v/kivg)](https://pypi.org/project/Kivg/) [![code size](https://img.shields.io/github/languages/code-size/shashi278/svg-anim-kivy)]() [![license](https://img.shields.io/github/license/shashi278/svg-anim-kivy)](https://github.com/shashi278/svg-anim-kivy/blob/main/LICENSE) [![downloads](https://img.shields.io/pypi/dm/kivg)](https://pypi.org/project/Kivg/) ![Pepy Total Downloads](https://img.shields.io/pepy/dt/kivg?label=Total%20Downloads)


#

## Features

✅ **Headless Rendering** - No UI or display required  
✅ **Direct Image Export** - Save to PNG, JPG  
✅ **Video Export** - Save animations as MP4, AVI  
✅ **GIF Export** - Create animated GIFs  
✅ **Lightweight** - Uses opencv-python-headless  
✅ **Server Ready** - Perfect for backend pipelines, APIs, and Docker

| **Path Drawing & filling** | **Shape Animation** |
| :-------------: |:-------------:|
| <img src="https://raw.githubusercontent.com/shashi278/svg-anim-kivy/main/demo/svg_demo.gif" width=300> | <img src="https://raw.githubusercontent.com/shashi278/svg-anim-kivy/main/demo/adv_svg_anim.gif" width=300> |

Now you can take some of the advantages svg offers in your applications:
- [x] Compact file size compared to other formats - reduced asset size
- [x] Scalability - Draw them big or small
- [x] Interactivity - Animations
- [x] Export to images and videos

#

## Install
```bash
pip install kivg
```

For GIF export support:
```bash
pip install kivg[gif]
```

## Usage Guide

Kivg helps you easily draw and animate SVG files with OpenCV.

### Basic Drawing

```python
from kivg import Kivg

# Create renderer (512x512 canvas with white background)
kivg = Kivg(width=512, height=512, background=(255, 255, 255, 255))

# Draw an SVG file
kivg.draw("github.svg", fill=True)

# Save to image
kivg.save_image("output.png")
```

### Animation and Export

```python
from kivg import Kivg

kivg = Kivg(width=512, height=512)

# Draw with animation (returns list of frames)
frames = kivg.draw("logo.svg", fill=True, animate=True, anim_type="seq", fps=30)

# Save animation as video
kivg.save_animation("animation.mp4", fps=30)

# Or save as GIF (requires imageio)
kivg.save_gif("animation.gif", fps=30)
```

### Parameters for draw():
- **fill** : *Whether to fill the shape after drawing*. Defaults to `True`
- **animate** : *Whether to animate drawing*. Defaults to `False`
- **anim_type** : *Animation type - `"seq"` (sequential) or `"par"` (parallel)*. Defaults to `"seq"`
- **line_width** : *Width of the path stroke*. Defaults to `2`
- **line_color** : *Color of the path stroke in RGBA format (0-255)*. Defaults to `(0, 0, 0, 255)`
- **dur** : *Duration of each animation step in seconds*. Defaults to `0.02`
- **fps** : *Frames per second for animation*. Defaults to `30`

### Important Notes:
- Fill color only works if it's in hex format inside `<path>` tag
- Gradient is not yet supported - defaults to `#ffffff` if can't parse color

#

## Project Structure

The project is organized into the following main components:

```
kivg/
├── __init__.py         # Package entry point
├── data_classes.py     # Data structures for animation contexts
├── main.py             # Core Kivg class implementation
├── path_utils.py       # SVG path utilities
├── svg_parser.py       # SVG parsing functionality
├── version.py          # Version information
├── core/               # Core rendering components
│   ├── animation.py    # Animation engine (standalone)
│   ├── canvas.py       # OpenCV-based canvas
│   └── easing.py       # Transition/easing functions
├── rendering/          # Rendering subsystem
│   ├── path_renderer.py    # Path rendering
│   └── shape_renderer.py   # Shape/polygon filling
├── export/             # Export functionality
│   ├── image.py        # PNG/JPG export
│   ├── video.py        # MP4/AVI export
│   └── gif.py          # GIF export
├── animation/          # Animation subsystem
│   ├── animation_shapes.py  # Shape-specific animations
│   └── handler.py           # Animation coordination
└── drawing/            # Drawing subsystem
    └── manager.py      # Drawing management
```

## Quick Start

1. **Install the package**:
   ```bash
   pip install kivg
   ```

2. **Render SVG to image**:
   ```python
   from kivg import Kivg

   # Create renderer
   kivg = Kivg(width=256, height=256)
   
   # Draw SVG
   kivg.draw("icons/github.svg", fill=True)
   
   # Save output
   kivg.save_image("github.png")
   ```

3. **Create animation video**:
   ```python
   from kivg import Kivg

   kivg = Kivg(width=512, height=512)
   
   # Generate animation frames
   kivg.draw("logo.svg", animate=True, fill=True, fps=30)
   
   # Export as video
   kivg.save_animation("logo_animation.mp4", fps=30)
   ```

## Useful Tools

Few links that I found useful for modifying few svg files in order to work with this library are:

* https://itchylabs.com/tools/path-to-bezier/ - Convert SVG Path to Cubic Curves

    Use it to convert SVG Arcs to Cubic Bezier. Make sure you paste the entire `path` in the textfield rather than only the arc section. Also you should provide path dimensions(`W` & `H`) on the website as your svg width and height(found under `<svg>` tag). You may also need to close each path, i.e. add `Z` at the end of new converted path.

* https://codepen.io/thednp/pen/EgVqLw - Convert Relative SVG Path To Absolute Path
    
    Maybe useful when you want to split a single svg path into multiple paths for animation purpose. Paste the entire path. When splitting, make sure you close the previous path by adding a `Z` at the end in the path string.

* https://jakearchibald.github.io/svgomg/ - SVG Optimizer
    
    Useful for cleaning up and optimizing SVG files to ensure compatibility.

## Changelog

**v2.0 (OpenCV Migration)**
* Migrated from Kivy to OpenCV for headless rendering
* Added image export (PNG, JPG)
* Added video export (MP4, AVI)
* Added GIF export support
* Removed UI dependencies - now works on servers without display
* Lighter package size with opencv-python-headless

**v1.1**
* Fixed crashing when SVG size is not int

**v1.0**
* Shape animation feature added
* Added `anim_type` in draw method

**Earlier Changes**
* Added option to draw image without animation, `animate=False`
* Added option to draw empty or filled path, `fill=True` or `fill=False`

## Contributing

![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)

We welcome contributions! Here's how you can help:

1. **Bug fixes**: If you find a bug, please open an issue or submit a pull request with a fix
2. **Feature additions**: Have an idea for a new feature? Open an issue to discuss it
3. **Documentation**: Improvements to documentation are always appreciated
4. **Examples**: Add more example use cases to help others learn

Please make sure to test your changes before submitting a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/shashi278/svg-anim-kivy/blob/main/LICENSE) file for details.
