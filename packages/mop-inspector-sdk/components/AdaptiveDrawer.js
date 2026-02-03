/**
 * AdaptiveDrawer.js
 * 
 * 自适应抽屉组件 - 根据屏幕尺寸自动切换 Bottom Sheet (桌面) / Modal (移动)
 * Adaptive Drawer Component - Auto-switches between Bottom Sheet (desktop) / Modal (mobile)
 * 
 * 架构设计参考 (Architecture Reference):
 * - Material Design 3: Bottom Sheet for supplementary content
 * - Ant Design: Multi-level drawer stacking (Z-Index management)
 * - Figma: Layered panel system
 * 
 * 核心原则 (Core Principles):
 * - Single Responsibility: 只负责渲染和动画，不处理业务逻辑
 * - Separation of Concerns: 内容由外部传入 (children)
 * - Responsive: 自动适配桌面/移动端
 */

export class AdaptiveDrawer {
    /**
     * @param {Object} options
     * @param {'auto'|'bottom'|'modal'} [options.mode='auto'] - 渲染模式
     * @param {string|HTMLElement} options.content - 抽屉内容 (HTML 字符串或 DOM 元素)
     * @param {string} [options.title=''] - 标题
     * @param {Function} [options.onClose] - 关闭回调
     * @param {boolean} [options.closeOnMaskClick=true] - 点击遮罩关闭
     * @param {boolean} [options.closeOnEsc=true] - Esc 键关闭
     * 
     * 注意: Z-Index 由 CSS 变量控制 (--z-drawer, --z-modal)，不再通过参数传入
     */
    constructor({
        mode = 'auto',
        content,
        title = '',
        onClose,
        closeOnMaskClick = true,
        closeOnEsc = true
    }) {
        this.mode = mode;
        this.content = content;
        this.title = title;
        this.onClose = onClose;
        this.closeOnMaskClick = closeOnMaskClick;
        this.closeOnEsc = closeOnEsc;

        // 自动检测设备类型
        this.isMobile = window.innerWidth < 768; // Tailwind 'md' breakpoint

        // DOM 引用
        this.container = null;
        this.mask = null;
    }

    /**
     * 打开抽屉 / Open Drawer
     * @public
     */
    open() {
        if (this.container) {
            console.warn('[AdaptiveDrawer] Already open, ignoring...');
            return;
        }

        console.log(`[AdaptiveDrawer] Opening (Mode: ${this.getEffectiveMode()}, Mobile: ${this.isMobile})`);
        this.render();
        this.bindEvents();
        this.animateIn();
    }

    /**
     * 关闭抽屉 / Close Drawer
     * @public
     */
    close() {
        if (!this.container) return;

        console.log('[AdaptiveDrawer] Closing...');
        this.animateOut(() => {
            this.destroy();
            if (this.onClose) this.onClose();
        });
    }

