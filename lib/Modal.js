/**
 * 统一 Modal 工具类
 * 参考: Ant Design (90k⭐) + Radix UI (15k⭐)
 * 
 * 使用示例:
 * Modal.confirm({ title: '确认删除?', content: '此操作不可撤销', onOk: () => {} });
 * Modal.warning({ title: '警告', content: '请先保存', checkbox: { label: '不再显示', key: 'hideWarning' } });
 */
export class Modal {
    /**
     * 确认对话框
     * @param {Object} options - 配置选项
     * @param {string} options.title - 标题
     * @param {string} options.content - 内容
     * @param {string} [options.okText='确认'] - 确认按钮文字
     * @param {string} [options.cancelText='取消'] - 取消按钮文字
     * @param {boolean} [options.showCancel=true] - 是否显示取消按钮
     * @param {Function} [options.onOk] - 确认回调
     * @param {Function} [options.onCancel] - 取消回调
     * @param {Object} [options.checkbox] - Checkbox 配置 { label, key }
     * @param {string} [options.icon='warning'] - 图标类型: info/success/warning/error
     */
    static confirm(options = {}) {
        const {
            title = '提示',
            content = '',
            okText = '确认',
            cancelText = '取消',
            showCancel = true,
            onOk = () => { },
            onCancel = () => { },
            checkbox = null,
            icon = 'warning',
        } = options;

        return this._create({
            title,
            content,
            okText,
            cancelText,
            showCancel,
            onOk,
            onCancel,
            checkbox,
            icon,
            type: 'confirm'
        });
    }

    /**
     * 警告弹窗
     */
    static warning(options = {}) {
        return this.confirm({
            ...options,
            icon: 'warning',
            showCancel: false,
            okText: options.okText || '知道了'
        });
    }

    /**
     * 成功提示
     */
    static success(options = {}) {
        return this.confirm({
            ...options,
            icon: 'success',
            showCancel: false,
            okText: options.okText || '知道了'
        });
    }

    /**
     * 错误提示
     */
    static error(options = {}) {
        return this.confirm({
            ...options,
            icon: 'error',
            showCancel: false,
            okText: options.okText || '知道了'
        });
    }

    /**
     * 内部创建方法
     */
    static _create(config) {
        // 1. Create Overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[var(--z-modal)]';
        overlay.style.backdropFilter = 'blur(2px)';
        overlay.style.animation = 'fadeIn 0.2s ease-out';

        // 2. Create Modal
        const modal = document.createElement('div');
        modal.className = 'bg-white rounded-lg shadow-2xl';
        modal.style.width = config.width || '480px';
        modal.style.maxWidth = '90vw';
        modal.style.maxHeight = '80vh';
        modal.style.animation = 'zoomIn 0.2s ease-out';

        // 3. Build Content
        modal.innerHTML = this._buildContent(config);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 4. Bind Events
        this._bindEvents(overlay, modal, config);

        // 5. Add animations CSS (if not exists)
        this._ensureAnimations();

        // 6. Return control interface
        return {
            close: () => this._close(overlay),
            update: (newContent) => {
                const contentEl = modal.querySelector('.modal-content');
                if (contentEl) contentEl.innerHTML = newContent;
            }
        };
    }

    /**
     * 构建内容
     */
    static _buildContent(config) {
        const iconMap = {
            info: {
                color: 'blue',
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-600',
                path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            success: {
                color: 'green',
                bgColor: 'bg-green-100',
                textColor: 'text-green-600',
                path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            warning: {
                color: 'amber',
                bgColor: 'bg-amber-100',
                textColor: 'text-amber-600',
                path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            },
            error: {
                color: 'red',
                bgColor: 'bg-red-100',
                textColor: 'text-red-600',
                path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
            }
        };

        const icon = iconMap[config.icon] || iconMap.warning;

        return `
      <div class="p-6">
        <!-- Header -->
        ${config.title ? `
          <div class="flex items-start mb-4">
            ${config.icon ? `
              <div class="flex-shrink-0 w-10 h-10 ${icon.bgColor} rounded-full flex items-center justify-center mr-3">
                <svg class="w-6 h-6 ${icon.textColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icon.path}" />
                </svg>
              </div>
            ` : ''}
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-slate-900">${config.title}</h3>
            </div>
          </div>
        ` : ''}

        <!-- Content -->
        <div class="modal-content text-sm text-slate-600 mb-6 ${config.icon ? 'ml-13' : ''}">
          ${typeof config.content === 'string' ? config.content.replace(/\n/g, '<br>') : config.content}
        </div>

        <!-- Checkbox -->
        ${config.checkbox ? `
          <label class="flex items-center mt-4 mb-6 cursor-pointer group ${config.icon ? 'ml-13' : ''}">
            <input type="checkbox" class="modal-checkbox w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer">
            <span class="ml-2 text-sm text-slate-600 group-hover:text-slate-800 transition-colors">${config.checkbox.label}</span>
          </label>
        ` : ''}

        <!-- Footer -->
        <div class="flex justify-end gap-3">
          ${config.showCancel !== false ? `
            <button class="modal-cancel px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
              ${config.cancelText || '取消'}
            </button>
          ` : ''}
          <button class="modal-ok px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors">
            ${config.okText || '确认'}
          </button>
        </div>
      </div>
    `;
    }

    /**
     * 绑定事件
     */
    static _bindEvents(overlay, modal, config) {
        const okBtn = modal.querySelector('.modal-ok');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const checkbox = modal.querySelector('.modal-checkbox');

        const close = (callback) => {
            // 保存 checkbox 状态
            if (checkbox && checkbox.checked && config.checkbox) {
                localStorage.setItem(config.checkbox.key, 'true');
                console.log(`[Modal] User preference saved: ${config.checkbox.key} = true`);
            }

            if (callback) {
                try {
                    callback();
                } catch (e) {
                    console.error('[Modal] Callback error:', e);
                }
            }
            this._close(overlay);
        };

        // OK button
        if (okBtn) okBtn.onclick = () => close(config.onOk);

        // Cancel button
        if (cancelBtn) cancelBtn.onclick = () => close(config.onCancel);

        // Click overlay to close
        overlay.onclick = (e) => {
            if (e.target === overlay) close(config.onCancel);
        };

        // ESC to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                close(config.onCancel);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Auto focus OK button
        setTimeout(() => {
            if (okBtn) okBtn.focus();
        }, 100);
    }

    /**
     * 关闭 Modal
     */
    static _close(overlay) {
        overlay.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => overlay.remove(), 200);
    }

    /**
     * 确保动画 CSS 存在
     */
    static _ensureAnimations() {
        if (document.getElementById('modal-animations')) return;

        const style = document.createElement('style');
        style.id = 'modal-animations';
        style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes zoomIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
        document.head.appendChild(style);
    }
}
