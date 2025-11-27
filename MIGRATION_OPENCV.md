# Migration de Kivg vers OpenCV

## 🎯 Objectif

Remplacer la dépendance **Kivy** (framework UI desktop) par **OpenCV** (bibliothèque de vision/graphisme headless) pour permettre :

- ✅ Rendu SVG sans fenêtre UI
- ✅ Export en images/vidéos
- ✅ Utilisation dans des pipelines backend
- ✅ Déploiement mobile/web/embedded plus facile
- ✅ Bundle plus léger

---

## 📊 Comparaison Kivy vs OpenCV

| Fonctionnalité | Kivy | OpenCV |
|----------------|------|--------|
| **UI nécessaire** | ✅ Oui (fenêtre) | ❌ Non (headless) |
| **Rendu vectoriel** | ✅ Natif | ⚠️ Via rasterisation |
| **Animations** | ✅ Moteur intégré | ⚠️ À implémenter |
| **Courbes de Bézier** | ✅ Natif | ⚠️ À implémenter |
| **Remplissage formes** | ✅ Mesh/Tessellation | ✅ `cv2.fillPoly()` |
| **Taille** | ~50MB | ~20MB |
| **Performance** | Bonne | Excellente |
| **Export image** | ⚠️ Screenshot | ✅ Natif |
| **Export vidéo** | ❌ Complexe | ✅ `cv2.VideoWriter` |

---

## 🗺️ Mapping des Fonctionnalités

### 1. Rendu de Base

#### Kivy (Actuel)
```python
from kivy.graphics import Line, Color

with widget.canvas:
    Color(1, 0, 0, 1)  # Rouge
    Line(points=[x1, y1, x2, y2], width=2)
    Line(bezier=[x1, y1, cx1, cy1, cx2, cy2, x2, y2], width=2)
```

#### OpenCV (Proposé)
```python
import cv2
import numpy as np

# Canvas (image)
canvas = np.zeros((height, width, 4), dtype=np.uint8)  # RGBA

# Ligne
cv2.line(canvas, (x1, y1), (x2, y2), 
         color=(0, 0, 255, 255), thickness=2)  # BGR+A

# Courbe de Bézier (points discrets)
points = calculate_bezier_points(start, ctrl1, ctrl2, end, segments=100)
cv2.polylines(canvas, [points], isClosed=False, 
              color=(0, 0, 255, 255), thickness=2)
```

---

### 2. Remplissage de Formes

#### Kivy (Actuel)
```python
from kivy.graphics import Mesh
from kivy.graphics.tesselator import Tesselator, WINDING_ODD

tess = Tesselator()
tess.add_contour(shape_points)
tess.tesselate(WINDING_ODD, TYPE_POLYGONS)

for vertices, indices in tess.meshes:
    Mesh(vertices=vertices, indices=indices, mode="triangle_fan")
```

#### OpenCV (Proposé)
```python
import cv2
import numpy as np

# Convertir points en format OpenCV
shape_points = np.array(shape_points, dtype=np.int32)
shape_points = shape_points.reshape((-1, 1, 2))

# Remplir directement (OpenCV gère la tessellation)
cv2.fillPoly(canvas, [shape_points], color=(0, 0, 255, 255))
```

✅ **Plus simple** - OpenCV gère automatiquement les formes concaves et trous !

---

### 3. Système de Coordonnées

#### Kivy
```
(0, H) ──────► X
  ▲
  │
  │
(0, 0)
```

#### OpenCV
```
(0, 0) ──────► X
  │
  │
  ▼
  Y
```

#### Transformation
```python
# SVG → OpenCV (au lieu de SVG → Kivy)
def transform_y_opencv(y_svg, svg_height):
    """OpenCV a le même système que SVG (Y vers le bas)"""
    return y_svg  # Pas d'inversion nécessaire !

def transform_y_kivy(y_svg, widget_y, widget_height, svg_height):
    """Kivy inverse l'axe Y"""
    return widget_y + widget_height * (svg_height - y_svg) / svg_height
```

