# Problème de Rendu : Strokes et Fills

## 🔴 Problème Initial

Les SVG rendus avec `fill=True` affichaient **uniquement les remplissages** mais **pas les contours** (strokes). De plus, certains paths avec des couleurs invalides ou transparentes n'apparaissaient pas du tout.

### Exemple Visuel

**SVG Facebook** :

```
Attendu:  ⭕ (cercle bleu) + f (lettre noire)
Obtenu:   ⭕ (cercle bleu seulement)
         ❌ Le "f" manque!
```

---

## 🔍 Analyse du Problème

### 1. Strokes Non Rendus

**Code problématique** dans `main.py` ligne ~179 :

```python
if fill:
    self.fill_up_shapes()  # ✗ Dessine SEULEMENT les fills
else:
    self.update_canvas()   # ✓ Dessine SEULEMENT les strokes
```

**Problème** : Quand `fill=True`, le code ne dessinait QUE les remplissages, jamais les contours.

---

### 2. Fills Transparents Ignorés

**Code problématique** dans `main.py` ligne ~98 :

```python
if len(color) >= 4 and color[3] == 0:
    continue  # ✗ Ignore complètement les paths transparents
```

**Problème** : Les paths avec `fill="none"` ou couleurs invalides (comme `#fffff` dans facebook2.svg) étaient complètement ignorés.

---

### 3. Conversion BGRA Inutile

**Code problématique** dans `canvas.py` :

```python
rgba = normalize_color(color)
bgra_color = rgba_to_bgra(rgba)  # ✗ Conversion inutile
cv2.line(self.image, start, end, bgra_color, ...)
```

**Problème** : Le canvas utilise déjà RGBA, la conversion vers BGRA était inutile et source d'erreurs.

---

## ✅ Solutions Appliquées

### Solution 1 : Combiner Fills et Strokes

**Nouveau code** dans `main.py` :

```python
if fill:
    # ✓ Dessine les deux couches
    self.fill_up_shapes()  # 1. Fills en dessous
    self.update_canvas()    # 2. Strokes par-dessus
else:
    self.update_canvas()    # Strokes uniquement
```

**Résultat** : Les contours apparaissent maintenant par-dessus les remplissages.

---

### Solution 2 : Remplir les Paths Transparents avec line_color

**Nouveau code** dans `main.py` :

```python
if len(color) >= 4 and color[3] == 0:
    # ✓ Utilise line_color au lieu d'ignorer
    fill_color = list(self._line_color)
    # Conversion 0-255 → 0-1 si nécessaire
    if not all(c <= 1.0 for c in fill_color[:3]):
        fill_color = [c / 255.0 for c in fill_color]
    self.fill_up(closed_paths[id_ + "shapes"], fill_color)
else:
    self.fill_up(closed_paths[id_ + "shapes"], color)
```

**Résultat** : Les paths avec `fill="none"` ou couleurs invalides sont remplis avec `line_color`.

---

### Solution 3 : Retirer la Conversion BGRA

**Nouveau code** dans `canvas.py` :

```python
rgba = normalize_color(color)
# ✓ Pas de conversion, utilise RGBA directement
cv2.line(self.image, start, end, rgba, ...)
```

**Résultat** : Couleurs correctes sans conversion inutile.

---

## 📊 Impact

### Avant

```python
kivg.draw('facebook2.svg', fill=True)
```

- ✗ Cercle bleu seulement
- ✗ Pas de "f" visible
- ✗ Pas de contours

### Après

```python
kivg.draw('facebook2.svg', fill=True, line_color=(0, 0, 0, 255))
```

- ✓ Cercle bleu (fill)
- ✓ "f" noir (fill avec line_color)
- ✓ Contours visibles (strokes)

---

## 🎨 Contrôle de la Couleur

Vous pouvez maintenant contrôler la couleur des paths transparents :

```python
# Fill noir pour les paths transparents
kivg.draw('svg_file.svg', fill=True, line_color=(0, 0, 0, 255))

# Fill blanc pour les paths transparents
kivg.draw('svg_file.svg', fill=True, line_color=(255, 255, 255, 255))

# Fill personnalisé
kivg.draw('svg_file.svg', fill=True, line_color=(255, 100, 50, 255))
```

---

## 📝 Cas Particulier : facebook2.svg

Ce SVG contient une **erreur** :

```xml
<path fill="#fffff" ... />
<!-- Devrait être #ffffff (6 caractères), mais c'est #fffff (5 caractères) -->
```

**Avant** : Le parser retournait `fill=[1, 1, 1, 0]` (transparent) → path ignoré
**Après** : Le path est rempli avec `line_color` → visible dans l'output

---

## 🎯 Ordre de Rendu

L'ordre de rendu est critique :

1. **Fills** → Couche du fond (remplissages des shapes)
2. **Strokes** → Couche du dessus (contours par-dessus)

Cela garantit que les contours sont toujours visibles, comme dans un éditeur SVG standard (Inkscape, Adobe Illustrator, etc).
