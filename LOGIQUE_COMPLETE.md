# KIVG - Logique Complète du Projet

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du Projet](#architecture-du-projet)
3. [Flux de Données](#flux-de-données)
4. [Systèmes Principaux](#systèmes-principaux)
5. [Fonctionnement Détaillé](#fonctionnement-détaillé)
6. [Exemples d'Utilisation](#exemples-dutilisation)

---

## Vue d'ensemble

**Kivg** est une bibliothèque Python qui permet d'afficher et d'animer des fichiers SVG dans des applications Kivy. Elle transforme les chemins vectoriels SVG en graphiques Kivy natifs avec support d'animations sophistiquées.

### Objectifs Principaux

- ✅ **Rendu SVG** : Convertir les fichiers SVG en éléments graphiques Kivy
- ✅ **Animation de Tracé** : Animer le dessin progressif des chemins SVG
- ✅ **Animation de Formes** : Animer l'apparition de formes individuelles avec transitions personnalisées
- ✅ **Remplissage** : Support du remplissage coloré des formes fermées

---

## Architecture du Projet

```
kivg/
├── __init__.py              # Point d'entrée du package
├── main.py                  # Classe principale Kivg (API publique)
├── data_classes.py          # Structures de données (AnimationContext)
│
├── Parsing & Conversion SVG
│   ├── svg_parser.py        # Parse les fichiers SVG en données brutes
│   ├── path_utils.py        # Convertit coordonnées SVG → Kivy
│   └── mesh_handler.py      # Génère les meshes pour le remplissage
│
├── Rendu
│   ├── svg_renderer.py      # Dessine les paths sur le canvas Kivy
│   └── drawing/
│       └── manager.py       # Gère le traitement des chemins SVG
│
└── Animation
    ├── handler.py           # Coordonne les animations
    ├── animation_shapes.py  # Animations spécifiques aux formes
    └── kivy_animation.py    # Moteur d'animation (Kivy modifié)
```

---

## Flux de Données

### 1. Flux Principal - Dessin Simple

```
Fichier SVG
    ↓
svg_parser.parse_svg()          → Extrait viewBox, chemins, couleurs
    ↓
drawing_manager.process_path_data() → Parse les chemins en éléments (Line, CubicBezier)
    ↓
path_utils.transform_*()        → Convertit coordonnées SVG → Kivy
    ↓
drawing_manager.calculate_paths() → Prépare propriétés du widget
    ↓
svg_renderer.update_canvas()    → Dessine sur le canvas
    ↓
mesh_handler.render_mesh()      → Remplit les formes (optionnel)
```

### 2. Flux - Animation de Tracé (draw avec animate=True)

```
Fichier SVG
    ↓
[Même flux jusqu'à calculate_paths()]
    ↓
drawing_manager.calculate_paths() → Crée liste d'Animation
    ↓
animation_handler.create_animation_sequence() → Combine animations
    ↓
Animation démarre
    │
    ├→ on_progress → update_canvas() → Redessine progressivement
    │
    └→ on_complete → fill_up_shapes() → Remplit les formes
```

### 3. Flux - Animation de Formes (shape_animate)

```
Fichier SVG + Config Animation
    ↓
Kivg.shape_animate()
    ↓
animation_handler.prepare_shape_animations()
    ↓
Pour chaque forme:
    ├→ animation_shapes.setup_animation()
    │   ├→ _extract_path_data()     → Extrait les points
    │   ├→ _calculate_base_point()  → Trouve point de départ
    │   └→ _setup_*_animation()     → Configure l'animation
    │
    └→ Animations séquentielles
        │
        ├→ on_progress → track_progress() → Redessine forme actuelle
        │
        └→ on_complete → anim_on_comp() → Passe à la forme suivante
```

---

## Systèmes Principaux

### 🎯 1. Système de Parsing SVG (`svg_parser.py`)

**Responsabilité** : Extraire les données brutes du fichier SVG

```python
def parse_svg(svg_file: str) -> Tuple[List[float], List[Tuple[str, str, List[float]]]]:
    """
    Retourne:
    - svg_dimensions: [width, height] du viewBox
    - path_data: [(path_string, id, color), ...]
    """
```

**Logique** :
1. Parse le XML avec `minidom`
2. Extrait le `viewBox` pour les dimensions
3. Pour chaque `<path>` :
   - Récupère l'attribut `d` (définition du chemin)
   - Récupère l'attribut `id` (ou génère `path_N`)
   - Récupère l'attribut `fill` (couleur)
4. Retourne les données structurées

---

### 📐 2. Système de Transformation de Coordonnées (`path_utils.py`)

**Responsabilité** : Convertir les coordonnées SVG vers le système Kivy

#### Différences de Systèmes de Coordonnées

```
SVG:                          Kivy:
(0,0) ──────► X              (0,H) ──────► X
  │                              ▲
  │                              │
  ▼                              │
  Y                           (0,0)
```

**Fonctions Principales** :

```python
def transform_x(x_pos, widget_x, widget_width, svg_width, svg_file):
    """Convertit X: SVG → Kivy avec mise à l'échelle"""
    return widget_x + widget_width * x_pos / svg_width

def transform_y(y_pos, widget_y, widget_height, svg_height, svg_file):
    """Convertit Y: SVG → Kivy (inverse l'axe Y)"""
    return widget_y + widget_height * (svg_height - y_pos) / svg_height
```

**Logique** :
- ✅ Mise à l'échelle proportionnelle
- ✅ Inversion de l'axe Y
- ✅ Positionnement relatif au widget
- ✅ Cas spécial pour les icônes Kivy

#### Conversion des Éléments de Chemin

```python
def line_points(line: Line, widget_size, widget_pos, svg_size, svg_file):
    """Convertit Line SVG en [x1, y1, x2, y2] Kivy"""
    
def bezier_points(bezier: CubicBezier, widget_size, widget_pos, svg_size, svg_file):
    """Convertit CubicBezier en [x1, y1, cx1, cy1, cx2, cy2, x2, y2] Kivy"""
```

#### Génération de Points Discrets

```python
def get_all_points(start, control1, control2, end, segments=40):
    """
    Génère 40+ points le long d'une courbe de Bézier cubique
    Utilise les polynômes de Bernstein:
    B(t) = B0(t)*P0 + B1(t)*P1 + B2(t)*P2 + B3(t)*P3
    
    où: B0(t) = (1-t)³
        B1(t) = 3t(1-t)²
        B2(t) = 3t²(1-t)
        B3(t) = t³
    """
```

**Usage** : Nécessaire pour le remplissage (mesh) car on a besoin de points discrets, pas de courbes.

---

### 🎨 3. Système de Rendu (`svg_renderer.py`)

**Responsabilité** : Dessiner les chemins sur le canvas Kivy

```python
class SvgRenderer:
    @staticmethod
    def update_canvas(widget, path_elements, line_color):
        """Redessine tout le canvas"""
        widget.canvas.clear()
        with widget.canvas:
            Color(*line_color)
            for element in path_elements:
                if isinstance(element, Line):
                    _draw_line(widget, line_index)
                elif isinstance(element, CubicBezier):
                    _draw_bezier(widget, bezier_index)
```

**Logique** :
1. Efface le canvas
2. Définit la couleur
3. Pour chaque élément :
   - **Line** : Utilise `KivyLine(points=[x1,y1,x2,y2], width=...)`
   - **CubicBezier** : Utilise `KivyLine(bezier=[...8 valeurs...], width=...)`

**Important** : Les propriétés sont stockées sur le widget sous forme d'attributs dynamiques :
```python
# Pour une ligne index 5:
widget.line5_start_x = 100
widget.line5_start_y = 200
widget.line5_end_x = 300
widget.line5_end_y = 400
widget.line5_width = 2
```

Cela permet d'animer ces propriétés facilement !

---

### 🔲 4. Système de Remplissage (`mesh_handler.py`)

**Responsabilité** : Remplir les formes fermées avec de la couleur

```python
class MeshHandler:
    @staticmethod
    def render_mesh(widget, shapes, color, opacity_attr):
        """Remplit les formes avec des meshes triangulés"""
```

**Logique - Tessellation** :

1. **Crée un Tesselator** : Objet qui transforme polygones → triangles
2. **Ajoute les contours** : Chaque forme fermée = 1 contour
3. **Tesselle** : Algorithme `WINDING_ODD` avec sortie `TYPE_POLYGONS`
4. **Génère les meshes** : Liste de `(vertices, indices)`
5. **Rend les triangles** : `KivyMesh(mode="triangle_fan")`

**Pourquoi la tessellation ?**
- Les GPU ne peuvent rendre que des triangles
- Les formes SVG peuvent être concaves, avoir des trous
- La tessellation découpe n'importe quelle forme en triangles valides

---

### 🎬 5. Système d'Animation de Tracé (`drawing/manager.py`)

**Responsabilité** : Préparer les animations de dessin progressif

```python
def calculate_paths(widget, closed_shapes, svg_size, svg_file, 
                   animate=False, line_width=2, duration=0.02):
    """
    Configure les propriétés du widget et retourne les animations
    """
```

**Logique - Sans Animation** :

```python
# Pour une ligne:
widget.line0_start_x = lp[0]  # Point de départ
widget.line0_start_y = lp[1]
widget.line0_end_x = lp[2]    # Point d'arrivée
widget.line0_end_y = lp[3]
widget.line0_width = line_width  # Épaisseur finale
```

**Logique - Avec Animation** :

```python
# État initial: ligne réduite à un point
widget.line0_start_x = lp[0]
widget.line0_start_y = lp[1]
widget.line0_end_x = lp[0]    # ⚠️ Même que start !
widget.line0_end_y = lp[1]    # ⚠️ Même que start !
widget.line0_width = 1        # ⚠️ Largeur minimale

# Animation créée pour atteindre l'état final
Animation(d=0.02,
    line0_end_x = lp[2],      # Anime vers la vraie fin
    line0_end_y = lp[3],
    line0_width = line_width  # Anime vers l'épaisseur finale
)
```

**Résultat** : Les lignes "grandissent" de leur point de départ vers leur point d'arrivée !

De même pour les courbes de Bézier :
- État initial : Tous les points de contrôle au point de départ
- Animation : Points de contrôle et point final bougent vers leurs vraies positions

---

### 🎭 6. Système d'Animation de Formes (`animation/animation_shapes.py`)

**Responsabilité** : Animer l'apparition de formes individuelles avec effets directionnels

#### Configuration d'Animation

```python
config = [
    {
        "id_": "logo",           # ID du <path> dans le SVG
        "from_": "left",         # Direction: left/right/top/bottom/center_x/center_y/None
        "t": "out_bounce",       # Transition Kivy
        "d": 0.5                 # Durée en secondes
    }
]
```

#### Logique de `_calculate_base_point()`

```python
def _calculate_base_point(path_data, direction):
    """Trouve le point de départ de l'animation"""
```

**Pour chaque direction** :

| Direction | Coordonnée | Point de base | Effet visuel |
|-----------|-----------|---------------|--------------|
| `left` | X | `min(X)` | Apparaît depuis la gauche |
| `right` | X | `max(X)` | Apparaît depuis la droite |
| `top` | Y | `max(Y)` | Apparaît depuis le haut |
| `bottom` | Y | `min(Y)` | Apparaît depuis le bas |
| `center_x` | X | `median(X)` | Se déploie horizontalement |
| `center_y` | Y | `median(Y)` | Se déploie verticalement |
| `None` | - | - | Apparaît directement (fade) |

#### Logique de `_setup_line_animation()`

**Exemple avec `direction="left"` (horizontal)** :

```python
# 1. Trouve le bord gauche
base_point = min(all_x_coordinates)  # Ex: x=50

# 2. État initial: ligne "aplatie" sur le bord gauche
widget.shape_mesh_line0_start_x = base_point  # 50
widget.shape_mesh_line0_end_x = base_point    # 50
# Y reste normal
widget.shape_mesh_line0_start_y = start_y     # Position réelle
widget.shape_mesh_line0_end_y = end_y         # Position réelle

# 3. Animation: la ligne "grandit" horizontalement
Animation(
    shape_mesh_line0_start_x = real_start_x,  # 50 → 100
    shape_mesh_line0_end_x = real_end_x       # 50 → 300
)
```

**Exemple avec `direction="top"` (vertical)** :

```python
# 1. Trouve le bord supérieur
base_point = max(all_y_coordinates)  # Ex: y=400

# 2. État initial: ligne "aplatie" en haut
widget.shape_mesh_line0_start_y = base_point  # 400
widget.shape_mesh_line0_end_y = base_point    # 400
# X reste normal
widget.shape_mesh_line0_start_x = start_x
widget.shape_mesh_line0_end_x = end_x

# 3. Animation: la ligne "descend"
Animation(
    shape_mesh_line0_start_y = real_start_y,  # 400 → 350
    shape_mesh_line0_end_y = real_end_y       # 400 → 100
)
```

#### Mécanisme de Suivi de Progression

```python
def track_progress(self, *args):
    """Appelé à chaque frame pendant l'animation"""
    # 1. Récupère l'état actuel des propriétés animées
    shape_list = SvgRenderer.collect_shape_points(...)
    
    # 2. Efface le canvas
    self.widget.canvas.clear()
    
    # 3. Redessine les formes déjà complétées + forme actuelle
    shapes = [*self.prev_shapes, current_shape]
    self.fill_up_shapes_anim(shapes)
```

**Flux complet** :

```
Animation démarre (forme 0)
    ↓
    ├─ Frame 1: track_progress() → Dessine forme 0 à 10%
    ├─ Frame 2: track_progress() → Dessine forme 0 à 20%
    ├─ ...
    └─ Frame N: Animation complète
           ↓
       anim_on_comp() appelé
           ↓
       forme 0 ajoutée à prev_shapes
           ↓
       Animation démarre (forme 1)
           ↓
       ├─ track_progress() → Dessine formes [0, 1 à 10%]
       └─ ...
```

---

### 🎯 7. Système de Coordination (`animation/handler.py`)

**Responsabilité** : Organiser et combiner les animations

#### Combinaison d'Animations

```python
def create_animation_sequence(animations, sequential=True):
    """Combine plusieurs animations"""
    combined = animations[0]
    for anim in animations[1:]:
        if sequential:
            combined += anim  # Opérateur + → séquentiel
        else:
            combined &= anim  # Opérateur & → parallèle
    return combined
```

**Exemples** :

```python
# Séquentiel (l'une après l'autre)
anim = Animation(x=100, d=1) + Animation(y=200, d=1)
# Résultat: x bouge (1s), PUIS y bouge (1s) = 2s total

# Parallèle (en même temps)
anim = Animation(x=100, d=1) & Animation(y=200, d=1)
# Résultat: x ET y bougent ensemble = 1s total
```

#### Ajout du Remplissage

```python
def add_fill_animation(anim, widget, callback):
    """Ajoute un fade-in après le tracé"""
    widget.mesh_opacity = 0  # Invisible au départ
    fill_anim = Animation(d=0.4, mesh_opacity=1)  # Fade vers opaque
    return anim + fill_anim  # Après le tracé
```

---

## Fonctionnement Détaillé

### Scénario 1 : Dessin Simple Sans Animation

```python
kivg = Kivg(my_widget)
kivg.draw("logo.svg", fill=True, animate=False)
```

**Étapes** :

1. **Parse SVG** (`svg_parser.parse_svg`)
   ```python
   svg_size = [512, 512]
   paths = [
       ("M 100 100 L 200 200 Z", "path1", [1, 0, 0, 1])  # Rouge
   ]
   ```

2. **Traite les chemins** (`drawing_manager.process_path_data`)
   ```python
   closed_shapes = {
       "path1": {
           "path1paths": [[Line(100+100j, 200+200j)]],
           "path1shapes": [[100, 100, 200, 200]],  # Points pour mesh
           "color": [1, 0, 0, 1]
       }
   }
   ```

3. **Calcule les chemins** (`drawing_manager.calculate_paths`)
   ```python
   # Convertit coordonnées SVG → Kivy
   transformed_points = [wx+150, wy+150, wx+300, wy+300]
   
   # Configure le widget
   widget.line0_start_x = wx+150
   widget.line0_start_y = wy+150
   widget.line0_end_x = wx+300
   widget.line0_end_y = wy+300
   widget.line0_width = 2
   ```

4. **Rend** (`svg_renderer.update_canvas` + `mesh_handler.render_mesh`)
   ```python
   # Si fill=False:
   canvas.clear()
   Color(0, 0, 0, 1)
   Line(points=[wx+150, wy+150, wx+300, wy+300], width=2)
   
   # Si fill=True:
   canvas.clear()
   Color(1, 0, 0, 1)  # Rouge
   Mesh(vertices=tessellated_vertices, indices=tessellated_indices)
   ```

---

### Scénario 2 : Dessin Animé Séquentiel

```python
kivg.draw("logo.svg", animate=True, anim_type="seq", fill=True)
```

**Étapes supplémentaires** :

1. **Calcul avec animation** (`drawing_manager.calculate_paths`)
   ```python
   # État initial (ligne réduite)
   widget.line0_start_x = wx+150
   widget.line0_start_y = wy+150
   widget.line0_end_x = wx+150      # ⚠️ Réduit !
   widget.line0_end_y = wy+150      # ⚠️ Réduit !
   widget.line0_width = 1
   
   # Animation créée
   anim_list = [
       Animation(d=0.02, 
                line0_end_x=wx+300,
                line0_end_y=wy+300,
                line0_width=2)
   ]
   ```

2. **Combine les animations** (`animation_handler.create_animation_sequence`)
   ```python
   # Pour 3 lignes séquentielles:
   combined = anim_list[0] + anim_list[1] + anim_list[2]
   ```

3. **Ajoute le remplissage** (`animation_handler.add_fill_animation`)
   ```python
   widget.mesh_opacity = 0
   combined = combined + Animation(d=0.4, mesh_opacity=1)
   ```

4. **Démarre** (`animation_handler.prepare_and_start_animation`)
   ```python
   combined.bind(on_progress=kivg.update_canvas)
   combined.bind(on_complete=kivg.fill_up_shapes)
   combined.start(widget)
   ```

5. **Chaque frame** :
   ```python
   # on_progress appelé
   → update_canvas()
   → widget.canvas.clear()
   → Redessine avec valeurs actuelles de line0_end_x, etc.
   ```

6. **À la fin** :
   ```python
   # on_complete appelé
   → fill_up_shapes()
   → mesh_handler.render_mesh() avec opacity=1
   ```

---

### Scénario 3 : Animation de Formes

```python
config = [
    {"id_": "circle", "from_": "center_x", "t": "out_bounce", "d": 0.5},
    {"id_": "square", "from_": "left", "t": "out_elastic", "d": 0.3}
]
kivg.shape_animate("shapes.svg", anim_config_list=config)
```

**Étapes** :

1. **Dessin initial** (sans animation)
   ```python
   kivg.draw("shapes.svg", from_shape_anim=True)
   widget.mesh_opacity = 1  # Opaque pour le mesh
   ```

2. **Préparation des animations** (`animation_handler.prepare_shape_animations`)
   
   Pour chaque config :
   
   a. **Extrait les données** (`_extract_path_data`)
   ```python
   # Pour "circle":
   path_data = [
       [  # Sous-chemin 1
           [(100, 100), (200, 100)],  # Line
           [(200, 100), (250, 120), (280, 150), (300, 200)]  # Bezier
       ]
   ]
   ```
   
   b. **Calcule le point de base** (`_calculate_base_point`)
   ```python
   # direction = "center_x"
   all_x = [100, 200, 250, 280, 300]
   base_point = median([100, 200, 250, 280, 300]) = 250
   ```
   
   c. **Configure l'animation** (`_setup_line_animation`, `_setup_bezier_animation`)
   ```python
   # Pour la ligne:
   widget.circle_mesh_line0_start_x = 250  # Base
   widget.circle_mesh_line0_end_x = 250    # Base
   widget.circle_mesh_line0_start_y = 100  # Réel
   widget.circle_mesh_line0_end_y = 100    # Réel
   
   # Animation:
   Animation(d=0.5, t="out_bounce",
            circle_mesh_line0_start_x = 100,  # 250 → 100
            circle_mesh_line0_end_x = 200)    # 250 → 200
   ```

3. **Séquence d'animations** :
   ```python
   all_anim = [
       ("circle", circle_animation),
       ("square", square_animation)
   ]
   ```

4. **Démarre la première** :
   ```python
   id_, anim = all_anim[0]  # "circle"
   anim.bind(on_progress=kivg.track_progress)
   anim.bind(on_complete=kivg.anim_on_comp)
   anim.start(widget)
   ```

5. **À chaque frame** (`track_progress`) :
   ```python
   # Collecte les points actuels
   shape_list = SvgRenderer.collect_shape_points(circle_tmp, widget, "circle")
   
   # Redessine
   widget.canvas.clear()
   curr_shape = (circle_color, shape_list)
   shapes = [*prev_shapes, curr_shape]  # [curr_shape] au début
   fill_up_shapes_anim(shapes)
   ```

6. **Quand "circle" termine** (`anim_on_comp`) :
   ```python
   # Sauvegarde la forme complétée
   prev_shapes.append(curr_shape)  # ["circle"]
   
   # Passe à "square"
   curr_count += 1  # 0 → 1
   id_, anim = all_anim[1]  # "square"
   anim.bind(on_progress=kivg.track_progress)
   anim.bind(on_complete=kivg.anim_on_comp)
   anim.start(widget)
   ```

7. **Maintenant `track_progress` dessine** :
   ```python
   shapes = [*prev_shapes, curr_shape]
   # = [circle_complet, square_en_cours]
   ```

8. **Quand tout est fini** :
   ```python
   curr_count == len(all_anim)
   # Termine, toutes les formes sont dans prev_shapes
   ```

---

## Exemples d'Utilisation

### 1. Logo Simple Statique

```python
from kivy.uix.widget import Widget
from kivg import Kivg

class MyWidget(Widget):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.size = (512, 512)
        
        kivg = Kivg(self)
        kivg.draw("logo.svg", fill=True, animate=False)
```

**Résultat** : Logo dessiné instantanément, rempli de couleur.

---

### 2. Animation de Tracé Progressif

```python
kivg = Kivg(my_widget)
kivg.draw("signature.svg", 
          animate=True,
          anim_type="seq",      # Séquentiel
          fill=False,           # Juste le contour
          line_width=3,
          line_color=[0, 0, 1, 1],  # Bleu
          dur=0.05)             # 50ms par segment
```

**Résultat** : Signature "écrite" progressivement en bleu.

---

### 3. Animation de Formes avec Effets

```python
config = [
    # Titre apparaît du haut avec effet rebond
    {"id_": "title", "from_": "top", "t": "out_bounce", "d": 0.6},
    
    # Sous-titre apparaît directement (fade)
    {"id_": "subtitle", "from_": None, "d": 0.3},
    
    # Icône se déploie depuis le centre
    {"id_": "icon", "from_": "center_x", "t": "out_elastic", "d": 0.8},
    
    # Bordure apparaît de gauche à droite
    {"id_": "border", "from_": "left", "t": "out_cubic", "d": 0.5}
]

kivg.shape_animate("header.svg", anim_config_list=config)
```

**Résultat** :
1. Titre tombe d'en haut et rebondit (0.6s)
2. Sous-titre apparaît en fondu (0.3s)
3. Icône se déploie horizontalement avec élasticité (0.8s)
4. Bordure balaie de gauche à droite (0.5s)

---

### 4. Animation en Boucle

```python
def animate_logo():
    config = [{"id_": "logo", "from_": "center_y", "t": "out_back", "d": 1.0}]
    kivg.shape_animate("logo.svg", 
                      anim_config_list=config,
                      on_complete=lambda *args: Clock.schedule_once(
                          lambda dt: animate_logo(), 2.0))  # Répète après 2s

animate_logo()
```

**Résultat** : Logo apparaît, attend 2s, disparaît (implicite), réapparaît, etc.

---

### 5. Interface Complète (depuis demo/main.py)

```python
class KivgDemo(App):
    def build(self):
        # Zone principale pour animations
        self.kivg = Kivg(self.root.ids.svg_area)
        
        # Boutons avec icônes SVG statiques
        for button in self.root.ids.button_area.children:
            button_kivg = Kivg(button)
            button_kivg.draw(button.svg_icon, fill=True)
        
        return self.root
    
    def on_button_click(self, svg_file):
        # Anime l'icône dans la zone principale
        if "simple" in svg_file:
            # Animation de tracé
            self.kivg.draw(svg_file, animate=True, fill=True, line_width=1)
        else:
            # Animation de formes
            self.kivg.shape_animate(svg_file, anim_config_list=config)
```

---

## Concepts Clés à Retenir

### 1. **Propriétés Dynamiques sur Widget**

Le système stocke toutes les valeurs animables comme attributs du widget :

```python
widget.line5_start_x = 100
widget.bezier3_control1_y = 250
widget.mesh_opacity = 0.5
```

✅ **Avantage** : Le moteur d'animation Kivy peut les animer directement

### 2. **Deux Types d'Animations Distincts**

| Type | Méthode | Effet | Usage |
|------|---------|-------|-------|
| **Tracé** | `draw(animate=True)` | Dessine progressivement tous les chemins | Logo "écrit", signature |
| **Formes** | `shape_animate()` | Fait apparaître chaque forme avec effets | Intro, transitions |

### 3. **Transformation de Coordonnées**

```python
# SVG (0,0 en haut-gauche, Y vers le bas)
svg_point = (100, 200)

# Kivy (0,0 en bas-gauche, Y vers le haut)
kivy_point = transform_point(svg_point, ...)
# Résultat: X décalé + mis à l'échelle, Y inversé
```

### 4. **Mesh vs Line**

- **Line** : Dessine le contour (stroke)
- **Mesh** : Remplit l'intérieur (fill)

Les deux sont nécessaires pour un rendu complet !

### 5. **Séquentiel vs Parallèle**

```python
# Séquentiel (+ operator)
anim1 + anim2 + anim3  # 1 puis 2 puis 3

# Parallèle (& operator)
anim1 & anim2 & anim3  # Tous en même temps
```

### 6. **Le Callback `on_progress`**

Appelé à chaque frame pendant l'animation :

```python
Animation(...).bind(on_progress=update_canvas)
# update_canvas() appelé ~60 fois par seconde
```

C'est ce qui permet le rendu progressif !

---

## Diagramme de Flux Complet

```
┌─────────────┐
│ Fichier SVG │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ svg_parser.parse()  │ ──→ Extrait: viewBox, paths, ids, colors
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────────┐
│ drawing_manager.process()    │ ──→ Parse chemins: Line, CubicBezier, Close
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ path_utils.transform_*()     │ ──→ SVG coords → Kivy coords
└──────┬───────────────────────┘
       │
       ├─────────────────────┬────────────────────┐
       │                     │                    │
       ▼                     ▼                    ▼
┌─────────────┐    ┌──────────────────┐   ┌────────────────────┐
│ draw()      │    │ draw(animate)    │   │ shape_animate()    │
│ statique    │    │ tracé progressif │   │ formes par formes  │
└──────┬──────┘    └────────┬─────────┘   └────────┬───────────┘
       │                    │                       │
       │                    │                       │
       ▼                    ▼                       ▼
┌──────────────┐    ┌──────────────────┐   ┌────────────────────┐
│ update_canvas│    │ Animation        │   │ Animations         │
│              │    │ + on_progress    │   │ séquentielles      │
│              │    │   → update_canvas│   │ + track_progress   │
└──────┬───────┘    └────────┬─────────┘   └────────┬───────────┘
       │                     │                       │
       │                     └───────────┬───────────┘
       │                                 │
       ▼                                 ▼
┌────────────────────────────────────────────────┐
│           svg_renderer.update_canvas()         │
│  ┌──────────┐           ┌──────────────────┐  │
│  │ Color()  │           │ Line() / Bezier()│  │
│  └──────────┘           └──────────────────┘  │
└────────────────────────────────────────────────┘
       │
       ▼ (si fill=True)
┌────────────────────────────────────────────────┐
│         mesh_handler.render_mesh()             │
│  ┌────────────┐       ┌──────────────────┐    │
│  │ Tesselator │  ───→ │ Mesh(triangles)  │    │
│  └────────────┘       └──────────────────┘    │
└────────────────────────────────────────────────┘
```

---

## Points Techniques Avancés

### 1. Pourquoi les Polynômes de Bernstein ?

Les courbes de Bézier cubiques sont définies mathématiquement par :

```
B(t) = (1-t)³P₀ + 3t(1-t)²P₁ + 3t²(1-t)P₂ + t³P₃
```

où `t ∈ [0, 1]` et `P₀, P₁, P₂, P₃` sont les 4 points de contrôle.

**Usage dans kivg** : Générer des points discrets pour le remplissage mesh.

### 2. Algorithme WINDING_ODD

Utilisé pour la tessellation, détermine si un point est à l'intérieur d'une forme :
- Lance un rayon depuis le point
- Compte les intersections avec les bords
- **Impair** → Intérieur
- **Pair** → Extérieur

✅ Fonctionne même avec formes concaves et trous !

### 3. Triangle Fan vs Triangle Strip

`mode="triangle_fan"` dans `KivyMesh` :
- Tous les triangles partagent un sommet central
- Efficace pour polygones convexes
- GPU-friendly (moins de vertices dupliqués)

### 4. Gestion de la Mémoire

```python
# Nettoyage après parsing
doc.unlink()  # Libère la mémoire XML

# Canvas clearing
widget.canvas.clear()  # Supprime instructions graphiques précédentes
```

### 5. Cache SVG

```python
if svg_file != self._previous_svg_file:
    # Parse seulement si fichier différent
    self.svg_size, self.closed_shapes, self.path = process_path_data(svg_file)
```

Évite de re-parser le même fichier plusieurs fois !

---

## Conclusion

**Kivg** est un système modulaire et élégant qui :

1. ✅ Parse les fichiers SVG en structures de données
2. ✅ Transforme les coordonnées SVG en coordonnées Kivy
3. ✅ Stocke les propriétés comme attributs dynamiques du widget
4. ✅ Anime ces propriétés avec le moteur Kivy
5. ✅ Rend progressivement sur le canvas
6. ✅ Remplit les formes avec des meshes triangulés

**Forces** :
- Architecture claire et séparation des responsabilités
- Support complet des animations Kivy
- Flexibilité (tracé, formes, transitions)
- Performance (cache, GPU meshes)

**Limitations** :
- Supporte uniquement Line et CubicBezier (pas Arc, QuadraticBezier)
- Couleurs fill uniquement en hex dans `<path>`
- Pas de support des gradients

---

**Auteur** : Documentation générée par analyse complète du code  
**Date** : 27 novembre 2025  
**Version** : Basée sur kivg latest
