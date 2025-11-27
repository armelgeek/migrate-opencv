# 🖐️ Activer la Main qui Écrit

## Vue d'ensemble

La fonctionnalité `hand_draw` ajoute une main animée qui suit le tracé pendant l'animation SVG, créant un effet de "main qui dessine" comme dans les vidéos de tableau blanc.

## Utilisation Basique

### Activation Simple

```python
from kivg import Kivg

kivg = Kivg(512, 512)

# Activer la main avec hand_draw=True
frames = kivg.draw(
    'mon_fichier.svg',
    animate=True,      # Animation requise
    hand_draw=True,    # ✅ Active la main qui écrit
    fps=30
)

# Sauvegarder l'animation
kivg.save_gif('output.gif', fps=30)
```

## Paramètres de Personnalisation

### Tous les Paramètres Disponibles

```python
frames = kivg.draw(
    'fichier.svg',
    animate=True,
    hand_draw=True,
    
    # Personnalisation de la main:
    hand_image='path/to/hand.png',  # Image personnalisée (optionnel)
    hand_scale=0.15,                # Échelle de la main (0.1-0.3)
    hand_offset=(-50, -120)         # Décalage (x, y) par rapport au trait
)
```

### Description des Paramètres

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `hand_draw` | bool | `False` | Active/désactive la main |
| `hand_image` | str | `None` | Chemin vers image PNG personnalisée |
| `hand_scale` | float | `0.15` | Taille de la main (0.1 = petit, 0.3 = grand) |
| `hand_offset` | tuple | `(-50, -120)` | Position (x, y) relative au trait |

## Exemples

### Exemple 1: Animation Simple avec Main

```python
from kivg import Kivg

kivg = Kivg(600, 600, background=(255, 255, 255, 255))

# Logo avec main qui dessine
frames = kivg.draw(
    'demo/icons/python2.svg',
    animate=True,
    fill=True,
    hand_draw=True,  # Main activée
    fps=30,
    dur=0.02
)

kivg.save_gif('python_avec_main.gif', fps=30)
```

### Exemple 2: Main Personnalisée

```python
# Main plus grande et repositionnée
frames = kivg.draw(
    'demo/icons/discord.svg',
    animate=True,
    hand_draw=True,
    hand_scale=0.25,        # Main 25% plus grande
    hand_offset=(-70, -150), # Décalée vers le haut
    fps=30
)
```

### Exemple 3: Image de Main Personnalisée

```python
# Utiliser votre propre image de main
frames = kivg.draw(
    'dessin.svg',
    animate=True,
    hand_draw=True,
    hand_image='images/ma_main.png',  # Votre image
    hand_scale=0.2,
    fps=30
)
```

## Comportement

### Quand la Main Apparaît

- ✅ **Pendant l'animation des strokes** : La main suit le tracé
- ❌ **Pendant le remplissage** : La main disparaît automatiquement
- ❌ **Après l'animation** : La main n'apparaît plus

### Position de la Main

La main est positionnée en fonction de:
1. **Point de dessin actuel** : Bout du trait en cours
2. **Offset** : Décalage `(x, y)` appliqué
   - `x < 0` : Main à gauche du trait
   - `y < 0` : Main au-dessus du trait

## Ajustements Recommandés

### Pour Différents Types de Tracés

```python
# Tracés larges et rapides
hand_scale=0.2
hand_offset=(-60, -140)

# Tracés fins et détaillés
hand_scale=0.12
hand_offset=(-40, -100)

# Texte ou écriture
hand_scale=0.15
hand_offset=(-50, -120)  # Défaut, bon pour l'écriture
```

## Format de l'Image de Main

Si vous utilisez une image personnalisée (`hand_image`):

### Requis
- **Format** : PNG avec transparence
- **Orientation** : Main pointant vers le bas-droite
- **Taille** : 200-400px (sera redimensionnée selon `hand_scale`)

### Exemple de Structure
```
┌─────────────┐
│             │
│    ╭──╮     │  ← Doigts pointant
│    │  │     │     vers bas-droite
│    ╰──╯     │
│     / \     │  ← Poignet
└─────────────┘
```

## Dépannage

### La main n'apparaît pas

1. **Vérifiez** : `animate=True` est requis
2. **Vérifiez** : `hand_draw=True` est défini
3. **Vérifiez** : L'animation a des strokes à dessiner

### La main est mal positionnée

Ajustez `hand_offset`:
```python
# Main trop à droite → diminuer x
hand_offset=(-80, -120)  # Plus à gauche

# Main trop basse → diminuer y
hand_offset=(-50, -150)  # Plus haut
```

### La main est trop grande/petite

Ajustez `hand_scale`:
```python
hand_scale=0.1   # Petite
hand_scale=0.15  # Moyenne (défaut)
hand_scale=0.25  # Grande
```

## Script de Test Complet

```python
#!/usr/bin/env python3
from kivg import Kivg

# Créer le renderer
kivg = Kivg(512, 512, background=(255, 255, 255, 255))

# Test 1: Main par défaut
print("Test 1: Main avec paramètres par défaut...")
frames = kivg.draw(
    'demo/icons/python2.svg',
    animate=True,
    fill=True,
    hand_draw=True,
    fps=30
)
kivg.save_gif('test_main_defaut.gif', fps=30)
print("✓ Sauvegardé: test_main_defaut.gif")

# Test 2: Main personnalisée
print("Test 2: Main personnalisée...")
kivg.clear()
frames = kivg.draw(
    'demo/icons/discord.svg',
    animate=True,
    fill=True,
    hand_draw=True,
    hand_scale=0.2,
    hand_offset=(-65, -135),
    fps=30
)
kivg.save_gif('test_main_custom.gif', fps=30)
print("✓ Sauvegardé: test_main_custom.gif")

print("\n✅ Tests terminés!")
```

## Résumé

**Pour activer la main qui écrit** :
```python
kivg.draw('fichier.svg', animate=True, hand_draw=True)
```

**Pour personnaliser** :
```python
kivg.draw(
    'fichier.svg',
    animate=True,
    hand_draw=True,
    hand_scale=0.18,
    hand_offset=(-55, -125)
)
```