✅ **Avantage OpenCV** : Pas besoin d'inverser l'axe Y !

---

### 4. Animations

#### Kivy (Actuel)
```python
from kivy.animation import Animation

# Animation automatique des propriétés
anim = Animation(x=100, y=200, d=1.0, t='out_bounce')
anim.start(widget)
```

#### OpenCV (Proposé)
```python
import numpy as np

class SimpleAnimation:
    """Moteur d'animation simple pour OpenCV"""
    
    def __init__(self, start_val, end_val, duration, transition='linear'):
        self.start = start_val
        self.end = end_val
        self.duration = duration
        self.transition = transition
    
    def get_value(self, progress):
        """progress: 0.0 à 1.0"""
        # Applique la fonction de transition
        t = self._apply_transition(progress)
        
        # Interpole
        if isinstance(self.start, (int, float)):
            return self.start + (self.end - self.start) * t
        elif isinstance(self.start, np.ndarray):
            return self.start + (self.end - self.start) * t
    
    def _apply_transition(self, t):
        """Fonctions d'easing"""
        if self.transition == 'linear':
            return t
        elif self.transition == 'out_bounce':
            return self._out_bounce(t)
        elif self.transition == 'out_elastic':
            return self._out_elastic(t)
        # ... autres transitions
    
    @staticmethod
    def _out_bounce(t):
        if t < 1 / 2.75:
            return 7.5625 * t * t
        elif t < 2 / 2.75:
            t -= 1.5 / 2.75
            return 7.5625 * t * t + 0.75
        elif t < 2.5 / 2.75:
            t -= 2.25 / 2.75
            return 7.5625 * t * t + 0.9375
        else:
            t -= 2.625 / 2.75
            return 7.5625 * t * t + 0.984375

# Usage
anim = SimpleAnimation(start_val=0, end_val=100, duration=1.0, transition='out_bounce')

# Génération de frames
fps = 30
num_frames = int(duration * fps)
for i in range(num_frames):
    progress = i / num_frames
    current_value = anim.get_value(progress)
    # Dessiner avec current_value
```

---

### 5. Export Vidéo (Nouvelle Fonctionnalité !)

```python
import cv2

class SVGAnimationRenderer:
    def __init__(self, width, height, fps=30):
        self.width = width
        self.height = height
        self.fps = fps
        self.fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.writer = None
    
    def start_recording(self, output_path):
        """Démarre l'enregistrement vidéo"""
        self.writer = cv2.VideoWriter(
            output_path, 
            self.fourcc, 
            self.fps, 
            (self.width, self.height)
        )
    
    def add_frame(self, canvas):
        """Ajoute une frame à la vidéo"""
        # Convertir RGBA → BGR pour OpenCV
        bgr = cv2.cvtColor(canvas, cv2.COLOR_RGBA2BGR)
        self.writer.write(bgr)
    
    def finish(self):
        """Termine l'enregistrement"""
        self.writer.release()

# Usage
renderer = SVGAnimationRenderer(512, 512, fps=30)
renderer.start_recording("animation.mp4")

for frame in animation_frames:
    canvas = render_svg_frame(frame)
    renderer.add_frame(canvas)

renderer.finish()
```

✅ **Nouvelle capacité** : Export direct en vidéo MP4/AVI/MOV !

---

## 🏗️ Architecture Proposée

```
kivg-opencv/
├── __init__.py
├── core/
│   ├── canvas.py           # Classe Canvas (wrapper numpy array)
│   ├── animation.py        # Moteur d'animation simple
│   └── easing.py           # Fonctions de transition
│
├── rendering/
│   ├── svg_parser.py       # Parsing SVG (inchangé)
│   ├── path_renderer.py    # Rendu paths avec OpenCV
│   ├── shape_renderer.py   # Remplissage formes
│   └── bezier.py           # Calcul courbes de Bézier
│
├── export/
│   ├── image.py            # Export PNG/JPG
│   ├── video.py            # Export MP4/AVI
│   └── gif.py              # Export GIF animé
│
└── main.py                 # API publique (compatible kivg)
```

