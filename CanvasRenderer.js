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

        // 1. 清空画布 (TODO: 后续优化为 Diff 算法以提高性能)
        this.container.innerHTML = '';
        this.laneMap.clear();

        // 2. 渲染泳道 (Containers)
        if (Array.isArray(graphData.lanes)) {
            graphData.lanes.forEach(laneData => {
                this.renderLane(laneData);
            });
        }

        // 3. 渲染节点 (Atoms)
        if (Array.isArray(graphData.nodes)) {
            graphData.nodes.forEach(nodeData => {
                this.renderNode(nodeData);
            });
        }

        // 4. 渲染连线 (Edges) - 暂时留空，等待 EdgeComponent 就绪
        // if (Array.isArray(graphData.edges)) { ... }
    }

    /**
     * 渲染单个泳道
     */
    renderLane(data) {
        const lane = document.createElement('mop-lane');

        // 设置属性
        lane.setAttribute('id', data.id);
        lane.setAttribute('name', data.name || '未命名泳道');
        lane.setAttribute('width', (data.w || 1000) + 'px');
        lane.setAttribute('height', (data.h || 200) + 'px');
        lane.setAttribute('color', data.color || '#6366f1');

        // 设置绝对定位
        lane.style.position = 'absolute';
        lane.style.top = (data.y || 0) + 'px';
        lane.style.left = (data.x || 0) + 'px';

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
