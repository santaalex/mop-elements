/**
 * MetricFormDrawer.js
 * 
 * 业务组件 - 组合 AdaptiveDrawer + MetricForm
 * Business Component - Composes AdaptiveDrawer + MetricForm
 * 
 * 架构模式 (Architecture Pattern):
 * - Composition over Inheritance (组合优于继承)
 * - Adapter Pattern (适配器模式)
 * - Single Responsibility (单一职责)
 * 
 * 高星项目参考 (High-Star Reference):
 * - Ant Design: Modal + Form 组合模式
 * - Material-UI: Dialog wrapper components
 * - GitHub: Composable UI patterns
 */

import { AdaptiveDrawer } from './AdaptiveDrawer.js';
import { MetricForm } from './MetricForm.js';

export class MetricFormDrawer {
    /**
     * @param {Object} options
     * @param {Object|null} [options.initialMetric=null] - 初始 Metric 数据 (null = 新建)
     * @param {Function} options.onSave - 保存回调 (metric) => void
     * @param {Function} [options.onCancel] - 取消回调 () => void
     * @param {string} [options.title] - 自定义标题 (默认根据 initialMetric 自动判断)
     * @param {'auto'|'bottom'|'modal'} [options.mode='auto'] - 渲染模式
     */
    constructor({
        initialMetric = null,
        onSave,
        onCancel,
        title,
        mode = 'auto'
    }) {
        // Validation (高星项目最佳实践：Early validation)
        if (!onSave || typeof onSave !== 'function') {
            throw new Error('[MetricFormDrawer] onSave callback is required and must be a function');
        }

        this.initialMetric = initialMetric;
        this.onSave = onSave;
        this.onCancel = onCancel;
        this.mode = mode;

        // 自动判断标题
        this.title = title || (initialMetric ? 'Edit Metric' : 'Define Metric');

        // 内部组件引用
        this.drawer = null;
        this.form = null;
    }

    /**
     * 打开抽屉 / Open Drawer
     * @public
     */
    open() {
        if (this.drawer) {
            console.warn('[MetricFormDrawer] Already open, ignoring...');
            return;
        }

        console.log(`[MetricFormDrawer] Opening (Mode: ${this.mode})`);
        this.render();
    }

    /**
     * 关闭抽屉 / Close Drawer
     * @public
     */
    close() {
        if (this.drawer) {
            this.drawer.close();
        }
    }

    /**
     * 渲染组件 / Render Component
     * @private
     */
    render() {
        // 1. 创建 MetricForm 实例并渲染
        this.form = new MetricForm({
            initialMetric: this.initialMetric,
            onSubmit: (metric) => {
                // ✅ 先验证，再提交 (High-Star Best Practice: Guard Clause)
                if (!this.validateMetric(metric)) {
                    return; // 验证失败，阻止提交
                }
                this.handleSubmit(metric);
            },
            onCancel: () => this.handleCancel()
        });

        // 2. MetricForm.render() 返回 DOM 元素，直接使用
        const formElement = this.form.render();

        // 3. 创建 AdaptiveDrawer，直接传入 DOM 元素
        this.drawer = new AdaptiveDrawer({
            mode: this.mode,
            title: this.title,
            content: formElement,
            closeOnMaskClick: false, // 防止误触丢失表单数据
            closeOnEsc: true,
            onClose: () => this.handleDrawerClose()
        });

        // 4. 打开 Drawer
        this.drawer.open();
    }

