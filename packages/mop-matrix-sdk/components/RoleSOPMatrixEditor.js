/**
 * RoleSOPMatrixEditor - L3 Multi-Role SOP Collaboration Matrix
 * 参考: prototype_rolepi_matrix.html (用户批准的设计)
 */

import { MetricFormDrawer } from '@mop/inspector-sdk/components/MetricFormDrawer.js';

export class RoleSOPMatrixEditor {
    constructor(matrixView) {
        this.matrixView = matrixView;
        this.activityId = null;
        this.activity = null;
        this.roles = [];
        this.overlay = null;
    }

    open(context) {
        this.activityId = context.activityId;
        this.loadData();
        this.render();
    }

    loadData() {
        const activityNode = this.matrixView.editor.graphData.nodes.find(n => n.id === this.activityId);

        if (!activityNode) {
            console.error(`[RoleSOPMatrixEditor] Activity not found: ${this.activityId}`);
            return;
        }

        this.activity = {
            id: activityNode.id,
            name: activityNode.label || 'Activity',
            sops: activityNode.sops || [
                { id: `${this.activityId}-sop-1`, name: 'SOP 1', description: '标准操作流程', order: 1 }
            ]
        };

        const matrixData = this.matrixView.data || { roles: {}, assignments: [] };
        this.roles = Object.keys(matrixData.roles || {}).map(roleId => ({
            id: roleId,
            name: matrixData.roles[roleId].name
        }));

        console.log('[RoleSOPMatrixEditor] Loaded:', {
            activity: this.activity.name,
            sops: this.activity.sops.length,
            roles: this.roles.length
        });
    }

    render() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-8';

