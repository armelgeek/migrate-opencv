/**
 * AnimationHandler manages animation creation and sequencing.
 * 
 * This is the JavaScript equivalent of kivg/animation/handler.py
 */

const { Animation } = require('../core/Animation.js');
const { AnimationContext } = require('../utils/DataClasses.js');
const { ShapeAnimator } = require('./ShapeAnimator.js');

/**
 * Centralized handler for all types of animations in Kivg.
 */
class AnimationHandler {
    /**
     * Create a sequence or parallel animation from multiple animations.
     * @param {Animation[]} animations - List of Animation objects
     * @param {boolean} sequential - If true, animations run in sequence, otherwise in parallel
     * @returns {Animation|null} Combined Animation object or null if animations list is empty
     */
    static createAnimationSequence(animations, sequential = true) {
        if (!animations || animations.length === 0) {
            return null;
        }

        let combined = animations[0];
        for (let i = 1; i < animations.length; i++) {
            if (sequential) {
                combined = combined.add(animations[i]); // Sequential
            } else {
                combined = combined.and(animations[i]); // Parallel
            }
        }

        return combined;
    }

    /**
     * Add a fade-in animation for shape filling.
     * @param {Animation} anim - Base animation to add fill animation to
     * @param {Object} widget - Widget to animate
     * @param {Function} onProgressCallback - Callback for animation progress
     * @returns {Animation} Animation with fill effect added
     */
    static addFillAnimation(anim, widget, onProgressCallback = null) {
        const fillAnim = new Animation({ d: 0.4, mesh_opacity: 1 });

        if (onProgressCallback) {
            fillAnim.bind({ on_progress: onProgressCallback });
        }

        return anim.add(fillAnim);
    }

    /**
     * Prepare and start an animation.
     * @param {Animation} anim - Animation to start
     * @param {Object} widget - Widget to animate
     * @param {Function} onProgressCallback - Callback for animation progress
     * @param {Function} onCompleteCallback - Callback for animation completion
     */
    static prepareAndStartAnimation(anim, widget, onProgressCallback = null, onCompleteCallback = null) {
        Animation.cancelAll(widget);

        if (onProgressCallback) {
            anim.bind({ on_progress: onProgressCallback });
        }

        if (onCompleteCallback) {
            anim.bind({ on_complete: onCompleteCallback });
        }

        anim.start(widget);
    }

    /**
     * Set up animations for a shape using ShapeAnimator.
     * @param {Object} caller - The caller object (usually Kivg instance)
     * @param {AnimationContext} context - AnimationContext with animation parameters
     * @returns {Animation[]} List of Animation objects
     */
    static setupShapeAnimations(caller, context) {
        return ShapeAnimator.setupAnimation(caller, context);
    }

    /**
     * Prepare animations for shapes based on configuration.
     * @param {Object} caller - Object calling the animation (typically Kivg instance)
     * @param {Object} widget - Widget to animate
     * @param {Object[]} animConfigList - List of animation configuration dictionaries
     * @param {Object} closedShapes - SVG path data organized by shape ID
     * @param {number[]} svgSize - SVG dimensions
     * @param {string} svgFile - SVG file path
     * @returns {Array} List of tuples [shape_id, animation] for the shapes
     */
    static prepareShapeAnimations(caller, widget, animConfigList, closedShapes, svgSize, svgFile) {
        const animationList = [];

        for (const config of animConfigList) {
            // Create animation context
            const context = new AnimationContext({
                widget: widget,
                shapeId: config.id_,
                direction: config.from_ || null,
                transition: config.t || 'out_sine',
                duration: config.d || 0.3,
                closedShapes: closedShapes,
                swSize: svgSize,
                svgFile: svgFile
            });

            // Get animation list from ShapeAnimator
            const animList = AnimationHandler.setupShapeAnimations(caller, context);

            if (animList && animList.length > 0) {
                // Combine animations in parallel
                const combinedAnim = AnimationHandler.createAnimationSequence(animList, false);
                animationList.push([config.id_, combinedAnim]);
            }
        }

        return animationList;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimationHandler };
}

if (typeof window !== 'undefined') {
    window.AnimationHandler = AnimationHandler;
}
