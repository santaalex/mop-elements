class MoPEdge extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['points', 'type', 'color', 'animated', 'selected', 'label', 'label-t', 'marker-start', 'marker-end'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    /**
     * 计算 SVG 路径数据 (d属性)
     */
    getPathData() {
        const pointsStr = this.getAttribute('points');
        if (!pointsStr) return '';

        const points = pointsStr.split(' ').map(p => p.trim()).filter(p => p);
        if (points.length === 0) return '';

        let d = `M ${points[0]}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i]}`;
        }
        return d;
    }

    /**
     * 高星最佳实践：使用 SVG 原生方法计算路径比例点
     * @param {number} t 0.0 - 1.0
     */
    getPathPoint(t) {
        const svgPath = this.shadowRoot.querySelector('.path-line');
        if (!svgPath || !svgPath.getTotalLength) return { x: 0, y: 0 };

        const length = svgPath.getTotalLength();
        const point = svgPath.getPointAtLength(t * length);
        return { x: point.x, y: point.y };
    }

    /**
     * 计算某点到路径的最短距离和对应的 T 值
     * @param {number} screenX ClientX
     * @param {number} screenY ClientY
     * @returns {Object} { distance: number, t: number }
     */
    getClosestPoint(screenX, screenY) {
        const svg = this.shadowRoot.querySelector('svg');
        const svgPath = this.shadowRoot.querySelector('.path-line');
        if (!svg || !svgPath) return { distance: Infinity, t: 0 };

        // 1. Convert Screen Point to SVG Space
        const pt = svg.createSVGPoint();
        pt.x = screenX;
        pt.y = screenY;
        // 注意：svg.getScreenCTM() 可能受变换影响，必须处理
        const globalMatrix = svg.getScreenCTM();
        if (!globalMatrix) return { distance: Infinity, t: 0 };

        const svgPt = pt.matrixTransform(globalMatrix.inverse());

        // 2. Analytical Segment Distance (Precise & Fast)
        // We use the raw 'points' data which defines the polyline
        const pointsStr = this.getAttribute('points');
        if (!pointsStr) return { distance: Infinity, t: 0 };

        const points = pointsStr.split(' ').map(p => {
            const [x, y] = p.split(',').map(Number);
            return { x, y };
        });

        if (points.length < 2) return { distance: Infinity, t: 0 };

        let minDistance = Infinity;
        let bestT = 0;

        // Let's iterate segments.

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            // Segment vector
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const lenSq = dx * dx + dy * dy;

            // Project point onto line segment (clamped)
            let t = ((svgPt.x - p1.x) * dx + (svgPt.y - p1.y) * dy) / (lenSq || 1);
            t = Math.max(0, Math.min(1, t));

            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;

            const dist = Math.hypot(svgPt.x - projX, svgPt.y - projY);

            if (dist < minDistance) {
                minDistance = dist;
                // Approximate global T (not strictly path-length normalized, but segment index based)
                // Good enough for "Finding the label position"
                bestT = (i + t) / (points.length - 1);
            }
        }

        // Convert Scalar Distance Back to Screen Space
        const scale = Math.sqrt(globalMatrix.a * globalMatrix.a + globalMatrix.b * globalMatrix.b) || 1;
        const screenDistance = minDistance * scale;

        return { distance: screenDistance, t: bestT };
    }

    /**
     * 获取连线的包围盒 (Graph Coords)
     * 用于 Gizmo 精确对齐
     */
    getBounds() {
        const pointsStr = this.getAttribute('points');
        if (!pointsStr) return { x: 0, y: 0, width: 0, height: 0 };

        const points = pointsStr.split(' ').map(p => {
            const [x, y] = p.split(',').map(Number);
            return { x, y };
        });

        if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    render() {
        const color = this.getAttribute('color') || '#94a3b8';
        const selected = this.getAttribute('selected') === 'true';
        const animated = this.getAttribute('animated') === 'true';
        const label = this.getAttribute('label') || '';
        const labelT = parseFloat(this.getAttribute('label-t')) || 0.5; // 默认居中

        const strokeWidth = selected ? 3 : 2;
        const strokeColor = selected ? '#3b82f6' : color;
        const pathData = this.getPathData();

        // 首次渲染后才能通过 getPathPoint 获取精确位置
        // 如果渲染时还没有 DOM，先做个 fallback 计算
        const center = this.shadowRoot.querySelector('.path-line')
            ? this.getPathPoint(labelT)
            : this.getLegacyCenter(this.getAttribute('points'));

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                pointer-events: none;
                display: block;
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                overflow: visible;
                z-index: 10;
            }
            svg { width: 100%; height: 100%; overflow: visible; pointer-events: none; }

            .hit-area {
                fill: none;
                stroke: transparent;
                cursor: pointer;
                pointer-events: stroke;
            }

            .path-line {
                fill: none;
                stroke-linejoin: round;
                stroke-linecap: round;
                pointer-events: none;
                transition: stroke 0.2s, stroke-width 0.2s;
            }

            .animated {
                stroke-dasharray: 8 4;
                animation: flow 1s linear infinite;
            }

            @keyframes flow {
                from { stroke-dashoffset: 24; }
                to { stroke-dashoffset: 0; }
            }

            /* 标签：高星 UI 实绩 - 增加阴影和清晰度 */
            .label-group {
                pointer-events: auto;
                cursor: text;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
            }
            .label-bg {
                fill: white;
                stroke: #e2e8f0;
                stroke-width: 1px;
                rx: 12px; /* 圆角矩形 */
            }
            .label-text {
                font-family: 'Inter', system-ui, sans-serif;
                font-size: 11px;
                font-weight: 500;
                fill: #334155;
                user-select: none;
                text-anchor: middle;
                dominant-baseline: middle;
            }
        </style>

        <svg>
            <defs>
                <marker id="arrow-${strokeColor.replace('#', '')}" 
                        markerWidth="6" markerHeight="6" 
                        refX="5" refY="3" 
                        orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="${strokeColor}" />
                </marker>
            </defs>

            <path d="${pathData}" 
                  class="path-line ${animated ? 'animated' : ''}" 
                  stroke="${strokeColor}" 
                  stroke-width="${strokeWidth}"
                  marker-end="url(#arrow-${strokeColor.replace('#', '')})" />

            ${label ? `
                <g class="label-group" transform="translate(${center.x}, ${center.y})">
                    <!-- 动态背景：大概根据字符数计算宽度 -->
                    <rect x="${-(label.length * 4 + 10)}" y="-9" 
                          width="${label.length * 8 + 20}" height="18" 
                          class="label-bg" />
                    <text x="0" y="0" class="label-text">${label}</text>
                </g>
            ` : ''}

            <path d="${pathData}" class="hit-area" stroke-width="16" />
        </svg>
        `;

        // 最佳实践：首帧渲染后立即校准一次
        if (label && !this._calibrated) {
            requestAnimationFrame(() => {
                this._calibrated = true;
                this.render();
            });
        }
    }

    getLegacyCenter(pointsStr) {
        if (!pointsStr) return { x: 0, y: 0 };
        const points = pointsStr.split(' ').map(p => {
            const [x, y] = p.split(',').map(Number);
            return { x, y };
        });
        if (points.length < 2) return points[0] || { x: 0, y: 0 };
        const mid = Math.floor((points.length - 1) / 2);
        return { x: (points[mid].x + points[mid + 1].x) / 2, y: (points[mid].y + points[mid + 1].y) / 2 };
    }
}

if (!customElements.get('mop-edge')) {
    customElements.define('mop-edge', MoPEdge);
}
