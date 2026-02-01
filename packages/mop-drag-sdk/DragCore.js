export class DragCore {
    constructor(config) {
        this.config = config;
    }

    getLaneTop(lanes, laneId) {
        let currentY = this.config.LANE_START_Y;
        const GAP = this.config.LANE_GAP;
        const sortedLanes = [...lanes].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        for (const lane of sortedLanes) {
            if (lane.id === laneId) return currentY;
            const h = parseFloat(lane.h) || this.config.LANE_DEFAULT_HEIGHT;
            currentY += h + GAP;
        }
        return this.config.LANE_START_Y;
    }

    detectLane(lanes, worldX, worldY) {
        let currentY = this.config.LANE_START_Y;
        const GAP = this.config.LANE_GAP;
        const LANE_X = this.config.LANE_START_X;
        const sortedLanes = [...lanes].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        for (const lane of sortedLanes) {
            const h = parseFloat(lane.h) || this.config.LANE_DEFAULT_HEIGHT;
            if (worldX >= LANE_X && worldY >= currentY && worldY <= currentY + h) {
                return lane.id;
            }
            currentY += h + GAP;
        }
        return null;
    }

    toRelative(worldX, worldY, laneId, lanes) {
        const laneTop = this.getLaneTop(lanes, laneId);
        const laneX = this.config.LANE_START_X;
        return { x: worldX - laneX, y: worldY - laneTop };
    }
}
