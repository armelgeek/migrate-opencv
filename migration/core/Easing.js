/**
 * Easing/transition functions for animations.
 * Ported from Kivy's AnimationTransition class.
 * 
 * This is the JavaScript equivalent of kivg/core/easing.py
 */

/**
 * Collection of easing functions for animations.
 */
const AnimationTransition = {
    /**
     * Linear transition (no easing).
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    linear(progress) {
        return progress;
    },

    /**
     * Quadratic ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_quad(progress) {
        return progress * progress;
    },

    /**
     * Quadratic ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_quad(progress) {
        return -1.0 * progress * (progress - 2.0);
    },

    /**
     * Quadratic ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_quad(progress) {
        let p = progress * 2;
        if (p < 1) {
            return 0.5 * p * p;
        }
        p -= 1.0;
        return -0.5 * (p * (p - 2.0) - 1.0);
    },

    /**
     * Cubic ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_cubic(progress) {
        return progress * progress * progress;
    },

    /**
     * Cubic ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_cubic(progress) {
        const p = progress - 1.0;
        return p * p * p + 1.0;
    },

    /**
     * Cubic ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_cubic(progress) {
        let p = progress * 2;
        if (p < 1) {
            return 0.5 * p * p * p;
        }
        p -= 2;
        return 0.5 * (p * p * p + 2.0);
    },

    /**
     * Quartic ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_quart(progress) {
        return progress * progress * progress * progress;
    },

    /**
     * Quartic ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_quart(progress) {
        const p = progress - 1.0;
        return -1.0 * (p * p * p * p - 1.0);
    },

    /**
     * Quartic ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_quart(progress) {
        let p = progress * 2;
        if (p < 1) {
            return 0.5 * p * p * p * p;
        }
        p -= 2;
        return -0.5 * (p * p * p * p - 2.0);
    },

    /**
     * Quintic ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_quint(progress) {
        return progress * progress * progress * progress * progress;
    },

    /**
     * Quintic ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_quint(progress) {
        const p = progress - 1.0;
        return p * p * p * p * p + 1.0;
    },

    /**
     * Quintic ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_quint(progress) {
        let p = progress * 2;
        if (p < 1) {
            return 0.5 * p * p * p * p * p;
        }
        p -= 2.0;
        return 0.5 * (p * p * p * p * p + 2.0);
    },

    /**
     * Sinusoidal ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_sine(progress) {
        return -1.0 * Math.cos(progress * (Math.PI / 2.0)) + 1.0;
    },

    /**
     * Sinusoidal ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_sine(progress) {
        return Math.sin(progress * (Math.PI / 2.0));
    },

    /**
     * Sinusoidal ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_sine(progress) {
        return -0.5 * (Math.cos(Math.PI * progress) - 1.0);
    },

    /**
     * Exponential ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_expo(progress) {
        if (progress === 0) {
            return 0.0;
        }
        return Math.pow(2, 10 * (progress - 1.0));
    },

    /**
     * Exponential ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_expo(progress) {
        if (progress === 1.0) {
            return 1.0;
        }
        return -Math.pow(2, -10 * progress) + 1.0;
    },

    /**
     * Exponential ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_expo(progress) {
        if (progress === 0) {
            return 0.0;
        }
        if (progress === 1) {
            return 1.0;
        }
        let p = progress * 2;
        if (p < 1) {
            return 0.5 * Math.pow(2, 10 * (p - 1.0));
        }
        p -= 1.0;
        return 0.5 * (-Math.pow(2, -10 * p) + 2.0);
    },

    /**
     * Circular ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_circ(progress) {
        return -1.0 * (Math.sqrt(1.0 - progress * progress) - 1.0);
    },

    /**
     * Circular ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_circ(progress) {
        const p = progress - 1.0;
        return Math.sqrt(1.0 - p * p);
    },

    /**
     * Circular ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_circ(progress) {
        let p = progress * 2;
        if (p < 1) {
            return -0.5 * (Math.sqrt(1.0 - p * p) - 1.0);
        }
        p -= 2.0;
        return 0.5 * (Math.sqrt(1.0 - p * p) + 1.0);
    },

    /**
     * Elastic ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_elastic(progress) {
        const p = 0.3;
        const s = p / 4.0;
        let q = progress;
        if (q === 1) {
            return 1.0;
        }
        q -= 1.0;
        return -(Math.pow(2, 10 * q) * Math.sin((q - s) * (2 * Math.PI) / p));
    },

    /**
     * Elastic ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_elastic(progress) {
        const p = 0.3;
        const s = p / 4.0;
        const q = progress;
        if (q === 1) {
            return 1.0;
        }
        return Math.pow(2, -10 * q) * Math.sin((q - s) * (2 * Math.PI) / p) + 1.0;
    },

    /**
     * Elastic ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_elastic(progress) {
        const p = 0.3 * 1.5;
        const s = p / 4.0;
        let q = progress * 2;
        if (q === 2) {
            return 1.0;
        }
        if (q < 1) {
            q -= 1.0;
            return -0.5 * (Math.pow(2, 10 * q) * Math.sin((q - s) * (2.0 * Math.PI) / p));
        } else {
            q -= 1.0;
            return Math.pow(2, -10 * q) * Math.sin((q - s) * (2.0 * Math.PI) / p) * 0.5 + 1.0;
        }
    },

    /**
     * Back ease-in (overshoots then comes back).
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_back(progress) {
        return progress * progress * ((1.70158 + 1.0) * progress - 1.70158);
    },

    /**
     * Back ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_back(progress) {
        const p = progress - 1.0;
        return p * p * ((1.70158 + 1) * p + 1.70158) + 1.0;
    },

    /**
     * Back ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_back(progress) {
        let p = progress * 2.0;
        const s = 1.70158 * 1.525;
        if (p < 1) {
            return 0.5 * (p * p * ((s + 1.0) * p - s));
        }
        p -= 2.0;
        return 0.5 * (p * p * ((s + 1.0) * p + s) + 2.0);
    },

    /**
     * Internal bounce calculation.
     * @param {number} t - Time value
     * @param {number} d - Duration
     * @returns {number} Bounce value
     */
    _out_bounce_internal(t, d) {
        let p = t / d;
        if (p < (1.0 / 2.75)) {
            return 7.5625 * p * p;
        } else if (p < (2.0 / 2.75)) {
            p -= (1.5 / 2.75);
            return 7.5625 * p * p + 0.75;
        } else if (p < (2.5 / 2.75)) {
            p -= (2.25 / 2.75);
            return 7.5625 * p * p + 0.9375;
        } else {
            p -= (2.625 / 2.75);
            return 7.5625 * p * p + 0.984375;
        }
    },

    /**
     * Internal bounce calculation.
     * @param {number} t - Time value
     * @param {number} d - Duration
     * @returns {number} Bounce value
     */
    _in_bounce_internal(t, d) {
        return 1.0 - AnimationTransition._out_bounce_internal(d - t, d);
    },

    /**
     * Bounce ease-in.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_bounce(progress) {
        return AnimationTransition._in_bounce_internal(progress, 1.0);
    },

    /**
     * Bounce ease-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    out_bounce(progress) {
        return AnimationTransition._out_bounce_internal(progress, 1.0);
    },

    /**
     * Bounce ease-in-out.
     * @param {number} progress - Progress value (0.0 to 1.0)
     * @returns {number} Eased value
     */
    in_out_bounce(progress) {
        const p = progress * 2.0;
        if (p < 1.0) {
            return AnimationTransition._in_bounce_internal(p, 1.0) * 0.5;
        }
        return AnimationTransition._out_bounce_internal(p - 1.0, 1.0) * 0.5 + 0.5;
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimationTransition };
}

if (typeof window !== 'undefined') {
    window.AnimationTransition = AnimationTransition;
}
