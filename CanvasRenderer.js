/**
 * CanvasRenderer (The Painter)
 * 职责：将纯 JSON 数据转换为 DOM 元素并渲染到画布上。
 * 模式：Presenter (只负责画，不负责业务逻辑)
 */
export class CanvasRenderer {
    /**
     * @param {HTMLElement} container - mop-canvas-content 容器
     */
    constructor(container) {
        if (!container) throw new Error('CanvasRenderer requires a container element');
        this.container = container;
        this.laneMap = new Map(); // 缓存 Lane 实例，方便节点挂载
    }

    /**
     * 核心渲染方法
     * @param {Object} graphData - { lanes: [], nodes: [], edges: [] }
     */
    render(graphData) {
        if (!graphData) return;

        // 1. 清空画布
        this.container.innerHTML = '';
        this.laneMap.clear();

        // 2. 渲染泳道 (Containers) - 采用 Virtual Flex 堆叠逻辑
        if (Array.isArray(graphData.lanes)) {
            // 首先按 order 排序，如果没有 order 则按数组顺序
            const sortedLanes = [...graphData.lanes].sort((a, b) => (a.order || 0) - (b.order || 0));

            let currentY = 100; // 顶层起始偏移
            const gap = 10;     // 工业级标准间距

            sortedLanes.forEach(laneData => {
                this.renderLane(laneData, currentY);
                // 自动推算下一个泳道的起点 (确保使用浮点数，默认 220)
                const h = parseFloat(laneData.h) || 220;
                currentY += h + gap;
            });
        }

        // 3. 渲染节点 (Atoms)
        if (Array.isArray(graphData.nodes)) {
            graphData.nodes.forEach(nodeData => {
                this.renderNode(nodeData);
            });
        }
    }

    /**
     * 渲染单个泳道
     * @param {Object} data - 泳道数据
     * @param {number} computedY - 由布局引擎计算出的 Y 坐标
     */
    renderLane(data, computedY) {
        const lane = document.createElement('mop-lane');

        // 设置属性
        lane.setAttribute('id', data.id);
        lane.setAttribute('name', data.name || '未命名泳道');
        lane.setAttribute('width', (data.w || 1200) + 'px');
        lane.setAttribute('height', (parseFloat(data.h) || 220) + 'px');
        lane.setAttribute('color', data.color || '#6366f1');

        // 设置绝对定位 (使用计算出的 Y，忽略原始 Y)
        lane.style.position = 'absolute';
        lane.style.top = computedY + 'px';
        lane.style.left = (data.x || 100) + 'px';

        // 挂载
        this.container.appendChild(lane);
        this.laneMap.set(data.id, lane);
    }

    /**
     * 渲染单个节点
     */
    renderNode(data) {
        const node = document.createElement('mop-node');

        // 设置属性
        node.setAttribute('id', data.id);
        node.setAttribute('type', data.type || 'activity'); // process, start, end, etc.
        node.setAttribute('label', data.label || '新建节点');

        if (data.status) node.setAttribute('status', data.status);
        if (data.kpi) node.setAttribute('kpi', data.kpi);
        if (data.color) node.setAttribute('color', data.color);

        // 关键逻辑：层级挂载 (Nesting)
        // 如果节点属于某个泳道，我们把它挂载到泳道内部 (Slots机制 / DOM树结构)
        // 这样拖动泳道时，节点会自动跟随，无需重新计算坐标。
        // 注意：Web Component 的 Slot 机制要求子元素在 Light DOM 中。
        const parentId = data.laneId;
        const parentLane = this.laneMap.get(parentId);

        if (parentLane) {
            // 相对定位 (相对于泳道左上角)
            node.style.position = 'absolute'; // 确保在 Slot 内也是 absolute
            node.style.top = (data.y || 10) + 'px'; // 这里的 y 是泳道内的相对坐标
            node.style.left = (data.x || 10) + 'px';
            parentLane.appendChild(node);
        } else {
            // 兜底：没有归属泳道的节点，直接挂载到画布 (绝对世界坐标)
            node.style.position = 'absolute';
            node.style.top = (data.y || 0) + 'px';
            node.style.left = (data.x || 0) + 'px';
            this.container.appendChild(node);
        }
    }
}
