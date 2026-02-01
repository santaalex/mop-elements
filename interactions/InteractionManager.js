import { InteractionState } from './InteractionState.js';
import { HitTest } from 'mop-interaction-sdk';
import { NodeDragStrategy } from 'mop-drag-sdk';
import { SelectionStrategy } from 'mop-selection-strategy';
import { EditingStrategy } from 'mop-editing-strategy';
import { ConnectionStrategy } from './strategies/ConnectionStrategy.js';

/**
 * InteractionManager (The Shell Controller)
 * ...
 */
export class InteractionManager {
    constructor(editorView) {
        this.editorView = editorView;
        this.container = editorView.container;
        this.state = InteractionState.IDLE;

        // --- Phase 1: Mode Manager ---
        // 'VIEW' | 'EDIT'
        // Default to VIEW for safety, User/Parent will switch to EDIT
        this.mode = 'VIEW';

        // Strategy Registry
        this.strategies = {
            nodeDrag: new NodeDragStrategy(this),
            selection: new SelectionStrategy(this),
            editing: new EditingStrategy(this),
            connection: new ConnectionStrategy(this)
        };

        this._strategyList = [
            // Order matters for "CanHandle" checks
            this.strategies.connection,
            this.strategies.nodeDrag, // High priority (Shift+Click handled internally)
            this.strategies.editing,  // Double Click / specialized
            this.strategies.selection // Fallback for box selection / click
        ];

        this.activeStrategy = null;
        this.currentDraggedNodeId = null;

        // Event Emitter (Simple)
        this.listeners = {};

        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        this.boundDoubleClick = this.handleDoubleClick.bind(this);


        this.init();
        this.setupKeyboard();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            // Only trigger if not typing in an input/textarea
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const selection = this.editorView.selection;
                if (selection.size > 0) {
                    const ids = [...selection];
                    const msg = ids.length === 1 ? 'this item' : `${ids.length} items`;
                    if (confirm(`Delete ${msg}?`)) {
                        ids.forEach(id => this.editorView.deleteNode(id));
                    }
                }
            }
        });
    }

    setMode(mode) {
        if (mode !== 'VIEW' && mode !== 'EDIT') {
            console.warn(`[InteractionManager] Invalid Mode: ${mode}`);
            return;
        }
        this.mode = mode;
        console.log(`[InteractionManager] Switched to Mode: ${mode}`);

        // UX: Clear selection on mode switch to avoid ghost gizmos
        this.editorView.selection.clear();
        if (this.editorView.gizmoRenderer) {
            this.editorView.gizmoRenderer.render(new Set());
        }
        // Force visual update to remove attributes from DOM
        this.editorView.updateSelectionVisuals();

        // Notify Listeners (for UI updates)
        this.emit('mode:change', mode);

        // CSS Variable Injection (Global Scope)
        // VIEW -> 0, EDIT -> 1 (Used by mop-node:hover)
        document.documentElement.style.setProperty('--port-hover-opacity', mode === 'EDIT' ? '1' : '0');
    }

    init() {
        console.log('[InteractionManager] Initializing atoms...');

        // Default to VIEW mode visibility (Closed)
        document.documentElement.style.setProperty('--port-hover-opacity', '0');

        // --- Event Emitter API ---
        this.on = (event, fn) => {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(fn);
        };

        this.off = (event, fn) => {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter(l => l !== fn);
        };

        this.emit = (event, payload) => {
            if (this.listeners[event]) {
                this.listeners[event].forEach(fn => fn(payload));
            }
        };

        // We listen on WINDOW for move/up to capture drags that go outside
        // We listen on Container/Scene for mousedown

        this.container.addEventListener('mousedown', this.boundMouseDown);
        this.container.addEventListener('dblclick', this.boundDoubleClick);
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mouseup', this.boundMouseUp);

        // DEBUG: Trace Double Click
        window.addEventListener('dblclick', (e) => {
            console.log('[Global Debug] Window Capture DblClick. Target:', e.target);
            // check path
            // console.log('Path:', e.composedPath());
        }, true); // Capture phase
    }

    // ... destroy() needs update too, but skipping for brevity of chunk

    handleDoubleClick(e) {
        // 1. Omni-Directional Analysis via SDK
        const result = HitTest.analyze(e.clientX, e.clientY, e.composedPath());

        // Structured Logging (User Request - Chinese, Flat & Visible)
        const modeName = this.mode === 'EDIT' ? '编辑模式 (EDIT)' : '浏览模式 (VIEW)';

        if (result.bestTarget) {
            const { type, id } = result.bestTarget;
            const typeName = type === 'node' ? '节点' : (type === 'edge' ? '连线' : '泳道');
            const logColor = this.mode === 'EDIT' ? '#aa00aa' : '#00aaaa';

            console.log(`%c[用户交互] 对象: ${typeName} #${id}, 动作: 双击, 状态: ${modeName}`, `color: ${logColor}; font-weight: bold;`);

            // --- VIEW MODE GUARD ---
            if (this.mode === 'VIEW') {
                if (type === 'node') {
                    console.log(`[交互管理器] 浏览模式触发: 节点下钻 (DrillDown) -> ${id}`);
                    this.emit('node:dblclick', { id, nativeEvent: e });
                    return;
                }
                console.log(`[交互管理器] 🛑 浏览模式下忽略双击 (${type})`);
            }

            // --- EDIT MODE LOGIC ---
            if (this.mode === 'EDIT') {
                console.log(`[交互管理器] ✅ 激活编辑策略: ${type}`);

                // 1. Lane Header
                if (type === 'lane') {
                    this.activateStrategy(this.strategies.editing, { type: 'lane', id });
                }
                // 2. Node
                else if (type === 'node') {
                    this.activateStrategy(this.strategies.editing, id);
                }
                // 3. Edge
                else if (type === 'edge') {
                    const { t } = result.bestTarget; // Use the T from HitTest result
                    this.activateStrategy(this.strategies.editing, { type: 'edge', id, t });
                }
            }
        } else {
            console.log(`%c[用户交互] 对象: 画布 (空白), 动作: 双击, 状态: ${modeName}`, 'color: #888;');
        }
    }

    /**
     * 高星最佳实践：路径坐标投影算法 (Path Projection)
     * 计算鼠标点击点距离 SVG 路径最近的比例 T (0.0 - 1.0)
     */
    getEdgeTValue(edgeEl, event) {
        const svgPath = edgeEl.shadowRoot.querySelector('.path-line');
        if (!svgPath || !svgPath.getPointAtLength) return 0.5;

        // Convert mouse screen space to SVG space
        const svg = edgeEl.shadowRoot.querySelector('svg');
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

        // Approximation: Sample 100 points along the path to find the closest T
        const totalLength = svgPath.getTotalLength();
        let minDistance = Infinity;
        let bestT = 0.5;
        const samples = 100;

        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const p = svgPath.getPointAtLength(t * totalLength);
            const dist = Math.hypot(p.x - svgPt.x, p.y - svgPt.y);
            if (dist < minDistance) {
                minDistance = dist;
                bestT = t;
            }
        }
        return bestT;
    }

    /**
     * Specialized activation for Editing (takes payload)
     * Overloading activateStrategy logic
     */
    activateStrategy(strategy, eventOrPayload) {
        this.activeStrategy = strategy;

        // If it's a double-click payload (string ID), use ACTIVE state
        // If it's a mouse event, use DRAGGING state
        if (typeof eventOrPayload === 'string') {
            this.state = InteractionState.ACTIVE;
        } else {
            this.state = InteractionState.DRAGGING;

            // Capture Node ID for implicit drag tracking
            if (strategy.name === 'node-drag') {
                // High-Star Best Practice: Use HitTest Semantic Resolution
                // If the event target is obscured (e.g. by Edge), composedPath might fail.
                // We re-verify using HitTest logic.
                const e = eventOrPayload;
                const result = HitTest.analyze(e.clientX, e.clientY, e.composedPath());

                // Prioritize the Node found by HitTest
                const nodeEl = result.node;

                if (nodeEl) {
                    this.currentDraggedNodeId = nodeEl.getAttribute('id');
                }
            }
        }

        strategy.activate(eventOrPayload);
    }

    destroy() {
        console.log('[InteractionManager] Destroying atoms...');
        this.container.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mouseup', this.boundMouseUp);
    }

    // --- Interaction Handlers ---

    handleMouseDown(e) {
        if (this.state !== InteractionState.IDLE) return;

        if (this.editorView.viewport && this.editorView.viewport.state.isSpacePressed) {
            console.log('[InteractionManager] Yielding to Viewport Panning (Space Held)');
            return;
        }

        // --- UI Protection Guard ---
        // If clicking on Toolbar or Breadcrumbs, do not trigger Canvas interactions (like switching selection)
        if (e.composedPath().some(el => el.classList && (el.classList.contains('toolbar') || el.id === 'breadcrumb-bar'))) {
            // console.log('[InteractionManager] Ignoring UI Click');
            return;
        }

        // --- Phase 1: Semantic Omniscience (HitTest as Truth) ---
        const result = HitTest.analyze(e.clientX, e.clientY, e.composedPath());

        let semanticTarget = e.target; // Default Fallback

        if (result.bestTarget) {
            // Structured Logging (User Request)
            const logColor = this.mode === 'EDIT' ? '#aa00aa' : '#00aaaa';
            const modeName = this.mode === 'EDIT' ? '编辑模式 (EDIT)' : '浏览模式 (VIEW)';
            const typeName = result.bestTarget.type === 'node' ? '节点' : (result.bestTarget.type === 'edge' ? '连线' : '泳道');

            console.log(`%c[用户交互] 对象: ${typeName}, 动作: 点击, 状态: ${modeName}`, `color: ${logColor}; font-weight: bold;`);

            semanticTarget = result.bestTarget.element;
            // Optionally attach metadata to event for strategies to read
            e.semanticType = result.bestTarget.type;
            e.semanticId = result.bestTarget.id;

            // --- Phase 2: View Mode Logic ---
            // If in VIEW mode, we primarily emit events and BLOCK physics strategies (except Hover/Select if needed)
            if (this.mode === 'VIEW') {
                if (e.semanticType === 'node') {
                    console.log(`[交互管理器] 浏览模式触发: 节点点击 (Node Click) -> ${e.semanticId}`);
                    this.emit('node:click', { id: e.semanticId, nativeEvent: e });
                    return; // STOP! Do not convert to Drag in View Mode
                }
            }

        } else {
            const modeName = this.mode === 'EDIT' ? '编辑模式 (EDIT)' : '浏览模式 (VIEW)';
            console.log(`%c[用户交互] 对象: 画布 (空白), 动作: 点击, 状态: ${modeName}`, 'color: #888;');
        }

        // Edit Mode Protection (or if strategy allows View mode)
        if (this.mode === 'VIEW') {
            console.log('[交互管理器] 🛑 浏览模式下禁用操作 (Blocked Physics)');
            return;
        }

        for (const strategy of this._strategyList) {
            // We pass the semanticTarget to allow strategies to recognize obscured elements
            if (strategy.canHandle(e, semanticTarget)) {
                console.log(`[交互管理器] ✅ 激活策略: ${strategy.name}`);
                this.activateStrategy(strategy, e);
                e.stopPropagation();
                return;
            }
        }
    }

    handleMouseMove(e) {
        if (this.activeStrategy) {
            this.activeStrategy.onMove(e);

            if (this.editorView.gizmoRenderer) {
                this.editorView.gizmoRenderer.render(this.editorView.selection);
            }

            if (this.activeStrategy.name === 'node-drag') {
                this.editorView.selection.forEach(nodeId => {
                    this.editorView.updateConnectedEdges(nodeId);
                });

                if (this.currentDraggedNodeId && !this.editorView.selection.has(this.currentDraggedNodeId)) {
                    this.editorView.updateConnectedEdges(this.currentDraggedNodeId);
                }
            }
        }
    }

    handleMouseUp(e) {
        if (this.activeStrategy) {
            this.activeStrategy.onEnd(e);
            this.deactivateStrategy();
        }
        this.currentDraggedNodeId = null;
    }

    deactivateStrategy() {
        if (this.activeStrategy) {
            this.activeStrategy.deactivate();
        }
        this.activeStrategy = null;
        this.state = InteractionState.IDLE;
    }
}
