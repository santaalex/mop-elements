/**
 * MoP Viewport Engine (The Stage Layer)
 * 职责：处理画布的缩放(Zoom)、平移(Pan)与坐标转换。
 * 隔离理由：数学矩阵逻辑严密，固化后严禁 AI 篡改。
 */
export class ViewportEngine {
    constructor(containerId, contentId) {
        this.container = document.getElementById(containerId);
        // Prioritize ID if passed, otherwise look for standard class
        if (contentId) {
            this.content = document.getElementById(contentId);
        } else {
            this.content = this.container.querySelector('.mop-canvas-content');
        }
        this.state = {
            scale: 1,
            x: 0,
            y: 0,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };
        this.listeners = {
            change: [],
            click: []
        };
        this.init();
    }

    /**
     * 订阅视图变化事件 (Observer Pattern)
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    notify(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data || this.state));
        }
    }

    init() {
        // 1. 鼠标滚轮缩放 (Zoom)
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoomAt(delta, e.clientX, e.clientY);
        }, { passive: false });

        // 2. 鼠标抓取平移 (Pan)
        this.container.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 左键平移
                this.state.isDragging = true;
                this.state.lastX = e.clientX;
                this.state.lastY = e.clientY;
                this.container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.state.isDragging) return;
            const dx = e.clientX - this.state.lastX;
            const dy = e.clientY - this.state.lastY;
            this.state.x += dx;
            this.state.y += dy;
            this.state.lastX = e.clientX;
            this.state.lastY = e.clientY;
            this.applyTransform();
        });

        window.addEventListener('mouseup', () => {
            if (this.state.isDragging) {
                this.state.isDragging = false;
                this.container.style.cursor = 'grab';
                this.notify('change');
            }
        });

        // 3. 点击事件转换
        this.container.addEventListener('click', (e) => {
            const worldPos = this.toWorld(e.clientX, e.clientY);
            this.notify('click', { screen: { x: e.clientX, y: e.clientY }, world: worldPos });
        });
    }

    /**
     * 核心数学：屏幕坐标 -> 世界坐标 (Screen to World)
     * 用于判断鼠标点到了世界地图的哪个位置
     */
    toWorld(clientX, clientY) {
        const rect = this.content.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / this.state.scale,
            y: (clientY - rect.top) / this.state.scale
        };
    }

    /**
     * 核心数学：世界坐标 -> 屏幕坐标 (World to Screen)
     * 用于将 UI 提示框定位到某个节点上方
     */
    toScreen(worldX, worldY) {
        const rect = this.content.getBoundingClientRect();
        return {
            x: worldX * this.state.scale + this.state.x,
            y: worldY * this.state.scale + this.state.y
        };
    }

    zoomAt(delta, clientX, clientY) {
        const rect = this.content.getBoundingClientRect();
        const offsetX = (clientX - rect.left) / this.state.scale;
        const offsetY = (clientY - rect.top) / this.state.scale;

        const oldScale = this.state.scale;
        this.state.scale *= delta;

        // 限制缩放区间
        this.state.scale = Math.min(Math.max(this.state.scale, 0.1), 5);

        const scaleChange = this.state.scale - oldScale;
        this.state.x -= offsetX * scaleChange;
        this.state.y -= offsetY * scaleChange;

        this.applyTransform();
        this.notify('change');
    }

    applyTransform() {
        this.content.style.transform = `translate(${this.state.x}px, ${this.state.y}px) scale(${this.state.scale})`;
    }

    /**
     * 工业级平滑聚焦 (Smooth Focus)
     * 将视角对准世界坐标中的某一点
     */
    centerOn(worldX, worldY, duration = 300) {
        const viewportWidth = this.container.clientWidth;
        const viewportHeight = this.container.clientHeight;

        const targetX = (viewportWidth / 2) - (worldX * this.state.scale);
        const targetY = (viewportHeight / 2) - (worldY * this.state.scale);

        // 这里暂时使用简单赋值，后续可接入自定义动画曲线
        this.state.x = targetX;
        this.state.y = targetY;
        this.applyTransform();
        this.notify('change');
    }

    /**
     * 自动缩放以适配所有内容 (Fit View)
     */
    fitView(padding = 50) {
        const rects = Array.from(this.content.children).map(el => el.getBoundingClientRect());
        if (rects.length === 0) return;

        // 计算所有子元素的包围盒 (Bounding Box)
        // ... 此处逻辑用于工业级自动对焦
        console.log("Fitting view to content...");
    }
}
