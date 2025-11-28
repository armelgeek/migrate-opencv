/**
 * Animation module for OpenCV.js-based rendering.
 * Provides a standalone animation system that doesn't require Kivy.
 * 
 * This is the JavaScript equivalent of kivg/core/animation.py
 */

const { AnimationTransition } = require('./Easing.js');

// Class-level tracking of all active animations
const _animationInstances = new Set();

/**
 * Simple animation class for property interpolation.
 * Replaces kivy.animation.Animation for headless rendering.
 */
class Animation {
    /**
     * Initialize animation with target property values.
     * @param {Object} options - Animation options
     * @param {number} options.d - Duration in seconds (default: 1.0)
     * @param {number} options.duration - Duration in seconds (alias for d)
     * @param {string|Function} options.t - Transition function name or function (default: 'linear')
     * @param {string|Function} options.transition - Transition function (alias for t)
     * @param {...any} options.properties - Target property values to animate to
     */
    constructor(options = {}) {
        this._duration = options.d || options.duration || 1.0;
        const transitionName = options.t || options.transition || 'linear';

        // Remove known options to get animated properties
        const { d, duration, t, transition, ...animatedProperties } = options;

        if (typeof transitionName === 'string') {
            this._transition = AnimationTransition[transitionName] || AnimationTransition.linear;
        } else {
            this._transition = transitionName;
        }

        this._animatedProperties = animatedProperties;
        this._widgets = new Map();

        // Callbacks
        this._onStartCallbacks = [];
        this._onProgressCallbacks = [];
        this._onCompleteCallbacks = [];
    }

    /**
     * Get the duration of the animation.
     * @returns {number} Duration in seconds
     */
    get duration() {
        return this._duration;
    }

    /**
     * Get the transition function.
     * @returns {Function} Transition function
     */
    get transition() {
        return this._transition;
    }

    /**
     * Get the properties being animated.
     * @returns {Object} Animated properties
     */
    get animatedProperties() {
        return this._animatedProperties;
    }

    /**
     * Bind callbacks to animation events.
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.on_start - Called when animation starts
     * @param {Function} callbacks.on_progress - Called on each animation step
     * @param {Function} callbacks.on_complete - Called when animation completes
     */
    bind({ on_start, on_progress, on_complete } = {}) {
        if (on_start) {
            this._onStartCallbacks.push(on_start);
        }
        if (on_progress) {
            this._onProgressCallbacks.push(on_progress);
        }
        if (on_complete) {
            this._onCompleteCallbacks.push(on_complete);
        }
    }

    /**
     * Unbind callbacks from animation events.
     * @param {Object} callbacks - Callback functions to unbind
     */
    unbind({ on_start, on_progress, on_complete } = {}) {
        if (on_start) {
            const idx = this._onStartCallbacks.indexOf(on_start);
            if (idx !== -1) this._onStartCallbacks.splice(idx, 1);
        }
        if (on_progress) {
            const idx = this._onProgressCallbacks.indexOf(on_progress);
            if (idx !== -1) this._onProgressCallbacks.splice(idx, 1);
        }
        if (on_complete) {
            const idx = this._onCompleteCallbacks.indexOf(on_complete);
            if (idx !== -1) this._onCompleteCallbacks.splice(idx, 1);
        }
    }

    /**
     * Dispatch an event to registered callbacks.
     * @param {string} event - Event name
     * @param {Object} widget - Widget being animated
     * @param {number} progress - Animation progress (for on_progress event)
     */
    _dispatch(event, widget, progress = null) {
        if (event === 'on_start') {
            this._onStartCallbacks.forEach(cb => cb(this, widget));
        } else if (event === 'on_progress') {
            this._onProgressCallbacks.forEach(cb => cb(this, widget, progress));
        } else if (event === 'on_complete') {
            this._onCompleteCallbacks.forEach(cb => cb(this, widget));
        }
    }