---

## 🔄 Plan de Migration

### Phase 1 : Rendu Statique
- [ ] Remplacer `kivy.graphics.Line` → `cv2.line` / `cv2.polylines`
- [ ] Remplacer `kivy.graphics.Mesh` → `cv2.fillPoly`
- [ ] Adapter système de coordonnées
- [ ] Implémenter génération de courbes de Bézier discrètes

### Phase 2 : Animation Basique
- [ ] Créer moteur d'animation simple
- [ ] Implémenter fonctions d'easing (linear, ease-in, ease-out, etc.)
- [ ] Adapter logique de `draw(animate=True)`
- [ ] Tester avec animations de tracé

### Phase 3 : Animation de Formes
- [ ] Adapter `shape_animate()`
- [ ] Implémenter animations directionnelles (left, right, top, bottom, center)
- [ ] Gérer séquences d'animations

### Phase 4 : Export
- [ ] Export images PNG/JPG
- [ ] Export vidéo MP4
- [ ] Export GIF animé
- [ ] Export séquence d'images

### Phase 5 : Optimisation
- [ ] Cache des chemins parsés
- [ ] Parallélisation du rendu (multiprocessing)
- [ ] Optimisation mémoire
- [ ] Benchmarks performance

---

## 💻 Exemple de Code Migré

### Classe Canvas OpenCV

```python
import cv2
import numpy as np
from typing import Tuple, List

class OpenCVCanvas:
    """Canvas basé sur OpenCV pour remplacer kivy.graphics.Canvas"""
    
    def __init__(self, width: int, height: int, background=(255, 255, 255, 255)):
        self.width = width
        self.height = height
        self.background = background
        self.image = np.full((height, width, 4), background, dtype=np.uint8)
        self.layers = []  # Stack de layers pour compositing
    
    def clear(self):
        """Efface le canvas"""
        self.image = np.full(
            (self.height, self.width, 4), 
            self.background, 
            dtype=np.uint8
        )
    
    def draw_line(self, start: Tuple[int, int], end: Tuple[int, int], 
                  color: Tuple[int, int, int, int], thickness: int = 1):
        """Dessine une ligne"""
        # OpenCV utilise BGR, on convertit RGBA → BGR
        bgr_color = (color[2], color[1], color[0])
        
        # Créer un layer temporaire pour gérer l'alpha
        if color[3] < 255:
            overlay = self.image.copy()
            cv2.line(overlay, start, end, bgr_color + (255,), thickness)
            alpha = color[3] / 255.0
            cv2.addWeighted(overlay, alpha, self.image, 1 - alpha, 0, self.image)
        else:
            cv2.line(self.image, start, end, bgr_color + (255,), thickness)
    
    def draw_bezier(self, start: Tuple[int, int], ctrl1: Tuple[int, int],
                    ctrl2: Tuple[int, int], end: Tuple[int, int],
                    color: Tuple[int, int, int, int], thickness: int = 1,
                    segments: int = 100):
        """Dessine une courbe de Bézier cubique"""
        points = self._calculate_bezier_points(start, ctrl1, ctrl2, end, segments)
        points = np.array(points, dtype=np.int32)
        
        bgr_color = (color[2], color[1], color[0])
        
        if color[3] < 255:
            overlay = self.image.copy()
            cv2.polylines(overlay, [points], isClosed=False, 
                         color=bgr_color + (255,), thickness=thickness)
            alpha = color[3] / 255.0
            cv2.addWeighted(overlay, alpha, self.image, 1 - alpha, 0, self.image)
        else:
            cv2.polylines(self.image, [points], isClosed=False,
                         color=bgr_color + (255,), thickness=thickness)
    
    def fill_polygon(self, points: List[Tuple[int, int]], 
                     color: Tuple[int, int, int, int]):
        """Remplit un polygone"""
        points_array = np.array(points, dtype=np.int32)
        bgr_color = (color[2], color[1], color[0])
        
        if color[3] < 255:
            overlay = self.image.copy()
            cv2.fillPoly(overlay, [points_array], bgr_color + (255,))
            alpha = color[3] / 255.0
            cv2.addWeighted(overlay, alpha, self.image, 1 - alpha, 0, self.image)
        else:
            cv2.fillPoly(self.image, [points_array], bgr_color + (255,))
    
    @staticmethod
    def _calculate_bezier_points(start, ctrl1, ctrl2, end, segments=100):
        """Calcule les points d'une courbe de Bézier cubique"""
        points = []
        for i in range(segments + 1):
            t = i / segments
            
            # Polynômes de Bernstein
            b0 = (1 - t) ** 3
            b1 = 3 * t * (1 - t) ** 2
            b2 = 3 * t ** 2 * (1 - t)
            b3 = t ** 3
            
            x = b0 * start[0] + b1 * ctrl1[0] + b2 * ctrl2[0] + b3 * end[0]
            y = b0 * start[1] + b1 * ctrl1[1] + b2 * ctrl2[1] + b3 * end[1]
            
            points.append((int(x), int(y)))
        
        return points
    
    def save(self, path: str):
        """Sauvegarde le canvas en image"""
        # Convertir RGBA → BGR pour OpenCV
        bgr = cv2.cvtColor(self.image, cv2.COLOR_RGBA2BGR)
        cv2.imwrite(path, bgr)
    
    def get_image(self):
        """Retourne l'image numpy array"""
        return self.image.copy()
```

