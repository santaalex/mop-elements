class MoPEdge extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['points', 'type', 'color', 'animated', 'selected', 'label', 'marker-start', 'marker-end'];
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
     * 目前支持 'manhattan' (直角) 和 'straight' (直线)
     * 壳子也可以直接传 d 属性，这里做简单的兜底处理
     */
    getPathData() {
        const pointsStr = this.getAttribute('points');
        if (!pointsStr) return '';

        // 简单的 "M x1 y1 L x2 y2 ..." 解析
        const points = pointsStr.split(' ').map(p => p.trim()).filter(p => p);
        if (points.length === 0) return '';

        let d = `M ${points[0]}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i]}`;
        }
        return d;
    }

    // 计算中心点用于放置 Label
    getCenterPoint(pointsStr) {
        if (!pointsStr) return { x: 0, y: 0 };
        const points = pointsStr.split(' ').map(p => {
            const [x, y] = p.split(',').map(Number);
            return { x, y };
        });

        // 简单取中间线段的中点 (更复杂的算法需壳子提供)
        if (points.length < 2) return points[0];

        const midIndex = Math.floor((points.length - 1) / 2);
        const p1 = points[midIndex];
        const p2 = points[midIndex + 1];

        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }

    render() {
        const color = this.getAttribute('color') || '#94a3b8'; // Default Slate-400
        const selected = this.getAttribute('selected') === 'true';
        const animated = this.getAttribute('animated') === 'true';
        const label = this.getAttribute('label') || '';

        const strokeWidth = selected ? 3 : 2;
        const strokeColor = selected ? '#3b82f6' : color; // Selected: Blue-500

        const pathData = this.getPathData();

        // 计算 Label 位置
        const center = this.getCenterPoint(this.getAttribute('points'));

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                pointer-events: none; /* 让鼠标事件透过容器，只响应 SVG 内容 */
                display: block;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: visible;
                z-index: 10; /* Edge layer */
            }
            
            svg {
                width: 100%;
                height: 100%;
                overflow: visible;
                pointer-events: none;
            }

            /* 命中热区：加粗的透明线，方便点击 */
            .hit-area {
                fill: none;
                stroke: transparent;
                stroke-width: 12px;
                cursor: pointer;
                pointer-events: stroke;
            }

            /* 实际显示的线 */
            .path-line {
                fill: none;
                stroke-linejoin: round;
                stroke-linecap: round;
                pointer-events: none; /* 点击事件交给 hit-area */
                transition: stroke 0.2s, stroke-width 0.2s;
            }

            /* 流动动画 */
            .animated {
                stroke-dasharray: 8 4;
                animation: flow 1s linear infinite;
            }

            @keyframes flow {
                from { stroke-dashoffset: 24; }
                to { stroke-dashoffset: 0; }
            }

            /* 标签样式 */
            .label-group {
                pointer-events: auto;
                cursor: text;
            }
            .label-bg {
                fill: rgba(255, 255, 255, 0.85);
                stroke: none;
                rx: 4px;
            }
            .label-text {
                font-family: 'Inter', sans-serif;
                font-size: 11px;
                fill: #475569;
                user-select: none;
                text-anchor: middle;
                dominant-baseline: middle;
            }
        </style>

        <svg>
            <defs>
                <!-- 箭头定义：缩小尺寸 (6x6) -->
                <marker id="arrow-${strokeColor.replace('#', '')}" 
                        markerWidth="6" markerHeight="6" 
                        refX="5" refY="3" 
                        orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="${strokeColor}" />
                </marker>
            </defs>

            <!-- 1. Visible Path (视觉线 - 改为底层) -->
            <path d="${pathData}" 
                  class="path-line ${animated ? 'animated' : ''}" 
                  stroke="${strokeColor}" 
                  stroke-width="${strokeWidth}"
                  marker-end="url(#arrow-${strokeColor.replace('#', '')})" />

            <!-- 2. Label (中间层) -->
            ${label ? `
                <g class="label-group" transform="translate(${center.x}, ${center.y})">
                    <rect x="-30" y="-10" width="60" height="20" class="label-bg" />
                    <text x="0" y="1" class="label-text">${label}</text>
                </g>
            ` : ''}

            <!-- 3. Hit Area (顶层 - 确保捕获点击) -->
            <!-- 放在最后渲染，z-index最高，且加宽到 16px -->
            <path d="${pathData}" class="hit-area" stroke-width="16" />
        </svg>
        `;
    }
}

if (!customElements.get('mop-edge')) {
    customElements.define('mop-edge', MoPEdge);
}
