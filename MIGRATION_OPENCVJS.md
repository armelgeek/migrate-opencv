# Migration vers OpenCV.js

## 🎯 Objectif

Migrer la bibliothèque **Kivg** (actuellement basée sur opencv-python) vers **OpenCV.js** pour permettre :

- ✅ Rendu SVG directement dans le navigateur
- ✅ Animations en temps réel côté client
- ✅ Export en images (PNG, JPG) via Canvas API
- ✅ Export en vidéos (WebM) via MediaRecorder API
- ✅ Export en GIF animé via bibliothèques JavaScript
- ✅ Zéro dépendance serveur (rendu 100% client)
- ✅ Intégration facile dans applications web React, Vue, Angular

---

## 📊 Comparaison opencv-python vs OpenCV.js

| Fonctionnalité | opencv-python (actuel) | OpenCV.js (proposé) |
|----------------|------------------------|---------------------|
| **Environnement** | Python/Serveur | JavaScript/Navigateur |
| **Installation** | `pip install opencv-python` | `<script>` ou npm |
| **Rendu** | numpy arrays | cv.Mat + Canvas API |
| **Export Image** | `cv2.imwrite()` | `canvas.toDataURL()` |
| **Export Vidéo** | `cv2.VideoWriter` | MediaRecorder API |
| **Export GIF** | imageio | gif.js / gifshot |
| **Taille** | ~30-88 MB | ~7-20 MB (WASM) |
| **Performance** | Native/C++ | WASM (proche natif) |
| **Dépendances** | numpy | Aucune |

---

## 🗺️ Mapping des APIs

### 1. Canvas / Image

#### Python (actuel)
```python
import cv2
import numpy as np

# Créer canvas
canvas = np.full((height, width, 4), background, dtype=np.uint8)

# Effacer canvas
canvas = np.full((height, width, 4), background, dtype=np.uint8)

# Obtenir image
image = canvas.copy()
```

#### JavaScript (proposé)
```javascript
// Créer canvas
let canvas = new cv.Mat(height, width, cv.CV_8UC4);
canvas.setTo(new cv.Scalar(...background));

// Effacer canvas
canvas.setTo(new cv.Scalar(...background));

// Obtenir image pour Canvas API
cv.imshow('canvasElement', canvas);

// Conversion vers ImageData pour manipulation
const imageData = new ImageData(
    new Uint8ClampedArray(canvas.data),
    canvas.cols,
    canvas.rows
);
```

---

### 2. Dessin de Lignes

#### Python (actuel)
```python
cv2.line(canvas, (x1, y1), (x2, y2), 
         color=(b, g, r, a), thickness=2, lineType=cv2.LINE_AA)
```

#### JavaScript (proposé)
```javascript
cv.line(canvas, new cv.Point(x1, y1), new cv.Point(x2, y2),
        new cv.Scalar(b, g, r, a), 2, cv.LINE_AA, 0);
```

---

### 3. Dessin de Polylignes

#### Python (actuel)
```python
points = np.array(points, dtype=np.int32)
cv2.polylines(canvas, [points], isClosed=False, 
              color=(b, g, r, a), thickness=2, lineType=cv2.LINE_AA)
```

#### JavaScript (proposé)
```javascript
// Créer MatVector pour les points
const pts = new cv.MatVector();
const pointsMat = cv.matFromArray(points.length, 1, cv.CV_32SC2, points.flat());
pts.push_back(pointsMat);

cv.polylines(canvas, pts, false, new cv.Scalar(b, g, r, a), 2, cv.LINE_AA, 0);

// Libérer mémoire
pts.delete();
pointsMat.delete();
```

---

### 4. Remplissage de Polygones

#### Python (actuel)
```python
points_array = np.array(points, dtype=np.int32)
cv2.fillPoly(canvas, [points_array], color=(b, g, r, a))
```

#### JavaScript (proposé)
```javascript
const pts = new cv.MatVector();
const pointsMat = cv.matFromArray(points.length, 1, cv.CV_32SC2, points.flat());
pts.push_back(pointsMat);

cv.fillPoly(canvas, pts, new cv.Scalar(b, g, r, a), cv.LINE_8, 0);

pts.delete();
pointsMat.delete();
```

