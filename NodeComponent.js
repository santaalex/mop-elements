/**
 * MoP Node (万能原子节点)
 * 支持 L1 (Process) 和 L2 (BPMN 2.0: Start, End, Activity, Gateway)
 * 渲染技术：Shadow DOM + Inline SVG (确保几何形状精准且文字排版可控)
 */
export class MoPNode extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['type', 'label', 'status', 'kpi', 'selected', 'color', 'width', 'height', 'data-linked'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const type = this.getAttribute('type') || 'activity';
        const label = this.getAttribute('label') || '';
        const status = this.getAttribute('status') || 'normal';
        const kpi = this.getAttribute('kpi') || '';
        const selected = this.hasAttribute('selected');
        const color = this.getAttribute('color') || '#6366f1';
        const isLinked = this.hasAttribute('data-linked') && this.getAttribute('data-linked') !== 'null';


        // 默认尺寸定义
        const sizes = {
            process: { w: 180, h: 80 },
            activity: { w: 160, h: 60 },
            start: { w: 50, h: 50 },
            end: { w: 50, h: 50 },
            xor: { w: 60, h: 60 },
            and: { w: 60, h: 60 },
            or: { w: 60, h: 60 }
        };
        const size = sizes[type] || sizes.activity;
        const w = parseInt(this.getAttribute('width')) || size.w;
        const h = parseInt(this.getAttribute('height')) || size.h;

        const statusColors = {
            normal: '#10b981',
            warning: '#f59e0b',
            critical: '#ef4444'
        };
        const activeColor = statusColors[status] || statusColors.normal;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: absolute;
                    width: ${w}px;
                    height: ${h}px;
                    cursor: pointer;
                    user-select: none;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));
                    transition: transform 0.2s;
                    z-index: 100; /* Ensure Nodes are above Edges */
                }
                :host(:hover) { transform: scale(1.02); }
                
                .node-container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }

                /* 玻璃态样式 */
                .glass-bg {
                    fill: rgba(255, 255, 255, 0.85);
                    stroke: ${selected ? color : 'rgba(0,0,0,0.1)'};
                    stroke-width: ${selected ? 2 : 1};
                }

                .label-text {
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    fill: #1e293b;
                    text-anchor: middle;
                    dominant-baseline: middle;
                }

                .kpi-text {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px;
                    font-weight: 700;
                    fill: #64748b;
                }

                .bulb {
                    fill: ${activeColor};
                    filter: drop-shadow(0 0 4px ${activeColor}aa);
                }

                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                .anim-pulse { animation: pulse 2s infinite ease-in-out; }

                /* --- Ports (Connectors) --- */
                .port {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background: #fff;
                    border: 2px solid #6366f1;
                    border-radius: 50%;
                    cursor: crosshair;
                    z-index: 10;
                    
                    /* High-Star Logic: Opacity controlled by Global Mode */
                    opacity: 0; 
                    /* display: block;  Always layout, just hide visual */
                    
                    transition: opacity 0.2s, transform 0.2s;
                    box-sizing: border-box;
                }
                :host(:hover) .port {
                    /* Only show if Global Mode allows (EDIT=1, VIEW=0) */
                    opacity: var(--port-hover-opacity, 0);
                }
                .port:hover {
                    transform: translate(-50%, -50%) scale(1.3);
                    background: #6366f1; /* Active State */
                }

                /* Positioning */
                .port-n { left: 50%; top: 0; transform: translate(-50%, -50%); }
                .port-e { left: 100%; top: 50%; transform: translate(-50%, -50%); }
                .port-s { left: 50%; top: 100%; transform: translate(-50%, -50%); }
                .port-w { left: 0; top: 50%; transform: translate(-50%, -50%); }
            </style>

            <div class="node-container">
                <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
                    ${this.getTemplate(type, w, h, color, label, kpi, isLinked)}
                </svg>
                
                <!-- Ports -->
                <div class="port port-n" data-port="top"></div>
                <div class="port port-e" data-port="right"></div>
                <div class="port port-s" data-port="bottom"></div>
                <div class="port port-w" data-port="left"></div>
            </div>
        `;
    }

    getTemplate(type, w, h, color, label, kpi, isLinked) {
        // 核心形状工厂
        switch (type) {
            case 'process':
                // Icon Logic: If Linked -> Arrow, If Not -> Plus
                const iconPath = isLinked
                    ? 'M6 9 h12 M13 4 l5 5 l-5 5' // Arrow Right
                    : 'M7 9 h10 M12 4 v10'; // Plus

                const iconColor = isLinked ? '#4f46e5' : '#94a3b8'; // Indigo vs Slate

                return `
                    <rect x="0" y="0" width="${w}" height="${h}" rx="10" class="glass-bg" />
                    <rect x="0" y="0" width="${w}" height="4" rx="2" fill="${color}" opacity="0.8" />
                    <text x="${w / 2}" y="${h / 2 - 5}" class="label-text">${label}</text>
                    <!-- 下钻标识：动态 Plus/Link -->
                    <g transform="translate(${w / 2 - 12}, ${h - 18})">
                        <rect width="24" height="18" rx="4" fill="white" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
                        <path d="${iconPath}" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </g>
                    ${this.renderBulb(w - 20, 15, kpi)}
                `;

            case 'start':
                return `
                    <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 2}" class="glass-bg" stroke-dasharray="0" />
                    <text x="${w / 2}" y="${h + 15}" class="label-text" style="font-size:11px">${label}</text>
                `;

            case 'end':
                return `
                    <!-- 底层：纯白背景遮挡线 -->
                    <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 3}" fill="white" />
                    <!-- 顶层：纯描边 (4px) -->
                    <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 3}" 
                            fill="none" 
                            stroke="#1e293b" 
                            stroke-width="4" />
                    <text x="${w / 2}" y="${h + 15}" class="label-text" style="font-size:11px">${label}</text>
                `;

            case 'xor':
            case 'and':
            case 'or':
                const icon = type === 'xor' ? 'M-6,-6 L6,6 M6,-6 L-6,6' : type === 'and' ? 'M-8,0 L8,0 M0,-8 L0,8' : 'M0,0 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0';
                return `
                    <path d="M${w / 2},2 L${w - 2},${h / 2} L${w / 2},${h - 2} L2,${h / 2} Z" class="glass-bg" />
                    <g transform="translate(${w / 2}, ${h / 2})">
                        <path d="${icon}" stroke="#1e293b" stroke-width="2.5" fill="none" />
                    </g>
                    <text x="${w / 2}" y="${h + 15}" class="label-text" style="font-size:11px">${label}</text>
                `;

            default: // activity
                return `
                    <rect x="0" y="0" width="${w}" height="${h}" rx="8" class="glass-bg" />
                    <!-- <rect x="0" y="0" width="4" height="${h}" rx="2" fill="${color}" /> -->
                    <text x="${w / 2}" y="${h / 2}" class="label-text">${label}</text>
                    ${this.renderBulb(w - 15, 10, kpi)}
                `;
        }
    }

    renderBulb(x, y, kpi) {
        if (!kpi) return '';
        return `
            <g transform="translate(${x}, ${y})">
                <circle r="4" class="bulb anim-pulse" />
                <text x="-8" y="4" class="kpi-text" text-anchor="end">${kpi}</text>
            </g>
        `;
    }

    /**
     * 连线接口 (Connection Interface)
     * 返回 4 个标准锚点的世界坐标（相对于组件左上角）
     * 供壳子 (Shell) 计算正交连线使用
     */
    getAnchors() {
        const w = this.offsetWidth;
        const h = this.offsetHeight;
        // Direction vectors for Manhattan routing: 
        // [1,0] = Right, [-1,0] = Left, [0,1] = Bottom, [0,-1] = Top
        return {
            top: { x: w / 2, y: 0, dir: [0, -1] },
            right: { x: w, y: h / 2, dir: [1, 0] },
            bottom: { x: w / 2, y: h, dir: [0, 1] },
            left: { x: 0, y: h / 2, dir: [-1, 0] },
            center: { x: w / 2, y: h / 2, dir: [0, 0] }
        };
    }
}

if (!customElements.get('mop-node')) {
    customElements.define('mop-node', MoPNode);
}
