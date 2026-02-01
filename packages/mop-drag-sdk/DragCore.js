/**
 * MoP Drag SDK Core (The Brain)
 * 
 * A pure logic kernel for calculating node positions in a lane-based graph.
 * 
 * Design Philosophy:
 * - Zero DOM dependencies (Runs in Node.js / WebWorker / Browser)
 * - Configurable Layout (Injectable config)
 * - Pure Functions (Input State -> Output State)
 */
export class DragCore {
    /**
     * @param {Object} config - Layout Configuration
     * @param {number} config.LANE_START_X
     * @param {number} config.LANE_START_Y
     * @param {number} config.LANE_GAP
     * @param {number} config.LANE_DEFAULT_HEIGHT
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Calculate the World Y coordinate of a Lane's top edge.
     * @param {Array<Object>} lanes - Full list of lane data objects
     * @param {string} laneId - Target lane ID
     * @returns {number} World Y coordinate
     */
    getLaneTop(lanes, laneId) {
        let currentY = this.config.LANE_START_Y;
        const GAP = this.config.LANE_GAP;

        // Sort explicitly to ensure deterministic layout
        const sortedLanes = [...lanes].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        for (const lane of sortedLanes) {
            if (lane.id === laneId) return currentY;
            const h = parseFloat(lane.h) || this.config.LANE_DEFAULT_HEIGHT;
            currentY += h + GAP;
        }
        // CRITICAL FIX: Fallback to 0 if lane not found, matching CanvasRenderer logic
        return 0;
    }

    /**
     * Detect which lane covers a given World Coordinate point.
     * @param {Array<Object>} lanes - Full list of lane data objects
     * @param {number} worldX 
     * @param {number} worldY 
     * @returns {string|null} Lane ID or null
     */
    detectLane(lanes, worldX, worldY) {
        let currentY = this.config.LANE_START_Y;
        const GAP = this.config.LANE_GAP;
        const LANE_X = this.config.LANE_START_X;

        const sortedLanes = [...lanes].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        for (const lane of sortedLanes) {
            const h = parseFloat(lane.h) || this.config.LANE_DEFAULT_HEIGHT;

            // Hit Test
            // We assume infinite width or sufficient width for now, 
            // but strict check would be (worldX >= LANE_X && worldX <= LANE_X + width)
            if (worldX >= LANE_X &&
                worldY >= currentY &&
                worldY <= currentY + h) {
                return lane.id;
            }
            currentY += h + GAP;
        }
        return null;
    }

    /**
     * Calculate Relative Coordinates for storage.
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {string} laneId 
     * @param {Array<Object>} lanes 
     * @returns {Object} { x, y } relative to lane
     */
    toRelative(worldX, worldY, laneId, lanes) {
        // If no lane, we use 0 offset as the reference
        const laneTop = laneId ? this.getLaneTop(lanes, laneId) : 0;
        const laneX = laneId ? this.config.LANE_START_X : 0;

        return {
            x: worldX - laneX,
            y: worldY - laneTop
        };
    }
}