---

### 5. Mélange Alpha

#### Python (actuel)
```python
overlay = canvas.copy()
cv2.line(overlay, start, end, color, thickness, cv2.LINE_AA)
alpha = color[3] / 255.0
cv2.addWeighted(overlay, alpha, canvas, 1 - alpha, 0, canvas)
```

#### JavaScript (proposé)
```javascript
const overlay = canvas.clone();
cv.line(overlay, new cv.Point(...start), new cv.Point(...end), 
        color, thickness, cv.LINE_AA, 0);
const alpha = color[3] / 255.0;
cv.addWeighted(overlay, alpha, canvas, 1 - alpha, 0, canvas);
overlay.delete();
```

---

### 6. Courbes de Bézier

La génération de courbes de Bézier reste identique (algorithme mathématique), seul le rendu change :

#### JavaScript (proposé)
```javascript
function calculateBezierPoints(start, ctrl1, ctrl2, end, segments = 150) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        // Polynômes de Bernstein
        const b0 = Math.pow(1 - t, 3);
        const b1 = 3 * t * Math.pow(1 - t, 2);
        const b2 = 3 * Math.pow(t, 2) * (1 - t);
        const b3 = Math.pow(t, 3);
        
        const x = b0 * start[0] + b1 * ctrl1[0] + b2 * ctrl2[0] + b3 * end[0];
        const y = b0 * start[1] + b1 * ctrl1[1] + b2 * ctrl2[1] + b3 * end[1];
        
        points.push([Math.round(x), Math.round(y)]);
    }
    return points;
}
```

---

## 🏗️ Architecture Proposée

### Structure JavaScript/TypeScript

```
kivg-js/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                # Point d'entrée
│   ├── types.ts                # Types TypeScript
│   ├── core/
│   │   ├── OpenCVCanvas.ts     # Classe Canvas wrapper
│   │   ├── Animation.ts        # Moteur d'animation
│   │   └── Easing.ts           # Fonctions de transition
│   │
│   ├── rendering/
│   │   ├── PathRenderer.ts     # Rendu des paths SVG
│   │   ├── ShapeRenderer.ts    # Remplissage des formes
│   │   ├── TextRenderer.ts     # Rendu du texte
│   │   └── HandOverlay.ts      # Overlay main pour animation
│   │
│   ├── parsing/
│   │   ├── SVGParser.ts        # Parsing SVG (DOMParser natif)
│   │   └── PathParser.ts       # Parsing commandes SVG path
│   │
│   ├── export/
│   │   ├── ImageExporter.ts    # Export PNG/JPG
│   │   ├── VideoExporter.ts    # Export WebM (MediaRecorder)
│   │   └── GIFExporter.ts      # Export GIF (gif.js)
│   │
│   └── Kivg.ts                 # Classe principale
│
├── dist/                       # Build output
├── demo/                       # Exemples
└── tests/                      # Tests unitaires
```

---

## 💻 Classe OpenCVCanvas (JavaScript)