    /**
     * 绑定表单事件 / Bind Form Events
     * @private
     */
    bindFormEvents() {
        const formElement = this.drawer.container.querySelector('form');
        if (!formElement) {
            console.error('[MetricFormDrawer] Form element not found in drawer');
            return;
        }

        // 表单提交
        formElement.onsubmit = (e) => {
            e.preventDefault();

            // 收集表单数据
            const formData = new FormData(formElement);
            const metric = {
                name: formData.get('name')?.trim() || '',
                direction: formData.get('direction') || 'higher',
                targetValue: parseFloat(formData.get('targetValue')) || 0,
                currentValue: formData.get('currentValue') ? parseFloat(formData.get('currentValue')) : null,  // ✅ 新增
                unit: formData.get('unit')?.trim() || '%',
                warningThreshold: parseFloat(formData.get('warningThreshold')) || 0
            };

            // 验证
            if (!this.validateMetric(metric)) {
                return;
            }

            this.handleSubmit(metric);
        };

        // 取消按钮
        const cancelBtn = formElement.querySelector('button[type="button"]');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.handleCancel();
        }
    }

    /**
     * 验证 Metric 数据 / Validate Metric
     * @private
     * @param {Object} metric
     * @returns {boolean}
     */
    validateMetric(metric) {
        // 基础验证
        if (!metric.name || metric.name.trim() === '') {
            alert('⚠️ Metric Name is required / 指标名称不能为空');
            return false;
        }

        if (metric.targetValue === 0 || !metric.targetValue) {
            alert('⚠️ Target Value must be greater than 0 / 目标值必须大于 0');
            return false;
        }

        if (metric.warningThreshold === 0 || !metric.warningThreshold) {
            alert('⚠️ Warning Threshold must be greater than 0 / 警戒值必须大于 0');
            return false;
        }

        // 统一 direction 格式 (兼容 SDK 格式和简单格式)
        const direction = metric.direction === 'HigherBetter' || metric.direction === 'higher' ? 'higher' : 'lower';

        // 逻辑验证 (高星项目最佳实践：业务规则验证)
        if (direction === 'higher' && metric.warningThreshold >= metric.targetValue) {
            alert('⚠️ For "Higher is Better", Warning must be < Target / "越高越好"模式下，警戒值应小于目标值');
            return false;
        }

        if (direction === 'lower' && metric.warningThreshold <= metric.targetValue) {
            alert('⚠️ For "Lower is Better", Warning must be > Target / "越低越好"模式下，警戒值应大于目标值');
            return false;
        }

        return true;
    }

    /**
     * 处理表单提交 / Handle Submit
     * @private
     * @param {Object} metric
     */
    handleSubmit(metric) {
        console.log('[MetricFormDrawer] Submitting metric:', metric);

        try {
            // 调用外部回调
            this.onSave(metric);

            // 关闭抽屉
            this.close();
        } catch (error) {
            console.error('[MetricFormDrawer] Error in onSave callback:', error);
            alert('❌ Failed to save metric / 保存失败');
        }
    }

    /**
     * 处理取消 / Handle Cancel
     * @private
     */
    handleCancel() {
        console.log('[MetricFormDrawer] Cancelled');

        // 确认丢弃更改 (可选，防止误操作)
        const formElement = this.drawer.container.querySelector('form');
        const hasChanges = formElement && this.hasFormChanges(formElement);

        if (hasChanges) {
            const confirmed = confirm('⚠️ Discard changes? / 确定放弃更改？');
            if (!confirmed) {
                return;
            }
        }

        // 调用外部回调
        if (this.onCancel) {
            this.onCancel();
        }

        // 关闭抽屉
        this.close();
    }

    /**
     * 检查表单是否有更改 / Check if form has changes
     * @private
     * @param {HTMLFormElement} formElement
     * @returns {boolean}
     */
    hasFormChanges(formElement) {
        // 简化版：检查任何输入是否有值
        const inputs = formElement.querySelectorAll('input, select, textarea');
        for (const input of inputs) {
            if (input.value && input.value.trim()) {
                return true;
            }
        }
        return false;
    }

    /**
     * 处理抽屉关闭 / Handle Drawer Close
     * @private
     */
    handleDrawerClose() {
        console.log('[MetricFormDrawer] Drawer closed, cleaning up...');

        // 清理引用
        this.drawer = null;
        this.form = null;
    }
}
