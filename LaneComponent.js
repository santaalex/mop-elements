/**
 * MoP Lane (泳道) Component
 * 职责：展示横向宽条状泳道，左侧为纵向标题。
 * 隔离理由：封装了复杂的纵向文本排版、Glassmorphism 样式和尺寸同步逻辑。
 */
export class MoPLane extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['name', 'width', 'color', 'height', 'data-selected'];
    }

    connectedCallback() {
        this.render();
        this.setupInteractions();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const name = this.getAttribute('name') || '未命名泳道';
        const width = this.getAttribute('width') || '1000px';
        const height = this.getAttribute('height') || '200px';
        const color = this.getAttribute('color') || '#6366f1';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: absolute;
                    width: ${width};
                    height: ${height};
                    box-sizing: border-box;
                    /* 增加底部内边距，确保虚线边框不会被下一个叠放的泳道完全遮住 */
                    padding-bottom: 2px; 
                    transition: all 0.3s ease;
                }
                
                /* 泳道容器：浅色磨砂玻璃质感 (Premium Light Glass) */
                .lane-container {
                    width: 100%;
                    height: 100%;
                    /* 背景色：极浅的白色带透明度，模拟高级纸张/玻璃 */
                    background: rgba(255, 255, 255, 0.4); 
                    backdrop-filter: blur(12px) saturate(180%); /* 高级毛玻璃 */
                    -webkit-backdrop-filter: blur(12px) saturate(180%);
                    
                    /* 边框设计：工业感深灰色虚线分隔线 */
                    border: 1px solid rgba(0, 0, 0, 0.05); /* 整体虚弱边框 */
                    border-top: 1px solid rgba(255, 255, 255, 0.9); /* 顶部高光保留 */
                    border-bottom: 3px dashed rgba(30, 41, 59, 0.6); /* 更加粗大且深色的虚线 (slate-800, 60% 不透明) */
                    
                    /* 阴影：非常柔和的悬浮感，模仿 Apple 阴影 */
                    box-shadow: 
                        0 4px 6px -1px rgba(0, 0, 0, 0.02),
                        0 10px 15px -3px rgba(0, 0, 0, 0.03),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.5);
                    
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: row; /* 横向排列：左边标题，右边内容 */
                    border-radius: 12px; /* 更圆润的圆角 */
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* 侧边标题栏：固定在左侧，纵向排版 */
                .lane-header {
                    width: 48px; /* 固定宽度 */
                    height: 100%;
                    /* 动态计算背景色：使用传入颜色的极浅版本作为背景 */
                    background: ${color}1a; 
                    /* 右侧分割线 */
                    border-right: 1px solid ${color}33;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    
                    /* 核心：文字纵向排列 */
                    writing-mode: vertical-rl;
                    text-orientation: upright; /* 确保汉字是正的 */
                    
                    /* 字体样式 */
                    color: ${color}; 
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    letter-spacing: 4px;
                    font-weight: 700;
                    user-select: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .lane-header:hover {
                    background: ${color}33;
                }

                /* 内容区域 */
                .lane-content {
                    flex: 1;
                    position: relative;
                    /* 给内容区加一个非常淡的背景区分 */
                    background: linear-gradient(90deg, #fff 0%, rgba(255,255,255,0) 100%);
                }
            </style>

            <div class="lane-container">
                <div class="lane-header">
                    <span>${name}</span>
                </div>
                <div class="lane-content">
                    <slot></slot> <!-- 等后面我们放节点 -->
                </div>
            </div>
        `;

        // 绑定点击事件，向外抛出自定义事件
        const header = this.shadowRoot.querySelector('.lane-header');

        // 核心交互：点击选中
        header.onclick = () => {
            this.dispatchEvent(new CustomEvent('lane-click', {
                detail: { name, width, color },
                bubbles: true,
                composed: true
            }));
        };

        // 核心信号：双击请求重命名 (Atomic Signal)
        header.ondblclick = (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('lane-rename', {
                detail: { name, currentName: name },
                bubbles: true,
                composed: true
            }));
        };
    }

    /**
     * 设置交互逻辑：拖拽反馈 (Drop Zone Feedback)
     * 这是泳道作为容器的核心原子能力
     */
    setupInteractions() {
        const container = this.shadowRoot.querySelector('.lane-container');

        this.addEventListener('dragenter', (e) => {
            e.preventDefault();
            container.style.background = 'rgba(255, 255, 255, 0.8)'; // 高亮
            container.style.boxShadow = `inset 0 0 0 2px ${this.getAttribute('color')}44`;
        });

        this.addEventListener('dragleave', (e) => {
            e.preventDefault();
            // 恢复原状
            container.style.background = 'rgba(255, 255, 255, 0.4)';
            container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.02)';
        });

        // 允许放置
        this.addEventListener('dragover', (e) => e.preventDefault());

        this.addEventListener('drop', (e) => {
            e.preventDefault();
            // 恢复原状
            container.style.background = 'rgba(255, 255, 255, 0.4)';
            container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.02)';

            // 抛出 drop 事件，让上层业务决定怎么移动节点
            this.dispatchEvent(new CustomEvent('lane-drop', {
                detail: { clientX: e.clientX, clientY: e.clientY },
                bubbles: true,
                composed: true
            }));
        });
    }
}

// 注册 Web Component
if (!customElements.get('mop-lane')) {
    customElements.define('mop-lane', MoPLane);
}
