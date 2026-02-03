import { ActivityKPIModal } from './components/ActivityKPIModal.js';
import { RolePIEditor } from './components/RolePIEditor.js';
import { RoleSOPMatrixEditor } from './components/RoleSOPMatrixEditor.js';
// import { migrateMatrixData } from './utils/dataMigration.js'; // TODO: Copy utils if needed

/**
 * MatrixView.js (Phase 6: Matrix+)
 * Renders the L3 RACI Matrix with KPI/PI Architecture.
 */
export class MatrixView {
    constructor(editorView) {
        this.editor = editorView; // Access to main data
        this.container = null;
        this.data = null; // { roles: {}, assignments: [], kpis: {} }

        // Modals
        this.kpiModal = new ActivityKPIModal(this);
        this.piEditor = new RolePIEditor(this);
        this.roleSOPMatrixEditor = new RoleSOPMatrixEditor(this); // ✅ L3 Matrix Editor
    }

    mount(container) {
        this.container = container;
        // Inject CSS if not present
        if (!document.getElementById('matrix-styles')) {
            const link = document.createElement('link');
            link.id = 'matrix-styles';
            link.rel = 'stylesheet';
            link.href = './matrix.css';
            document.head.appendChild(link);
        }

        // ✅ Global listener for Activity node double-clicks (L2 Editor integration)
        document.addEventListener('dblclick', (e) => {
            const node = e.target.closest('mop-node');
            if (node && node.getAttribute('type') === 'activity') {
                const nodeId = node.id;
                console.log('[MatrixView] Activity node double-clicked:', nodeId);
                // Open L3 Matrix Editor
                this.roleSOPMatrixEditor.open({ activityId: nodeId });
                e.stopPropagation(); // Prevent EditingStrategy
            }
        });

        this.render();
    }

