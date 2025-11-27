#!/usr/bin/env python3
"""
Exemple: Activer la main qui écrit pendant l'animation SVG
"""
from kivg import Kivg

# Créer le renderer
kivg = Kivg(width=512, height=512, background=(255, 255, 255, 255))

# ✋ ACTIVER LA MAIN QUI ÉCRIT
# Il suffit d'ajouter le paramètre hand_draw=True
frames = kivg.draw(
    'icons/python2.svg',
    animate=True,              # Animation activée
    fill=True,                 # Avec remplissage
    hand_draw=True,            # ✅ MAIN QUI ÉCRIT ACTIVÉE
    fps=30,
    dur=0.02
)

# Sauvegarder l'animation en MP4
kivg.save_animation('output/animation_avec_main.mp4', fps=30)
print('✓ Animation avec main sauvegardée: output/animation_avec_main.mp4')

# 🎨 PERSONNALISER LA MAIN
# Vous pouvez personnaliser l'apparence de la main:
kivg.clear()
frames = kivg.draw(
    'icons/discord.svg',
    animate=True,
    fill=True,
    hand_draw=True,            # Main activée
    hand_scale=0.35,           # Taille de la main (défaut: 0.30)
    hand_offset=(-118, 10),    # Position ajustée pour aligner la pointe du stylo
    # hand_image='path/to/custom_hand.png',  # Image personnalisée (optionnel)
    fps=30
)

kivg.save_animation('output/discord_avec_main.mp4', fps=30)
print('✓ Animation Discord avec main personnalisée sauvegardée')
