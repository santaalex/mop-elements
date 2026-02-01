import { LayoutConfig } from './LayoutConfig.js';

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

        // 2. 渲染泳道 (Containers) - 采用 LayoutConfig 规则
        if (Array.isArray(graphData.lanes)) {
            // 首先按 order 排序
            const sortedLanes = [...graphData.lanes].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

            let currentY = LayoutConfig.LANE_START_Y;
            const gap = LayoutConfig.LANE_GAP;

            sortedLanes.forEach(laneData => {
                this.renderLane(laneData, currentY);
                // 确保高度被解析为纯数字，防止字符串拼接
                const h = parseFloat(laneData.h) || LayoutConfig.LANE_DEFAULT_HEIGHT;
                currentY = Number(currentY) + h + gap;
            });
        }

        // 3. 渲染节点 (Atoms)
        if (Array.isArray(graphData.nodes)) {
            graphData.nodes.forEach(nodeData => {
                this.renderNode(nodeData);
            });
        }

        // 4. 渲染连线 (Edges)
        if (Array.isArray(graphData.edges)) {
            graphData.edges.forEach(edgeData => {
                this.renderEdge(edgeData);
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
        lane.style.zIndex = '0'; // Ensure lanes are background

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

        if (data.color) node.setAttribute('color', data.color);
        if (data.linkedProjectId) {
            let pid = data.linkedProjectId;
            if (typeof pid === 'object') {
                // Try to salvage
                pid = pid.rowId || pid.id || JSON.stringify(pid);
            }
            node.setAttribute('data-linked', pid);
        }

        // 关键逻辑：层级挂载 (Nesting)
        // 如果节点属于某个泳道，我们把它挂载到泳道内部 (Slots机制 / DOM树结构)
        // 这样拖动泳道时，节点会自动跟随，无需重新计算坐标。
        // 注意：Web Component 的 Slot 机制要求子元素在 Light DOM 中。
        // 解耦逻辑：扁平化渲染 (Flat Rendering)
        // 即使节点属于某个泳道，也将其直接挂载到 mop-canvas-content，避免 Z-Index 堆叠上下文陷阱
        // 这样节点可以自由跨越泳道而不被遮挡。

        const parentId = data.laneId;
        const parentLane = this.laneMap.get(parentId);

        // 计算世界坐标
        let worldX = data.x || 0;
        let worldY = data.y || 0;

        if (parentLane) {
            // 如果有归属泳道，需要加上泳道的偏移量
            // 注意：data.x 是相对于泳道的，但渲染要用绝对坐标
            // parentLane.style.left 是字符串 "100px"，需转换
            const laneX = parseFloat(parentLane.style.left) || 0;
            const laneY = parseFloat(parentLane.style.top) || 0;

            worldX += laneX;
            worldY += laneY;
        }

        // 设置绝对定位 (世界坐标)
        node.style.position = 'absolute';
        node.style.left = worldX + 'px';
        node.style.top = worldY + 'px';
        node.style.zIndex = '100'; // Ensure nodes are always above lanes AND edges

        // 统一挂载到容器顶级
        this.container.appendChild(node);
    }
    /**
     * 渲染单个连线
     */
    renderEdge(data) {
        const edge = document.createElement('mop-edge');

        // 设置属性
        edge.setAttribute('id', data.id);
        edge.setAttribute('points', data.points || '');
        if (data.color) edge.setAttribute('color', data.color);
        if (data.label) edge.setAttribute('label', data.label);
        if (data.labelT !== undefined) edge.setAttribute('label-t', data.labelT);
        if (data.animated) edge.setAttribute('animated', 'true');
        if (data.selected) edge.setAttribute('selected', 'true');

        // 挂载到主画布 (连线总是全局坐标)
        this.container.appendChild(edge);
    }
}
