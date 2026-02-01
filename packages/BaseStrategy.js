/**
 * Abstract Base Strategy
 * All interaction strategies (Drag, Connect, Pan) must inherit from this.
 */
export class BaseStrategy {
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * @returns {string} Unique identifier for strategy
     */
    get name() {
        return 'base';
    }

    /**
     * Determines if this strategy should handle the given event.
     * @param {Event} event 
     * @param {HTMLElement} target 
     * @returns {boolean}
     */
    canHandle(event, target) {
        return false;
    }

    /**
     * Called when the strategy becomes active.
     */
    activate(event) {
        console.log(`[Interaction] Activated: ${this.name}`);
    }

    /**
     * Called when the strategy is deactivated.
     */
    deactivate() {
        console.log(`[Interaction] Deactivated: ${this.name}`);
    }

    /**
     * Handle mouse move while active.
     */
    onMove(event) {
        // Override me
    }

    /**
     * Handle mouse up (completion).
     */
    onEnd(event) {
        // Override me
    }
}