    /**
     * Start the animation on a widget/object.
     * @param {Object} widget - Object with properties to animate
     */
    start(widget) {
        this.stop(widget);
        this._initialize(widget);
        _animationInstances.add(this);
        this._dispatch('on_start', widget);
    }

    /**
     * Stop the animation, triggering on_complete.
     * @param {Object} widget - Widget to stop animating
     */
    stop(widget) {
        const uid = this._getWidgetId(widget);
        if (this._widgets.has(uid)) {
            this._widgets.delete(uid);
            this._dispatch('on_complete', widget);
        }
        this.cancel(widget);
    }

    /**
     * Cancel the animation without triggering on_complete.
     * @param {Object} widget - Widget to cancel animation for
     */
    cancel(widget) {
        const uid = this._getWidgetId(widget);
        if (this._widgets.has(uid)) {
            this._widgets.delete(uid);
        }
        if (this._widgets.size === 0 && _animationInstances.has(this)) {
            _animationInstances.delete(this);
        }
    }

    /**
     * Cancel all animations on a widget.
     * @param {Object} widget - Widget to cancel all animations for
     * @param {...string} props - Specific properties to cancel (optional)
     */
    static cancelAll(widget, ...props) {
        for (const animation of Array.from(_animationInstances)) {
            if (props.length > 0) {
                for (const prop of props) {
                    animation.cancelProperty(widget, prop);
                }
            } else {
                animation.cancel(widget);
            }
        }
    }

    /**
     * Cancel animation of a specific property.
     * @param {Object} widget - Widget to cancel property animation for
     * @param {string} prop - Property name to cancel
     */
    cancelProperty(widget, prop) {
        const uid = this._getWidgetId(widget);
        if (this._widgets.has(uid)) {
            const widgetData = this._widgets.get(uid);
            delete widgetData.properties[prop];
            if (Object.keys(widgetData.properties).length === 0) {
                this.cancel(widget);
            }
        }
    }

    /**
     * Check if widget still has properties to animate.
     * @param {Object} widget - Widget to check
     * @returns {boolean} True if widget has properties to animate
     */
    havePropertiesToAnimate(widget) {
        const uid = this._getWidgetId(widget);
        return this._widgets.has(uid) && Object.keys(this._widgets.get(uid).properties).length > 0;
    }

    /**
     * Initialize animation state for widget.
     * @param {Object} widget - Widget to initialize
     */
    _initialize(widget) {
        const uid = this._getWidgetId(widget);
        this._widgets.set(uid, {
            widget: widget,
            properties: {},
            startTime: null
        });

        // Store initial values
        const props = this._widgets.get(uid).properties;
        for (const [key, target] of Object.entries(this._animatedProperties)) {
            let original = widget[key];
            if (Array.isArray(original)) {
                original = [...original];
            } else if (typeof original === 'object' && original !== null) {
                original = { ...original };
            }
            props[key] = [original, target];
        }
    }

    /**
     * Update animation state.
     * @param {number} dt - Time delta since last update
     * @param {Object} widget - Widget being animated
     * @returns {boolean} True if animation is still running
     */
    _update(dt, widget) {
        const uid = this._getWidgetId(widget);
        if (!this._widgets.has(uid)) {
            return false;
        }

        const anim = this._widgets.get(uid);

        if (anim.startTime === null) {
            anim.startTime = Date.now();
        }

        const elapsed = (Date.now() - anim.startTime) / 1000;

        // Calculate progress
        let progress;
        if (this._duration > 0) {
            progress = Math.min(1.0, elapsed / this._duration);
        } else {
            progress = 1.0;
        }

        const t = this._transition(progress);

        // Update properties
        for (const [key, [startVal, endVal]] of Object.entries(anim.properties)) {
            const value = this._calculate(startVal, endVal, t);
            widget[key] = value;
        }

        this._dispatch('on_progress', widget, progress);

        // Check if complete
        if (progress >= 1.0) {
            this.stop(widget);
            return false;
        }

        return true;
    }