```typescript
/**
 * Canvas OpenCV.js pour remplacer le canvas numpy/OpenCV Python
 */
class OpenCVCanvas {
    private mat: cv.Mat;
    private width: number;
    private height: number;
    private background: [number, number, number, number];
    
    constructor(width: number, height: number, 
                background: [number, number, number, number] = [255, 255, 255, 255]) {
        this.width = width;
        this.height = height;
        this.background = background;
        
        // Créer le Mat RGBA
        this.mat = new cv.Mat(height, width, cv.CV_8UC4);
        this.clear();
    }
    
    clear(): void {
        this.mat.setTo(new cv.Scalar(...this.background));
    }
    
    drawLine(start: [number, number], end: [number, number], 
             color: [number, number, number, number], 
             thickness: number = 1): void {
        if (color[3] < 255) {
            // Alpha blending
            const overlay = this.mat.clone();
            cv.line(overlay, 
                    new cv.Point(start[0], start[1]),
                    new cv.Point(end[0], end[1]),
                    new cv.Scalar(color[0], color[1], color[2], 255),
                    thickness, cv.LINE_AA, 0);
            
            const alpha = color[3] / 255.0;
            cv.addWeighted(overlay, alpha, this.mat, 1 - alpha, 0, this.mat);
            overlay.delete();
        } else {
            cv.line(this.mat,
                    new cv.Point(start[0], start[1]),
                    new cv.Point(end[0], end[1]),
                    new cv.Scalar(...color),
                    thickness, cv.LINE_AA, 0);
        }
    }
    
    drawBezier(start: [number, number], ctrl1: [number, number],
               ctrl2: [number, number], end: [number, number],
               color: [number, number, number, number],
               thickness: number = 1, segments: number = 150): void {
        const points = this.calculateBezierPoints(start, ctrl1, ctrl2, end, segments);
        this.drawPolylines(points, color, thickness, false);
    }
    
    drawPolylines(points: number[][], color: [number, number, number, number],
                  thickness: number = 1, closed: boolean = false): void {
        const flatPoints = points.flat();
        const pointsMat = cv.matFromArray(points.length, 1, cv.CV_32SC2, flatPoints);
        const pts = new cv.MatVector();
        pts.push_back(pointsMat);
        
        if (color[3] < 255) {
            const overlay = this.mat.clone();
            cv.polylines(overlay, pts, closed,
                        new cv.Scalar(color[0], color[1], color[2], 255),
                        thickness, cv.LINE_AA, 0);
            const alpha = color[3] / 255.0;
            cv.addWeighted(overlay, alpha, this.mat, 1 - alpha, 0, this.mat);
            overlay.delete();
        } else {
            cv.polylines(this.mat, pts, closed,
                        new cv.Scalar(...color),
                        thickness, cv.LINE_AA, 0);
        }
        
        pts.delete();
        pointsMat.delete();
    }
    
    fillPolygon(points: number[][], color: [number, number, number, number]): void {
        const flatPoints = points.flat();
        const pointsMat = cv.matFromArray(points.length, 1, cv.CV_32SC2, flatPoints);
        const pts = new cv.MatVector();
        pts.push_back(pointsMat);
        
        if (color[3] < 255) {
            const overlay = this.mat.clone();
            cv.fillPoly(overlay, pts, new cv.Scalar(color[0], color[1], color[2], 255));
            const alpha = color[3] / 255.0;
            cv.addWeighted(overlay, alpha, this.mat, 1 - alpha, 0, this.mat);
            overlay.delete();
        } else {
            cv.fillPoly(this.mat, pts, new cv.Scalar(...color));
        }
        
        pts.delete();
        pointsMat.delete();
    }
    
    private calculateBezierPoints(start: [number, number], ctrl1: [number, number],
                                  ctrl2: [number, number], end: [number, number],
                                  segments: number): number[][] {
        const points: number[][] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const b0 = Math.pow(1 - t, 3);
            const b1 = 3 * t * Math.pow(1 - t, 2);
            const b2 = 3 * Math.pow(t, 2) * (1 - t);
            const b3 = Math.pow(t, 3);
            
            const x = b0 * start[0] + b1 * ctrl1[0] + b2 * ctrl2[0] + b3 * end[0];
            const y = b0 * start[1] + b1 * ctrl1[1] + b2 * ctrl2[1] + b3 * end[1];
            
            points.push([Math.round(x), Math.round(y)]);
        }
        return points;
    }
    
    /**
     * Afficher sur un élément canvas HTML
     */
    show(canvasElement: HTMLCanvasElement | string): void {
        cv.imshow(canvasElement, this.mat);
    }
    
    /**
     * Obtenir l'image en tant que ImageData
     */
    getImageData(): ImageData {
        // Convertir BGRA → RGBA pour HTML Canvas
        const rgba = new cv.Mat();
        cv.cvtColor(this.mat, rgba, cv.COLOR_BGRA2RGBA);
        
        const imageData = new ImageData(
            new Uint8ClampedArray(rgba.data),
            this.width,
            this.height
        );
        
        rgba.delete();
        return imageData;
    }
    
    /**
     * Exporter en Data URL (pour téléchargement)
     */
    toDataURL(type: string = 'image/png'): string {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const ctx = tempCanvas.getContext('2d')!;
        ctx.putImageData(this.getImageData(), 0, 0);
        return tempCanvas.toDataURL(type);
    }
    
    /**
     * Libérer la mémoire (IMPORTANT pour WASM)
     */
    delete(): void {
        this.mat.delete();
    }
}
```