    /**
     * 销毁抽屉 / Destroy Drawer
     * @public
     */
    destroy() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        this.mask?.remove();
        this.container?.remove();
        this.mask = null;
        this.container = null;
        console.log('[AdaptiveDrawer] Destroyed');
    }

    /**
     * 获取实际渲染模式 / Get Effective Mode
     * @private
     * @returns {'bottom'|'modal'}
     */
    getEffectiveMode() {
        if (this.mode === 'auto') {
            return this.isMobile ? 'modal' : 'bottom';
        }
        return this.mode;
    }

    /**
     * 渲染 DOM / Render DOM
     * @private
     */
    render() {
        const effectiveMode = this.getEffectiveMode();

        if (effectiveMode === 'bottom') {
            this.renderBottomSheet();
        } else {
            this.renderModal();
        }
    }

    /**
     * 渲染底部滑出面板 (桌面端) / Render Bottom Sheet (Desktop)
     * @private
     */
    renderBottomSheet() {
        // 1. 创建半透明遮罩 (轻度，不阻挡视线)
        this.mask = document.createElement('div');
        this.mask.className = 'fixed inset-0 bg-black/10 transition-opacity duration-300 opacity-0 z-[calc(var(--z-drawer)-1)]';
        document.body.appendChild(this.mask);

        // 2. 创建 Bottom Sheet
        this.container = document.createElement('div');
        this.container.className = 'fixed bottom-0 left-0 bg-white shadow-2xl border-t border-slate-200 transform transition-transform duration-300 translate-y-full rounded-t-2xl z-[var(--z-drawer)]';

        // 关键：留出右侧 RightSidebar 的空间 (384px = w-96)
        if (!this.isMobile) {
            this.container.style.width = 'calc(100% - 384px)';
            this.container.style.height = '85vh'; // ✅ 增加到85vh以容纳currentValue字段
            this.container.style.maxHeight = '85vh';
            this.container.style.minHeight = '500px';
        } else {
            this.container.style.width = '100%';
            this.container.style.height = '85vh';
        }

        this.container.innerHTML = `
            <div class="h-full flex flex-col">
                <!-- Header -->
                <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                    <div class="flex items-center gap-3">
                        <div class="w-1 h-6 bg-indigo-600 rounded-full"></div>
                        <h3 class="text-lg font-bold text-slate-800">${this.title}</h3>
                    </div>
                    <button class="close-btn text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-6" id="adaptive-drawer-content">
                    <!-- Content will be inserted here -->
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        // 插入内容
        const contentContainer = this.container.querySelector('#adaptive-drawer-content');
        if (typeof this.content === 'string') {
            contentContainer.innerHTML = this.content;
        } else if (this.content instanceof HTMLElement) {
            contentContainer.appendChild(this.content);
        }
    }

    /**
     * 渲染全屏模态 (移动端) / Render Modal (Mobile)
     * @private
     */
    renderModal() {
        // 1. 创建遮罩
        this.mask = document.createElement('div');
        this.mask.className = 'fixed inset-0 bg-black/60 transition-opacity duration-300 opacity-0 flex items-center justify-center z-[var(--z-modal)]';

        // 2. 创建 Modal
        this.container = document.createElement('div');
        this.container.className = 'bg-white rounded-xl shadow-2xl w-[90%] max-w-md max-h-[80vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0';

        this.container.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- Header -->
                <div class="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                    <h3 class="text-lg font-bold text-slate-800">${this.title}</h3>
                    <button class="close-btn text-slate-400 hover:text-slate-600 transition-colors p-1">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-6" id="adaptive-drawer-content">
                    <!-- Content will be inserted here -->
                </div>
            </div>
        `;

        this.mask.appendChild(this.container);
        document.body.appendChild(this.mask);

        // 插入内容
        const contentContainer = this.container.querySelector('#adaptive-drawer-content');
        if (typeof this.content === 'string') {
            contentContainer.innerHTML = this.content;
        } else if (this.content instanceof HTMLElement) {
            contentContainer.appendChild(this.content);
        }
    }

    /**
     * 绑定事件 / Bind Events
     * @private
     */
    bindEvents() {
        // 1. 关闭按钮
        const closeBtn = this.container.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => this.close();
        }

        // 2. 点击遮罩关闭 (仅 Modal 模式或启用时)
        if (this.closeOnMaskClick && this.mask) {
            this.mask.addEventListener('click', (e) => {
                // 只有点击遮罩本身才关闭，点击内容不关闭
                if (e.target === this.mask) {
                    this.close();
                }
            });
        }

        // 3. Esc 键关闭
        if (this.closeOnEsc) {
            this.keydownHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.keydownHandler);
        }
    }

    /**
     * 滑入动画 / Animate In
     * @private
     */
    animateIn() {
        const effectiveMode = this.getEffectiveMode();

        // 使用 requestAnimationFrame 确保 DOM 已渲染
        requestAnimationFrame(() => {
            if (effectiveMode === 'bottom') {
                // Bottom Sheet: 从下往上滑入
                this.mask.classList.remove('opacity-0');
                this.container.classList.remove('translate-y-full');
            } else {
                // Modal: 淡入 + 缩放
                this.mask.classList.remove('opacity-0');
                this.container.classList.remove('scale-95', 'opacity-0');
            }
        });
    }

    /**
     * 滑出动画 / Animate Out
     * @private
     * @param {Function} callback - 动画完成后的回调
     */
    animateOut(callback) {
        const effectiveMode = this.getEffectiveMode();

        if (effectiveMode === 'bottom') {
            // Bottom Sheet: 从上往下滑出
            this.mask.classList.add('opacity-0');
            this.container.classList.add('translate-y-full');
        } else {
            // Modal: 淡出 + 缩放
            this.mask.classList.add('opacity-0');
            this.container.classList.add('scale-95', 'opacity-0');
        }

        // 等待动画完成 (300ms)
        setTimeout(callback, 300);
    }
}