    /**
     * Calculate interpolated value.
     * @param {any} a - Start value
     * @param {any} b - End value
     * @param {number} t - Interpolation factor
     * @returns {any} Interpolated value
     */
    _calculate(a, b, t) {
        if (Array.isArray(a)) {
            return a.map((val, i) => this._calculate(val, b[i], t));
        } else if (typeof a === 'object' && a !== null) {
            const result = {};
            for (const k of Object.keys(a)) {
                result[k] = this._calculate(a[k] || 0, b[k] || 0, t);
            }
            return result;
        } else {
            return a * (1 - t) + b * t;
        }
    }

    /**
     * Run animation synchronously and return all frames.
     * @param {Object} widget - Object with properties to animate
     * @param {number} fps - Frames per second
     * @param {Function} onFrame - Optional callback for each frame
     * @returns {number[]} List of progress values for each frame
     */
    animateSync(widget, fps = 60, onFrame = null) {
        const frames = [];
        const numFrames = Math.max(1, Math.floor(this._duration * fps));

        // Store initial values
        const initialValues = {};
        for (const key of Object.keys(this._animatedProperties)) {
            initialValues[key] = widget[key];
        }

        for (let i = 0; i <= numFrames; i++) {
            const progress = numFrames > 0 ? i / numFrames : 1.0;
            const t = this._transition(progress);

            // Update properties
            for (const [key, target] of Object.entries(this._animatedProperties)) {
                const startVal = initialValues[key];
                const value = this._calculate(startVal, target, t);
                widget[key] = value;
            }

            // Call frame callback
            if (onFrame) {
                onFrame(widget, progress);
            }

            frames.push(progress);
        }

        return frames;
    }

    /**
     * Get unique ID for widget.
     * @param {Object} widget - Widget to get ID for
     * @returns {number} Unique ID
     */
    _getWidgetId(widget) {
        if (!widget._animationUid) {
            widget._animationUid = Math.random() * Number.MAX_SAFE_INTEGER;
        }
        return widget._animationUid;
    }

    /**
     * Create sequential animation (+ operator).
     * @param {Animation} other - Animation to sequence after this one
     * @returns {Sequence} Sequential animation
     */
    add(other) {
        return new Sequence(this, other);
    }

    /**
     * Create parallel animation (& operator).
     * @param {Animation} other - Animation to run in parallel
     * @returns {Parallel} Parallel animation
     */
    and(other) {
        return new Parallel(this, other);
    }
}

/**
 * Base class for compound animations.
 */
class CompoundAnimation extends Animation {
    constructor() {
        super();
        this.anim1 = null;
        this.anim2 = null;
    }

    /**
     * Check if widget has properties to animate.
     * @param {Object} widget - Widget to check
     * @returns {boolean} True if has properties to animate
     */
    havePropertiesToAnimate(widget) {
        return (
            this.anim1.havePropertiesToAnimate(widget) ||
            this.anim2.havePropertiesToAnimate(widget)
        );
    }

    /**
     * Get all animated properties from both animations.
     * @returns {Object} Combined animated properties
     */
    get animatedProperties() {
        return {
            ...this.anim1.animatedProperties,
            ...this.anim2.animatedProperties
        };
    }
}

/**
 * Sequential animation - runs animations one after another.
 */
class Sequence extends CompoundAnimation {
    /**
     * Create a sequential animation.
     * @param {Animation} anim1 - First animation
     * @param {Animation} anim2 - Second animation
     */
    constructor(anim1, anim2) {
        super();
        this.anim1 = anim1;
        this.anim2 = anim2;
        this.repeat = false;
        this._currentAnim = null;
        this._widgets = new Map();
    }

    /**
     * Get total duration.
     * @returns {number} Total duration
     */
    get duration() {
        return this.anim1.duration + this.anim2.duration;
    }