---

## 📦 Export Vidéo (WebM)

```typescript
/**
 * Exporter les frames en vidéo WebM via MediaRecorder API
 */
class VideoExporter {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private stream: MediaStream | null = null;
    
    async exportToWebM(frames: ImageData[], fps: number = 30): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = frames[0].width;
            canvas.height = frames[0].height;
            const ctx = canvas.getContext('2d')!;
            
            this.stream = canvas.captureStream(fps);
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            this.chunks = [];
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.chunks.push(e.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: 'video/webm' });
                resolve(blob);
            };
            
            this.mediaRecorder.onerror = reject;
            
            this.mediaRecorder.start();
            
            let frameIndex = 0;
            const frameDuration = 1000 / fps;
            
            const drawFrame = () => {
                if (frameIndex < frames.length) {
                    ctx.putImageData(frames[frameIndex], 0, 0);
                    frameIndex++;
                    setTimeout(drawFrame, frameDuration);
                } else {
                    this.mediaRecorder!.stop();
                }
            };
            
            drawFrame();
        });
    }
}
```

---

## 📦 Export GIF (gif.js)

```typescript
/**
 * Exporter les frames en GIF animé via gif.js
 */
class GIFExporter {
    async exportToGIF(frames: ImageData[], fps: number = 30): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const gif = new GIF({
                workers: 2,
                quality: 10,
                width: frames[0].width,
                height: frames[0].height
            });
            
            const delay = 1000 / fps;
            
            for (const frame of frames) {
                gif.addFrame(frame, { delay });
            }
            
            gif.on('finished', (blob: Blob) => {
                resolve(blob);
            });
            
            gif.render();
        });
    }
}
```

---

## 🔄 Plan de Migration

### Phase 1 : Configuration (1-2 jours)
- [ ] Créer projet npm avec TypeScript
- [ ] Configurer build (webpack/rollup/vite)
- [ ] Intégrer OpenCV.js (via npm ou CDN)
- [ ] Écrire tests de chargement OpenCV.js

### Phase 2 : Core Canvas (3-5 jours)
- [ ] Implémenter `OpenCVCanvas.ts`
- [ ] Tester lignes, polylignes, courbes Bézier
- [ ] Tester remplissage polygones
- [ ] Tester alpha blending
- [ ] Gérer mémoire (delete des Mat)

### Phase 3 : SVG Parsing (2-3 jours)
- [ ] Porter `svg_parser.py` → `SVGParser.ts` (DOMParser natif)
- [ ] Porter logique de parsing des paths
- [ ] Porter parsing des éléments texte
- [ ] Tester avec SVG de référence

### Phase 4 : Rendering (3-5 jours)
- [ ] Porter `path_renderer.py` → `PathRenderer.ts`
- [ ] Porter `shape_renderer.py` → `ShapeRenderer.ts`
- [ ] Porter `text_renderer.py` → `TextRenderer.ts`
- [ ] Tester rendu statique complet

### Phase 5 : Animation (3-5 jours)
- [ ] Porter `animation.py` → `Animation.ts`
- [ ] Porter `easing.py` → `Easing.ts`
- [ ] Implémenter génération de frames
- [ ] Utiliser `requestAnimationFrame` pour animation temps réel
- [ ] Porter hand overlay

### Phase 6 : Export (2-3 jours)
- [ ] Implémenter export PNG/JPG (Canvas API)
- [ ] Implémenter export WebM (MediaRecorder)
- [ ] Implémenter export GIF (gif.js)
- [ ] Ajouter téléchargement automatique

### Phase 7 : API Finale (2-3 jours)
- [ ] Créer classe `Kivg` principale
- [ ] Aligner API avec version Python
- [ ] Documentation JSDoc
- [ ] Exemples React/Vue/Vanilla