### Classe Kivg adaptée

```python
from typing import List, Dict, Any
import numpy as np

class KivgOpenCV:
    """Version OpenCV de Kivg"""
    
    def __init__(self, width: int = 512, height: int = 512):
        self.canvas = OpenCVCanvas(width, height)
        self.width = width
        self.height = height
        self._animation_frames = []
    
    def draw(self, svg_file: str, animate: bool = False, 
             fill: bool = True, line_width: int = 2, 
             line_color: Tuple[int, int, int, int] = (0, 0, 0, 255),
             duration: float = 0.02) -> None:
        """
        Dessine un SVG (compatible avec l'API kivg originale)
        
        Args:
            svg_file: Chemin vers le fichier SVG
            animate: Créer une animation du tracé
            fill: Remplir les formes
            line_width: Épaisseur des lignes
            line_color: Couleur RGBA
            duration: Durée de chaque étape (si animate=True)
        """
        # Parse SVG (réutilise svg_parser.py existant)
        from kivg.svg_parser import parse_svg
        svg_size, path_strings = parse_svg(svg_file)
        
        # Traite les chemins
        from kivg.drawing.manager import DrawingManager
        sw_size, closed_shapes, path_elements = DrawingManager.process_path_data(svg_file)
        
        if not animate:
            # Rendu statique
            self._render_static(closed_shapes, sw_size, fill, line_width, line_color)
        else:
            # Génère les frames d'animation
            self._render_animated(closed_shapes, sw_size, fill, line_width, 
                                 line_color, duration)
    
    def _render_static(self, closed_shapes, svg_size, fill, line_width, line_color):
        """Rendu statique (sans animation)"""
        self.canvas.clear()
        
        for shape_id, shape_data in closed_shapes.items():
            # Dessine les contours
            for path in shape_data[f"{shape_id}paths"]:
                self._render_path(path, svg_size, line_width, line_color)
            
            # Remplit si demandé
            if fill:
                for shape_points in shape_data[f"{shape_id}shapes"]:
                    # Convertit les points
                    points = self._transform_points(shape_points, svg_size)
                    self.canvas.fill_polygon(points, shape_data["color"])
    
    def _render_path(self, path_elements, svg_size, line_width, line_color):
        """Rend un chemin SVG"""
        from svg.path.path import Line, CubicBezier
        
        for element in path_elements:
            if isinstance(element, Line):
                start = self._transform_point(element.start, svg_size)
                end = self._transform_point(element.end, svg_size)
                self.canvas.draw_line(start, end, line_color, line_width)
            
            elif isinstance(element, CubicBezier):
                start = self._transform_point(element.start, svg_size)
                ctrl1 = self._transform_point(element.control1, svg_size)
                ctrl2 = self._transform_point(element.control2, svg_size)
                end = self._transform_point(element.end, svg_size)
                self.canvas.draw_bezier(start, ctrl1, ctrl2, end, 
                                       line_color, line_width)
    
    def _transform_point(self, complex_point, svg_size):
        """Transforme point SVG → OpenCV"""
        # OpenCV a le même système de coordonnées que SVG !
        x = int(complex_point.real * self.width / svg_size[0])
        y = int(complex_point.imag * self.height / svg_size[1])
        return (x, y)
    
    def _transform_points(self, flat_points, svg_size):
        """Transforme liste de points plats [x1,y1,x2,y2,...] → [(x1,y1), (x2,y2), ...]"""
        points = []
        for i in range(0, len(flat_points), 2):
            x = int(flat_points[i] * self.width / svg_size[0])
            y = int(flat_points[i+1] * self.height / svg_size[1])
            points.append((x, y))
        return points
    
    def save_image(self, path: str):
        """Sauvegarde en image"""
        self.canvas.save(path)
    
    def save_animation(self, path: str, fps: int = 30):
        """Sauvegarde les frames en vidéo"""
        if not self._animation_frames:
            raise ValueError("Aucune animation à sauvegarder")
        
        renderer = SVGAnimationRenderer(self.width, self.height, fps)
        renderer.start_recording(path)
        
        for frame in self._animation_frames:
            renderer.add_frame(frame)
        
        renderer.finish()
```