    /**
     * Start the sequential animation.
     * @param {Object} widget - Widget to animate
     */
    start(widget) {
        this.stop(widget);
        const uid = this._getWidgetId(widget);
        this._widgets.set(uid, true);
        _animationInstances.add(this);
        this._dispatch('on_start', widget);

        // Set up completion handler for first animation
        const onAnim1Complete = (anim, w) => {
            if (this._widgets.has(this._getWidgetId(w))) {
                this.anim2.start(w);
            }
        };

        const onAnim2Complete = (anim, w) => {
            if (!this._widgets.has(this._getWidgetId(w))) {
                return;
            }
            if (this.repeat) {
                this.anim1.start(w);
            } else {
                this._dispatch('on_complete', w);
                this.cancel(w);
            }
        };

        this.anim1.bind({ on_complete: onAnim1Complete });
        this.anim2.bind({ on_complete: onAnim2Complete });

        this._currentAnim = this.anim1;
        this.anim1.start(widget);
    }

    /**
     * Stop the animation.
     * @param {Object} widget - Widget to stop
     */
    stop(widget) {
        const uid = this._getWidgetId(widget);
        if (this._widgets.has(uid)) {
            this._widgets.delete(uid);
            this.anim1.stop(widget);
            this.anim2.stop(widget);
            this._dispatch('on_complete', widget);
        }
    }

    /**
     * Cancel the animation.
     * @param {Object} widget - Widget to cancel
     */
    cancel(widget) {
        const uid = this._getWidgetId(widget);
        if (this._widgets.has(uid)) {
            this._widgets.delete(uid);
        }
        this.anim1.cancel(widget);
        this.anim2.cancel(widget);
        if (_animationInstances.has(this)) {
            _animationInstances.delete(this);
        }
    }
}

/**
 * Parallel animation - runs animations simultaneously.
 */
class Parallel extends CompoundAnimation {
    /**
     * Create a parallel animation.
     * @param {Animation} anim1 - First animation
     * @param {Animation} anim2 - Second animation
     */
    constructor(anim1, anim2) {
        super();
        this.anim1 = anim1;
        this.anim2 = anim2;
        this._widgets = new Map();
    }

    /**
     * Get the maximum duration.
     * @returns {number} Maximum duration
     */
    get duration() {
        return Math.max(this.anim1.duration, this.anim2.duration);
    }

    /**
     * Start both animations in parallel.
     * @param {Object} widget - Widget to animate
     */
    start(widget) {
        this.stop(widget);
        const uid = this._getWidgetId(widget);
        this._widgets.set(uid, { complete: 0 });
        _animationInstances.add(this);
        this._dispatch('on_start', widget);

        const onAnimComplete = (anim, w) => {
            const wid = this._getWidgetId(w);
            if (this._widgets.has(wid)) {
                const data = this._widgets.get(wid);
                data.complete += 1;
                if (data.complete >= 2) {
                    this.stop(w);
                }
            }
        };

        this.anim1.bind({ on_complete: onAnimComplete });
        this.anim2.bind({ on_complete: onAnimComplete });

        this.anim1.start(widget);
        this.anim2.start(widget);
    }

    /**
     * Stop both animations.
     * @param {Object} widget - Widget to stop
     */
    stop(widget) {
        const uid = this._getWidgetId(widget);
        if (this._widgets.has(uid)) {
            this._widgets.delete(uid);
            this._dispatch('on_complete', widget);
        }
        this.anim1.cancel(widget);
        this.anim2.cancel(widget);
        if (_animationInstances.has(this)) {
            _animationInstances.delete(this);
        }
    }

    /**
     * Cancel both animations.
     * @param {Object} widget - Widget to cancel
     */
    cancel(widget) {
        const uid = this._getWidgetId(widget);
        if (this._widgets.has(uid)) {
            this._widgets.delete(uid);
        }
        this.anim1.cancel(widget);
        this.anim2.cancel(widget);
        if (_animationInstances.has(this)) {
            _animationInstances.delete(this);
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Animation, Sequence, Parallel };
}

if (typeof window !== 'undefined') {
    window.Animation = Animation;
    window.Sequence = Sequence;
    window.Parallel = Parallel;
}