    render() {
        if (!this.container) return;

        // 1. Data Prep
        const nodes = this.editor.graphData.nodes.filter(n => n.type === 'activity');
        // Parse matrixData if string
        let matrixData = this.editor.projectData.matrixData;
        if (typeof matrixData === 'string') {
            try {
                matrixData = JSON.parse(matrixData);
            } catch (e) {
                console.error('Failed to parse matrixData', e);
                matrixData = { roles: {}, assignments: [], kpis: {} };
            }
        }
        this.data = matrixData || { roles: {}, assignments: [], kpis: {} };

        // ✅ Auto-migrate old data to new format (TODO: Re-enable after copying utils)
        // if (this.data.activities) {
        //     this.data = migrateMatrixData(this.data);
        // }

        // Ensure default structure
        if (!this.data.roles) this.data.roles = {};
        if (!this.data.assignments) this.data.assignments = [];
        if (!this.data.kpis) this.data.kpis = {};

        // Get Role Columns
        let roleIds = Object.keys(this.data.roles);
        if (roleIds.length === 0) {
            // Mock Default Roles purely for demo if absolutely empty
            // Ideally we don't force them in Phase 6, but for continuity:
            if (nodes.length > 0) {
                // this.addMockRoles(); // Disable auto-mock for cleaner experience
                // roleIds = Object.keys(this.data.roles);
            }
        }

        // 2. Build Grid HTML
        // Grid Template: Activity Column (Fixed 240px) + N Role Columns (1fr each)
        const gridTemplateCols = `240px repeat(${roleIds.length}, minmax(200px, 1fr))`;

        let html = `
            <div class="matrix-container">
                <div class="matrix-grid" style="grid-template-columns: ${gridTemplateCols};">
                    
                    <!-- Header Row -->
                    <div class="matrix-header-cell matrix-row-header-corner" style="z-index: 20;">
                        <span class="font-bold text-slate-700">业务活动 (Activity)</span>
                        <span class="text-slate-400 text-xs text-right block mt-1">角色 (Role) ➝</span>
                    </div>
                    ${roleIds.map(rid => `
                        <div class="matrix-header-cell group relative">
                            <div class="font-bold text-slate-700">${this.data.roles[rid].name}</div>
                            <div class="text-xs text-slate-400 font-medium mt-0.5">${this.data.roles[rid].dept || '未分配部门'}</div>
                            
                            <!-- Delete Role -->
                            <button class="hidden group-hover:flex absolute top-1 right-1 w-5 h-5 bg-red-100 text-red-500 rounded items-center justify-center hover:bg-red-200 transition-colors"
                                data-action="delete-role" data-rid="${rid}" title="删除此角色列">
                                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    `).join('')}

                    <!-- Rows -->
                    ${nodes.map(node => {
            const kpiList = this.data.kpis[node.id] || [];
            const kpiCount = kpiList.length;

            // Generate Row Header (Activity + KPI Badge)
            let rowHtml = `
                        <div class="matrix-row-header group" data-nid="${node.id}">
                            <!-- Node Avatar/Icon -->
                            <div class="flex items-center gap-2.5 px-4 py-3 cursor-pointer transition-all group-hover:bg-gradient-to-r group-hover:from-purple-50 group-hover:to-blue-50 rounded-lg">
                                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                    ${node.label.charAt(0)}
                                </div>
                                <div class="font-bold text-slate-800 text-sm mb-1 line-clamp-2">${node.label}</div>
                                <div class="flex items-center gap-1.5 mt-1">
                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${kpiCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'} border border-transparent group-hover:border-purple-200 transition-colors">
                                        KPI: ${kpiCount}
                                    </span>
                                    <span class="text-[10px] text-slate-400 group-hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">双击查看矩阵</span>
                                </div>
                            </div>
                        `;

            // Generate Cells for each Role
            rowHtml += roleIds.map(rid => {
                const assignment = this.data.assignments.find(a => a.activityId === node.id && a.roleId === rid);
                return this.renderCell(node.id, rid, assignment);
            }).join('');

            return rowHtml;
        }).join('')}
                </div>
                
                <!-- Floating Action Button for Adding Role -->
                <button id="btn-add-role" class="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg shadow-indigo-500/30 transition-transform active:scale-95" title="添加新角色">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
            </div>
        `;

        this.container.innerHTML = html;

        // 3. Bind Events
        this.container.querySelector('#btn-add-role').onclick = () => this.handleAddRole();

        // Bind Cell Clicks (PI Editor)
        this.container.querySelectorAll('.matrix-cell').forEach(cell => {
            cell.onclick = (e) => {
                const actId = cell.dataset.act;
                const roleId = cell.dataset.role;
                const assignment = this.data.assignments.find(a => a.activityId === actId && a.roleId === roleId);
                const role = this.data.roles[roleId];
                const node = nodes.find(n => n.id === actId);

                // Open Role PI Editor
                this.piEditor.open(
                    { activityId: actId, roleId: roleId, roleName: role.name, nodeName: node.label },
                    assignment?.content || {}
                );
            };
        });

        // Bind Row Header Double Click (L3 Matrix Editor)
        this.container.querySelectorAll('.matrix-row-header').forEach(header => {
            header.ondblclick = (e) => {
                const nodeId = header.dataset.nid;
                // ✅ Open L3 Multi-Role SOP Matrix
                this.roleSOPMatrixEditor.open({ activityId: nodeId });
            };
        });

        // Bind Role Delete Buttons
        this.container.querySelectorAll('[data-action="delete-role"]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation(); // Prevent header click if any
                const rid = btn.dataset.rid;
                if (confirm(`确定要删除角色 "${this.data.roles[rid].name}" 及其所有职责分配吗？`)) {
                    this.handleDeleteRole(rid);
                }
            };
        });
    }

    renderCell(actId, roleId, assignment) {
        let contentHtml = `<div class="w-full h-full flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-xl font-light hover:text-indigo-400">+</div>`;
        let hasContent = false;

        if (assignment && assignment.content) {
            const c = assignment.content;
            const hasTasks = c.tasks && c.tasks.length > 0;
            const hasPPI = c.processPIs && c.processPIs.length > 0;
            const hasQPI = c.qualityPIs && c.qualityPIs.length > 0;

            if (hasTasks || hasPPI || hasQPI) {
                hasContent = true;
                contentHtml = `
                    <div class="flex flex-col gap-1 w-full">
                        ${hasTasks ? `
                            <div class="mb-1">
                                ${c.tasks.map(t => `<div class="text-xs text-slate-700 font-medium leading-tight mb-0.5">• ${t}</div>`).join('')}
                            </div>
                        ` : ''}
                        
                        ${hasPPI ? `
                            <div class="pl-1 border-l-2 border-blue-200 mb-1">
                                <div class="text-[10px] text-blue-400 font-bold uppercase scale-90 origin-left">Process</div>
                                ${c.processPIs.map(t => `<div class="text-[10px] text-blue-600 truncate">- ${t}</div>`).join('')}
                            </div>
                        ` : ''}

                        ${hasQPI ? `
                            <div class="pl-1 border-l-2 border-amber-200">
                                <div class="text-[10px] text-amber-400 font-bold uppercase scale-90 origin-left">Quality</div>
                                ${c.qualityPIs.map(t => `<div class="text-[10px] text-amber-600 truncate">- ${t}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        }

        return `
            <div class="matrix-cell group" data-act="${actId}" data-role="${roleId}">
                <div class="matrix-cell-content ${hasContent ? 'items-start justify-start p-2' : 'items-center justify-center'}">
                    ${contentHtml}
                </div>
            </div>
        `;
    }

    handleAddRole() {
        const name = prompt("输入角色名称 (例如: 计划经理):");
        if (!name) return;
        const dept = prompt("输入所属部门 (例如: 计划部):") || "未分配";

        const roleId = `role-${Date.now()}`;
        this.data.roles[roleId] = {
            id: roleId,
            name: name,
            dept: dept
        };
        this.saveData();
        this.render();
    }

    handleDeleteRole(roleId) {
        // Delete Role
        delete this.data.roles[roleId];
        // Delete Assignments for this role
        this.data.assignments = this.data.assignments.filter(a => a.roleId !== roleId);

        this.saveData();
        this.render();
    }

    // Callbacks from Modals
    saveKpis(nodeId, newKpis) {
        this.data.kpis[nodeId] = newKpis;
        this.saveData();
        this.render();
    }

    saveCellData(actId, roleId, newContent) {
        let assign = this.data.assignments.find(a => a.activityId === actId && a.roleId === roleId);
        // Clean empty arrays if needed, or keep them
        const isEmpty = (!newContent.tasks || newContent.tasks.length === 0) &&
            (!newContent.processPIs || newContent.processPIs.length === 0) &&
            (!newContent.qualityPIs || newContent.qualityPIs.length === 0);

        if (!assign) {
            if (!isEmpty) {
                // Create new
                this.data.assignments.push({
                    id: `assign-${Date.now()}`,
                    activityId: actId,
                    roleId: roleId,
                    content: newContent
                });
            }
        } else {
            if (isEmpty) {
                // Remove if empty? Or just clear content? Let's just clear content.
                assign.content = newContent;
                // Optional: Removing the assignment object itself if totally empty to save space
                this.data.assignments = this.data.assignments.filter(a => a !== assign);
            } else {
                assign.content = newContent; // Update
            }
        }

        this.saveData();
        this.render();
    }

    saveData() {
        // Sync back to Editor's projectData
        this.editor.projectData.matrixData = JSON.stringify(this.data);
        console.log('[MatrixView] Saved Data:', this.data);
        // Trigger generic save
        this.editor.save();
    }

    destroy() {
        this.container.innerHTML = '';
        this.container = null;
        if (this.kpiModal) this.kpiModal.close();
        if (this.piEditor) this.piEditor.close();
    }
}
