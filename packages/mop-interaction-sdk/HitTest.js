/**
 * MoP Interaction SDK - HitTest Utility
 * -------------------------------------
 * A high-performance, layer-aware hit testing engine for complex canvas/DOM interfaces.
 * 
 * High-Star Best Practice:
 * - Inspired by Fabric.js and Konva event systems.
 * - Uses "Raycasting" (elementsFromPoint) instead of "Bubbling" (composedPath) 
 *   to solve Z-Index occlusion issues common in editor UIs.
 * 
 * @module mop-interaction-sdk/HitTest
 */

export class HitTest {
    /**
     * Perform an Omni-Directional Hit Test
     * Finds ALL elements at the given coordinates, penetrating through
     * transparent containers, SVG overlays, and other "pointer-events: none" gaps.
     * 
     * @param {number} x - Client X (Screen Coordinate)
     * @param {number} y - Client Y (Screen Coordinate)
     * @param {Array} path - Optional composedPath from an event for fallback
     * @returns {Object} { lane: HTMLElement|null, node: HTMLElement|null, edge: HTMLElement|null, raw: HTMLElement[] }
     */
    static analyze(x, y, path = []) {
        // 1. Raycast: Get everything at this pixel
        const hits = document.elementsFromPoint(x, y);

        // 2. Merge with Event Path
        const combined = [...new Set([...hits, ...path])].filter(Boolean);

        // 3. Semantic Extraction
        const lane = combined.find(el => el.tagName === 'MOP-LANE');
        const node = combined.find(el => el.tagName === 'MOP-NODE');

        // B. Edge Resolution (Advanced Proximity Check)
        let bestEdge = null;
        let minDist = Infinity;
        const HIT_THRESHOLD = 25; // Increased for better edge detection

        const edgeCandidates = combined.filter(el => el.tagName === 'MOP-EDGE');

        for (const edge of edgeCandidates) {
            if (typeof edge.getClosestPoint === 'function') {
                const { distance } = edge.getClosestPoint(x, y);
                if (distance < minDist) {
                    minDist = distance;
                    bestEdge = edge;
                }
            } else {
                if (!bestEdge) bestEdge = edge;
            }
        }

        const finalEdge = (minDist <= HIT_THRESHOLD) ? bestEdge : null;

        // 4. Priority Resolution (The "Truth" Logic)
        // Order: Node > Edge > Lane
        let bestTarget = null;

        if (node) {
            bestTarget = { type: 'node', element: node, id: node.getAttribute('id') };
        } else if (finalEdge) {
            // Recalculate T for convenience
            const { t } = finalEdge.getClosestPoint(x, y);
            bestTarget = { type: 'edge', element: finalEdge, id: finalEdge.getAttribute('id'), t };
        } else if (lane && HitTest.isLaneHeaderHit(lane, x, y)) {
            bestTarget = { type: 'lane', element: lane, id: lane.getAttribute('id') };
        }

        return {
            lane,
            node,
            edge: finalEdge,
            bestTarget, // The Single Source of Truth
            raw: combined
        };
    }

    /**
     * Specialized Hit Test for Lanes considering Header Geometry
     * @param {HTMLElement} laneEl 
     * @param {number} x 
     * @param {number} y 
     * @returns {boolean}
     */
    static isLaneHeaderHit(laneEl, x, y) {
        if (!laneEl || typeof laneEl.getHeaderRect !== 'function') return false;

        const rect = laneEl.getHeaderRect();
        if (!rect) return false;

        return (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
        );
    }
}
