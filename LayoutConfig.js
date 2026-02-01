/**
 * LayoutConfig (Single Source of Truth)
 * 
 * Defines the constant geometry rules for the editor.
 * Shared between CanvasRenderer (Painter) and Strategies (Calculators).
 */
export const LayoutConfig = {
    LANE_START_X: 100,
    LANE_START_Y: 100, // Canvas Start Y
    LANE_GAP: 6,       // Vertical gap between lanes
    LANE_DEFAULT_WIDTH: 1200,
    LANE_DEFAULT_HEIGHT: 220,
    NODE_DEFAULT_WIDTH: 160,
    NODE_DEFAULT_HEIGHT: 60
};