### Phase 8 : Tests & Optimisation (2-3 jours)
- [ ] Tests unitaires (Jest/Vitest)
- [ ] Tests E2E (Playwright)
- [ ] Optimisation mémoire WASM
- [ ] Benchmark performance
- [ ] Build minifié pour production

---

## 📜 Exemple d'Utilisation (API Finale)

### Vanilla JavaScript
```html
<!DOCTYPE html>
<html>
<head>
    <script async src="https://docs.opencv.org/4.8.0/opencv.js"></script>
    <script src="https://unpkg.com/kivg-js@1.0.0/dist/kivg.min.js"></script>
</head>
<body>
    <canvas id="output" width="512" height="512"></canvas>
    <script>
        // Attendre le chargement d'OpenCV.js
        cv['onRuntimeInitialized'] = async () => {
            const kivg = new Kivg({
                width: 512,
                height: 512,
                canvasElement: 'output'
            });
            
            // Rendu statique
            await kivg.draw('logo.svg', { fill: true });
            
            // Ou avec animation
            const frames = await kivg.draw('logo.svg', {
                animate: true,
                fill: true,
                fps: 30
            });
            
            // Export vidéo
            const videoBlob = await kivg.exportVideo(frames, { fps: 30 });
            downloadBlob(videoBlob, 'animation.webm');
            
            // Export GIF
            const gifBlob = await kivg.exportGIF(frames, { fps: 15 });
            downloadBlob(gifBlob, 'animation.gif');
        };
    </script>
</body>
</html>
```

### React Component
```tsx
import { useEffect, useRef, useState } from 'react';
import { Kivg } from 'kivg-js';

function SVGRenderer({ svgUrl, animate = false }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [kivg, setKivg] = useState<Kivg | null>(null);
    
    useEffect(() => {
        if (!canvasRef.current) return;
        
        const instance = new Kivg({
            width: 512,
            height: 512,
            canvasElement: canvasRef.current
        });
        setKivg(instance);
        
        return () => instance.dispose();
    }, []);
    
    useEffect(() => {
        if (!kivg || !svgUrl) return;
        
        kivg.draw(svgUrl, { animate, fill: true, fps: 30 });
    }, [kivg, svgUrl, animate]);
    
    return <canvas ref={canvasRef} />;
}
```

---

## ⚠️ Points d'Attention

### 1. Gestion Mémoire WASM
OpenCV.js utilise WebAssembly. Il est **crucial** de libérer la mémoire :
```javascript
// Toujours appeler delete() sur les Mat et MatVector
const mat = new cv.Mat();
// ... utilisation ...
mat.delete(); // OBLIGATOIRE
```

### 2. Chargement Asynchrone
OpenCV.js est lourd (~7-20 MB). Prévoir :
- Lazy loading
- Indicateur de chargement
- Fallback si échec

### 3. Différences de Couleur
- **Python OpenCV** : BGR ou BGRA
- **OpenCV.js** : Même ordre BGR/BGRA
- **HTML Canvas** : RGBA

Conversions nécessaires lors de l'export.

### 4. Performance Animation
- Utiliser `requestAnimationFrame`
- Éviter de recréer les Mat à chaque frame
- Utiliser Web Workers si possible pour le parsing SVG

### 5. Compatibilité Navigateurs
- Chrome/Edge : ✅ Complet
- Firefox : ✅ Complet
- Safari : ✅ Complet (depuis iOS 14)
- IE11 : ❌ Non supporté (pas de WASM)

---

## 📚 Ressources

- [Documentation OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [OpenCV.js Build](https://github.com/nicholasneo/opencv.js-build)
- [gif.js](https://github.com/jnordberg/gif.js)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

---

## 🤔 Questions Ouvertes

1. **Taille du bundle** : OpenCV.js fait ~7-20 MB. Utiliser build custom avec seulement les modules nécessaires ?
2. **Alternative légère** : Pour les cas simples, utiliser Canvas 2D natif sans OpenCV.js ?
3. **Support Node.js** : Porter aussi vers opencv4nodejs pour SSR ?
4. **Web Workers** : Déplacer le rendu lourd vers un Worker ?

---

**Auteur** : Plan de migration OpenCV.js  
**Date** : Novembre 2024  
**Status** : Proposition - En attente de validation