---

## 📦 Nouvelles Dépendances

### requirements-opencv.txt
```txt
opencv-python>=4.8.0      # Rendu et export
numpy>=1.24.0             # Manipulation d'images
svg.path==4.1             # Parsing SVG (inchangé)
imageio>=2.31.0           # Export GIF (optionnel)
```

**Comparaison de taille** :
- `kivy` : ~50 MB
- `opencv-python` : ~88 MB (mais plus de fonctionnalités)
- `opencv-python-headless` : ~30 MB (version sans GUI, recommandé !)

---

## ✅ Avantages de la Migration

1. **Headless** : Pas besoin de fenêtre/display
2. **Export natif** : Images, vidéos, GIF
3. **Performance** : OpenCV est optimisé C++
4. **Flexibilité** : Utilisation dans pipelines backend, APIs
5. **Déploiement** : Plus facile sur serveurs, cloud, Docker
6. **Nouveaux usages** :
   - Génération de thumbnails SVG
   - Prévisualisation SVG pour CMS
   - Rendu batch (milliers de SVG)
   - API de rendu SVG-to-image

---

## 🚀 Prochaines Étapes

1. **Créer un branch** `feature/opencv-backend`
2. **Implémenter** `OpenCVCanvas` avec tests unitaires
3. **Porter** le rendu statique (draw sans animate)
4. **Tester** avec les SVG de demo/
5. **Implémenter** le moteur d'animation
6. **Porter** shape_animate()
7. **Ajouter** export vidéo/GIF
8. **Benchmarks** performance vs Kivy
9. **Documentation** et exemples
10. **Release** kivg v2.0 avec backend OpenCV

---

## 🤔 Questions Ouvertes

1. **Compatibilité** : Garder l'API actuelle (widget) ou créer nouvelle API ?
2. **Backends multiples** : Supporter Kivy ET OpenCV avec abstraction ?
3. **Antialiasing** : OpenCV a moins d'options que Kivy, acceptable ?
4. **Transitions** : Implémenter toutes les transitions Kivy ou subset ?

---

**Auteur** : Plan de migration OpenCV  
**Date** : 27 novembre 2025  
**Status** : Proposition - En attente de validation