        this.overlay.innerHTML = `
            <style>
                .matrix-table { border-collapse: collapse; width: 100%; }
                .matrix-table th, .matrix-table td { border: 1px solid #cbd5e1; padding: 12px 8px; text-align: left; vertical-align: top; }
                .role-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 700; text-align: center; }
                .column-header { background: #e0e7ff; color: #4338ca; font-weight: 600; font-size: 0.75rem; text-align: center; }
                .sop-header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; font-weight: 700; min-width: 140px; }
                .matrix-cell { min-width: 220px; min-height: 80px; background: white; }
                .matrix-cell:hover { background: #f8fafc; }
                .add-role-btn { background: #f0f9ff; border: 2px dashed #0ea5e9; color: #0284c7; cursor: pointer; transition: all 0.2s; }
                .add-role-btn:hover { background: #e0f2fe; border-color: #0284c7; }
                .pi-item { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 4px; transition: background 0.15s; }
                .pi-item:hover { background: #f1f5f9; }
                .traffic-light { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
                .traffic-light.green { background: #22c55e; }
                .traffic-light.yellow { background: #eab308; }
                .traffic-light.red { background: #ef4444; }
            </style>
            
            <div class="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
                <!-- Header -->
                <div class="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <span class="w-1.5 h-8 bg-indigo-600 rounded-full"></span>
                                岗位职责矩阵
                                <span class="text-sm font-normal text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">Role-SOP Matrix</span>
                            </h3>
                            <div class="flex gap-6 mt-3 text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-slate-700">活动:</span>
                                    <span class="text-slate-600 bg-white px-2 py-0.5 rounded">${this.activity.name}</span>
                                </div>
                            </div>
                        </div>
                        <button id="close-btn" class="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-lg transition-all">
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Matrix Content -->
                <div class="flex-1 p-6 overflow-auto bg-slate-50" id="matrix-container">
                    ${this.renderTable()}
                    
                    <!-- Add SOP Button -->
                    <div class="mt-6">
                        <button id="add-sop-btn" class="w-full px-6 py-4 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-bold flex items-center justify-center gap-2">
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            添加 SOP 行
                        </button>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center">
                    <div class="text-sm text-slate-500 flex items-center gap-4">
                        <span>${this.activity.sops.length} 个 SOP × ${this.roles.length} 个角色</span>
                        <span class="flex items-center gap-2">
                            <div class="traffic-light green"></div> ${this.countPIsByStatus('green')} 达标
                            <div class="traffic-light yellow"></div> ${this.countPIsByStatus('yellow')} 警告
                            <div class="traffic-light red"></div> ${this.countPIsByStatus('red')} 未达标
                        </span>
                    </div>
                    <div class="flex gap-3">
                        <button id="cancel-btn" class="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">放弃更改</button>
                        <button id="save-btn" class="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition-all font-bold">保存矩阵</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // ✅ Add ESC key handler
        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escHandler);

        this.attachEvents();
    }

    renderTable() {
        return `
            <table class="matrix-table text-sm">
                <thead>
                    <!-- Row 1: Role Names -->
                    <tr>
                        <th rowspan="2" class="sop-header">SOP 名称</th>
                        ${this.roles.map(role => `
                            <th colspan="2" class="role-header">
                                <div class="flex items-center justify-between px-2">
                                    <span class="flex-1 text-center">🧑 ${role.name}</span>
                                    <button class="text-white/80 hover:text-white p-1" data-action="delete-role" data-role-id="${role.id}" title="删除角色">
                                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </th>
                        `).join('')}
                        <th rowspan="2" class="add-role-btn">
                            <button id="add-role-btn" class="flex flex-col items-center gap-1 px-2 py-6 w-full">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span class="text-xs font-bold">添加角色列</span>
                            </button>
                        </th>
                    </tr>
                    <!-- Row 2: Column Headers -->
                    <tr>
                        ${this.roles.map(() => `
                            <th class="column-header">岗位任务<br/>Task</th>
                            <th class="column-header">任务指标<br/>PI</th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${this.activity.sops.map(sop => this.renderSOPRow(sop)).join('')}
                </tbody>
            </table>
        `;
    }

    renderSOPRow(sop) {
        return `
            <tr>
                <td class="sop-header">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1">
                            <div class="flex items-center gap-1 cursor-pointer hover:bg-white/20 p-1 rounded" data-action="edit-sop-name" data-sop-id="${sop.id}">
                                <span>📝</span>
                                <span class="font-bold">${sop.name}</span>
                                <svg class="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </div>
                            <div class="text-xs font-normal mt-1">${sop.description || ''}</div>
                        </div>
                        <button class="text-white/80 hover:text-white p-1" data-action="delete-sop" data-sop-id="${sop.id}" title="删除SOP">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </td>
                ${this.roles.map(role => this.renderCells(sop, role)).join('')}
                <td class="bg-slate-50"></td>
            </tr>
        `;
    }

    renderCells(sop, role) {
        const matrixData = this.matrixView.data || { assignments: [] };
        const assignment = matrixData.assignments.find(a => a.activityId === this.activityId && a.roleId === role.id);
        const sopData = assignment?.sopAssignments?.find(sa => sa.sopId === sop.id) || { tasks: [], pis: [] };

        return `
            ${this.renderTaskCell(sop.id, role.id, sopData.tasks)}
            ${this.renderPICell(sop.id, role.id, sopData.pis)}
        `;
    }

    renderTaskCell(sopId, roleId, tasks) {
        if (!tasks || tasks.length === 0) {
            return `
                <td class="matrix-cell bg-slate-50 text-center">
                    <button class="text-xs text-slate-500 hover:text-indigo-600" data-action="add-task" data-sop-id="${sopId}" data-role-id="${roleId}">+ 添加</button>
                </td>
            `;
        }

        return `
            <td class="matrix-cell">
                <div class="space-y-2">
                    ${tasks.map(task => `
                        <div class="group flex items-start gap-1 p-1 rounded hover:bg-slate-100">
                            <div class="mt-1 w-1 h-1 rounded-full bg-indigo-400"></div>
                            <div class="flex-1 text-xs text-slate-700">${task}</div>
                            <button class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500" data-action="delete-task" data-sop-id="${sopId}" data-role-id="${roleId}" data-task="${task}">
                                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    `).join('')}
                    <button class="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1" data-action="add-task" data-sop-id="${sopId}" data-role-id="${roleId}">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        添加
                    </button>
                </div>
            </td>
        `;
    }

    renderPICell(sopId, roleId, pis) {
        if (!pis || pis.length === 0) {
            return `
                <td class="matrix-cell bg-slate-50 text-center">
                    <button class="text-xs text-slate-500 hover:text-blue-600" data-action="add-pi" data-sop-id="${sopId}" data-role-id="${roleId}">+ 添加PI</button>
                </td>
            `;
        }

        return `
            <td class="matrix-cell">
                <div class="space-y-2">
                    ${pis.map(pi => this.renderPIItem(pi)).join('')}
                    <button class="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1" data-action="add-pi" data-sop-id="${sopId}" data-role-id="${roleId}">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        添加PI
                    </button>
                </div>
            </td>
        `;
    }

    renderPIItem(pi) {
        console.log('🔍 [DEBUG] renderPIItem - PI对象:', pi);

        // ✅ 修复：PI数据是扁平的，不是嵌套的metricDef
        const metricData = pi.metricDef || pi; // 兼容两种结构
        const lightColor = this.calcLightColor(metricData);
        const cur = metricData.currentValue !== null && metricData.currentValue !== undefined ? metricData.currentValue : '-';
        const tgt = metricData.targetValue ?? '-';

        console.log('🔍 [DEBUG] renderPIItem - cur:', cur, 'tgt:', tgt);

        return `
            <div class="group pi-item">
                <div class="traffic-light ${lightColor}"></div>
                <div class="flex-1">
                    <div class="text-xs font-medium text-slate-800">${pi.name}</div>
                    <div class="text-[10px] text-slate-500">${cur} / ${tgt}</div>
                </div>
                <button class="text-purple-500 hover:text-purple-700" data-action="edit-pi" data-pi-id="${pi.id}" title="定义指标">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
                <button class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500" data-action="delete-pi" data-pi-id="${pi.id}">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;
    }

    calcLightColor(md) {
        if (!md || md.currentValue == null) return 'green';
        const { currentValue: c, targetValue: t, warningThreshold: w, direction: d } = md;
        if (d === 'HigherBetter') return c >= t ? 'green' : c >= (w || 0) ? 'yellow' : 'red';
        return c <= t ? 'green' : c <= (w || Infinity) ? 'yellow' : 'red';
    }

    countPIsByStatus(status) {
        let count = 0;
        const matrixData = this.matrixView.data || { assignments: [] };
        matrixData.assignments.forEach(a => {
            a.sopAssignments?.forEach(sa => {
                sa.pis?.forEach(pi => {
                    if (this.calcLightColor(pi.metricDef) === status) count++;
                });
            });
        });
        return count;
    }

    attachEvents() {
        this.overlay.querySelector('#close-btn').onclick = () => this.close();
        this.overlay.querySelector('#cancel-btn').onclick = () => this.close();
        this.overlay.querySelector('#save-btn').onclick = () => this.save();

        const addSopBtn = this.overlay.querySelector('#add-sop-btn');
        if (addSopBtn) addSopBtn.onclick = () => this.addSOP();

        const addRoleBtn = this.overlay.querySelector('#add-role-btn');
        if (addRoleBtn) addRoleBtn.onclick = () => this.addRole();

        // Edit SOP name
        this.overlay.querySelectorAll('[data-action="edit-sop-name"]').forEach(btn => {
            btn.onclick = () => this.editSOPName(btn.dataset.sopId);
        });

        // Delete role
        this.overlay.querySelectorAll('[data-action="delete-role"]').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); this.deleteRole(btn.dataset.roleId); };
        });

        // Delete SOP
        this.overlay.querySelectorAll('[data-action="delete-sop"]').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); this.deleteSOP(btn.dataset.sopId); };
        });

        // Add/Delete Task
        this.overlay.querySelectorAll('[data-action="add-task"]').forEach(btn => {
            btn.onclick = () => this.editTasks(btn.dataset.sopId, btn.dataset.roleId);
        });

        // Add/Edit/Delete PI
        this.overlay.querySelectorAll('[data-action="add-pi"]').forEach(btn => {
            btn.onclick = () => this.editPI(btn.dataset.sopId, btn.dataset.roleId);
        });

        // ✅ Edit PI (紫色齿轮)
        this.overlay.querySelectorAll('[data-action="edit-pi"]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const piId = btn.dataset.piId;
                console.log('🔧 [DEBUG] Edit PI clicked, piId:', piId);
                console.log('🔧 [DEBUG] matrixView.data:', this.matrixView.data);

                const assignment = this.matrixView.data.assignments.find(a =>
                    a.sopAssignments?.some(sa => sa.pis?.some(p => p.id === piId))
                );
                console.log('🔧 [DEBUG] Found assignment:', assignment);
                if (!assignment) {
                    console.error('❌ Assignment not found for piId:', piId);
                    return;
                }

                const sopAssignment = assignment.sopAssignments.find(sa =>
                    sa.pis?.some(p => p.id === piId)
                );
                console.log('🔧 [DEBUG] Found sopAssignment:', sopAssignment);

                const pi = sopAssignment.pis.find(p => p.id === piId);
                console.log('🔧 [DEBUG] Found PI:', pi);

                this.editPI(sopAssignment.sopId, assignment.roleId, pi);
            };
        });

        // ✅ Delete PI (X按钮)
        this.overlay.querySelectorAll('[data-action="delete-pi"]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.deletePI(btn.dataset.piId);
            };
        });

        // ✅ Delete Task (X按钮)
        this.overlay.querySelectorAll('[data-action="delete-task"]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.deleteTask(btn.dataset.sopId, btn.dataset.roleId, btn.dataset.task);
            };
        });
    }

    // CRUD Operations
    editTasks(sopId, roleId) {
        console.log('🟢 [DEBUG] editTasks called', { sopId, roleId });

        // ✅ Ant Design 模式：确保数据对象已初始化（引用持久化）
        if (!this.matrixView.data) {
            console.log('🟡 [DEBUG] Initializing matrixView.data');
            this.matrixView.data = { roles: {}, assignments: [] };
        }
        const matrixData = this.matrixView.data; // 直接引用，不创建临时对象
        console.log('🟢 [DEBUG] matrixData:', matrixData);

        const assignment = matrixData.assignments.find(a => a.activityId === this.activityId && a.roleId === roleId);
        const sopData = assignment?.sopAssignments?.find(sa => sa.sopId === sopId);
        const currentTasks = sopData?.tasks || [];
        console.log('🟢 [DEBUG] currentTasks:', currentTasks);

        const input = prompt('请输入任务（每行一个）：', currentTasks.join('\n'));
        if (input === null) {
            console.log('🟡 [DEBUG] User cancelled');
            return;
        }

        const newTasks = input.split('\n').map(t => t.trim()).filter(t => t);
        console.log('🟢 [DEBUG] newTasks:', newTasks);

        if (!assignment) {
            matrixData.assignments.push({
                activityId: this.activityId,
                roleId: roleId,
                sopAssignments: [{ sopId, tasks: newTasks, pis: [] }]
            });
        } else {
            if (!sopData) {
                assignment.sopAssignments = assignment.sopAssignments || [];
                assignment.sopAssignments.push({ sopId, tasks: newTasks, pis: [] });
            } else {
                sopData.tasks = newTasks;
            }
        }

        console.log('🟢 [DEBUG] About to call refreshMatrix()');
        this.refreshMatrix();
        console.log('🟢 [DEBUG] refreshMatrix() completed');
    }

    editPI(sopId, roleId, existingPI = null) {
        console.log('🔵 [DEBUG] editPI called', { sopId, roleId, existingPI });

        // ✅ Ant Design 模式：确保数据对象已初始化
        if (!this.matrixView.data) {
            console.log('🟡 [DEBUG] Initializing matrixView.data for PI');
            this.matrixView.data = { roles: {}, assignments: [] };
        }
        const matrixData = this.matrixView.data;
        console.log('🔵 [DEBUG] matrixData:', matrixData);

        const assignment = matrixData.assignments.find(a => a.activityId === this.activityId && a.roleId === roleId);
        const sopData = assignment?.sopAssignments?.find(sa => sa.sopId === sopId);

        const drawer = new MetricFormDrawer({
            initialMetric: existingPI,  // ✅ 传递现有PI进行编辑
            onSave: (piData) => {
                // ✅ 编辑模式：更新现有PI
                if (existingPI) {
                    const piIndex = sopData.pis.findIndex(p => p.id === existingPI.id);
                    if (piIndex >= 0) {
                        sopData.pis[piIndex] = piData;
                    }
                } else {
                    // 新建模式
                    if (!assignment) {
                        matrixData.assignments.push({
                            activityId: this.activityId,
                            roleId: roleId,
                            sopAssignments: [{ sopId, tasks: [], pis: [piData] }]
                        });
                    } else {
                        if (!sopData) {
                            assignment.sopAssignments = assignment.sopAssignments || [];
                            assignment.sopAssignments.push({ sopId, tasks: [], pis: [piData] });
                        } else {
                            sopData.pis = sopData.pis || [];
                            sopData.pis.push(piData);
                        }
                    }
                }
                this.refreshMatrix();
            }
        });
        drawer.open();
    }

    addSOP() {
        const name = prompt('请输入SOP名称：', `SOP ${this.activity.sops.length + 1}`);
        if (!name) return;

        this.activity.sops.push({
            id: `${this.activityId}-sop-${Date.now()}`,
            name: name,
            description: '',
            order: this.activity.sops.length + 1
        });
        this.refreshMatrix();
    }

    deleteSOP(sopId) {
        if (!confirm('确定删除此SOP吗？')) return;
        this.activity.sops = this.activity.sops.filter(s => s.id !== sopId);

        const matrixData = this.matrixView.data || { assignments: [] };
        matrixData.assignments.forEach(a => {
            if (a.sopAssignments) {
                a.sopAssignments = a.sopAssignments.filter(sa => sa.sopId !== sopId);
            }
        });
        this.refreshMatrix();
    }

    addRole() {
        const name = prompt('请输入角色名称：');
        if (!name) return;

        const roleId = `role-${Date.now()}`;

        // ✅ 确保数据初始化
        if (!this.matrixView.data) {
            this.matrixView.data = { roles: {}, assignments: [] };
        }
        const matrixData = this.matrixView.data;
        matrixData.roles[roleId] = { name };
        this.roles.push({ id: roleId, name });
        this.refreshMatrix();
    }

    deleteRole(roleId) {
        if (!confirm('确定删除此角色吗？')) return;

        if (!this.matrixView.data) return; // 没数据，直接返回
        const matrixData = this.matrixView.data;
        delete matrixData.roles[roleId];
        matrixData.assignments = matrixData.assignments.filter(a => a.roleId !== roleId);
        this.roles = this.roles.filter(r => r.id !== roleId);
        this.refreshMatrix();
    }

    deletePI(piId) {
        if (!confirm(`确定删除指标？`)) return;

        for (const assignment of this.matrixView.data.assignments) {
            for (const sopAssignment of assignment.sopAssignments || []) {
                const piIndex = sopAssignment.pis?.findIndex(p => p.id === piId);
                if (piIndex >= 0) {
                    sopAssignment.pis.splice(piIndex, 1);
                    this.refreshMatrix();
                    return;
                }
            }
        }
    }

    deleteTask(sopId, roleId, taskText) {
        if (!confirm(`确定删除任务"${taskText}"？`)) return;

        const assignment = this.matrixView.data.assignments.find(a =>
            a.activityId === this.activityId && a.roleId === roleId
        );
        if (!assignment) return;

        const sopAssignment = assignment.sopAssignments?.find(sa => sa.sopId === sopId);
        if (!sopAssignment) return;

        sopAssignment.tasks = sopAssignment.tasks.filter(t => t !== taskText);
        this.refreshMatrix();
    }

    editSOPName(sopId) {
        const sop = this.activity.sops.find(s => s.id === sopId);
        if (!sop) return;

        const newName = prompt('请输入SOP名称：', sop.name);
        if (!newName || newName === sop.name) return;

        sop.name = newName;
        this.refreshMatrix();
    }

    refreshMatrix() {
        console.log('🔴 [DEBUG] refreshMatrix() START');
        const container = this.overlay.querySelector('#matrix-container');
        container.innerHTML = `
            ${this.renderTable()}
            <div class="mt-6">
                <button id="add-sop-btn" class="w-full px-6 py-4 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-bold flex items-center justify-center gap-2">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    添加 SOP 行
                </button>
            </div>
        `;
        this.attachEvents(); // ✅ 重新绑定事件
        console.log('🔴 [DEBUG] refreshMatrix() attachEvents completed');
        // Update footer stats
        const footer = this.overlay.querySelector('.px-6.py-4.border-t');
        const statsContainer = footer.querySelector('.text-sm.text-slate-500');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <span>${this.activity.sops.length} 个 SOP × ${this.roles.length} 个角色</span>
                <span class="flex items-center gap-2">
                    <div class="traffic-light green"></div> ${this.countPIsByStatus('green')} 达标
                    <div class="traffic-light yellow"></div> ${this.countPIsByStatus('yellow')} 警告
                    <div class="traffic-light red"></div> ${this.countPIsByStatus('red')} 未达标
                </span>
            `;
        }
    }

    save() {
        // 1. 保存SOP到Activity节点
        const activityNode = this.matrixView.editor.graphData.nodes.find(n => n.id === this.activityId);
        if (activityNode) activityNode.sops = this.activity.sops;

        // 2. 保存matrixData（包含任务和PI）
        this.matrixView.editor.projectData.matrixData = JSON.stringify(this.matrixView.data);

        // 3. 调用EditorView的save方法
        this.matrixView.editor.save();

        console.log('✅ [RoleSOPMatrixEditor] Saved successfully');
        alert('保存成功！');
        this.close();
    }

    close() {
        // ✅ Remove ESC listener
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
        }
        this.overlay?.remove();
    }
}
