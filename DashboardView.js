// Real Data Service
import { ProjectService } from './ProjectService.js';

export class DashboardView {
    constructor() {
        this.projectService = new ProjectService();
        this.projects = [];
        this.currentProjectToDelete = null;
        this.currentProjectToEdit = null;
    }

    async render() {
        const userJson = localStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : { nickname: 'Guest' };

        return `
            <div class="min-h-screen bg-slate-50 pt-12 pb-20">
                <!-- Navigation / Header Bar -->
                <div class="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 h-16 flex items-center justify-center">
                    <div class="w-full max-w-7xl px-6 flex justify-between items-center">
                         <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            </div>
                            <span class="font-bold text-slate-800 tracking-tight text-lg">Goldmine V3</span>
                        </div>
                        <div class="flex items-center gap-4">
                             <div class="text-sm text-slate-500">
                                欢迎, <span class="font-semibold text-slate-800">${user.nickname}</span>
                             </div>
                             <button id="btnLogout" class="text-slate-400 hover:text-red-500 transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                             </button>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="w-full max-w-7xl px-6 mx-auto mt-16">
                    <!-- Title Section -->
                    <div class="flex justify-between items-end mb-10 pt-10 border-b border-slate-200 pb-6">
                        <div>
                            <h1 class="text-4xl font-bold text-slate-900 tracking-tight mb-2">工作台</h1>
                            <p class="text-slate-500 text-lg">您参与的所有流程项目一览</p>
                        </div>
                        <button id="btnNewProject" class="group relative bg-slate-900 hover:bg-black text-white font-medium py-2.5 px-5 rounded-lg shadow-lg shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-2">
                            <span class="text-xl leading-none font-light opacity-80 group-hover:opacity-100 transition-opacity">+</span>
                            <span>新建项目</span>
                        </button>
                    </div>

                    <!-- Project Grid -->
                    <div id="project-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div class="col-span-full text-center text-slate-400 py-20 flex flex-col items-center animate-pulse">
                            <div class="w-12 h-12 bg-slate-100 rounded-full mb-4"></div>
                            <span class="text-sm">正在加载项目列表...</span>
                        </div>
                    </div>
                </div>

                <!-- New Project Modal -->
                <div id="newProjectModal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center hidden z-50 transition-opacity opacity-0">
                    <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 transform scale-95 transition-transform" id="modalContent">
                        <h3 class="text-2xl font-bold text-slate-800 mb-2">创建新项目</h3>
                        <p class="text-slate-500 mb-8 text-sm">为您的新流程起个名字，之后可以随时更改。</p>
                        <div class="mb-8">
                            <label class="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wide">项目名称</label>
                            <input type="text" id="inputProjectName" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="例如：年度采购审批流程">
                        </div>
                        <div class="flex justify-end gap-3">
                            <button id="btnCancelCreate" class="px-5 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-medium transition-colors">取消</button>
                            <button id="btnConfirmCreate" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md shadow-blue-500/30 transition-all active:scale-95">立即创建</button>
                        </div>
                    </div>
                </div>

                <!-- Edit Project Modal -->
                <div id="editProjectModal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center hidden z-50 transition-opacity opacity-0">
                    <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 transform scale-95 transition-transform" id="editModalContent">
                        <h3 class="text-2xl font-bold text-slate-800 mb-6">编辑项目信息</h3>
                        <div class="space-y-6 mb-8">
                            <div>
                                <label class="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wide">项目名称</label>
                                <input type="text" id="editProjectName" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                            </div>
                            <div>
                                <label class="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wide">项目描述</label>
                                <textarea id="editProjectDesc" rows="3" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"></textarea>
                            </div>
                        </div>
                        <div class="flex justify-end gap-3">
                            <button id="btnCancelEdit" class="px-5 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-medium transition-colors">取消</button>
                            <button id="btnConfirmEdit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md shadow-blue-500/30 transition-all active:scale-95">保存修改</button>
                        </div>
                    </div>
                </div>

                <!-- Delete Project Modal (GitHub Style) -->
                <div id="deleteProjectModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center hidden z-50 transition-opacity opacity-0">
                    <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-red-100 transform scale-95 transition-transform" id="deleteModalContent">
                        <div class="flex items-center gap-3 text-red-600 mb-4">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <h3 class="text-2xl font-bold">确定删除项目?</h3>
                        </div>
                        <p class="text-slate-600 mb-6 text-sm leading-relaxed">
                            此操作 <span class="font-bold text-red-600">无法撤销</span>。这将永久删除项目 <span id="delProjectNameDisplay" class="font-mono bg-slate-100 px-1 rounded text-slate-800"></span> 及其所有画布数据。
                        </p>
                        
                        <div class="mb-6">
                            <label class="block text-slate-700 text-sm font-bold mb-2">请输入项目名称以确认</label>
                            <input type="text" id="inputDeleteConfirm" class="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-900 placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" autocomplete="off">
                        </div>

                        <button id="btnConfirmDelete" disabled class="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg shadow-md shadow-red-500/30 transition-all active:scale-95 flex justify-center">
                            我已知晓后果，删除此项目
                        </button>
                        <button id="btnCancelDelete" class="w-full mt-3 text-slate-500 hover:text-slate-700 py-2 font-medium text-sm">取消</button>
                    </div>
                </div>
            </div>
        `;
    }

    async afterRender() {
        // --- Modal Helper Logic ---
        const setupModal = (modalId, contentId, openTrigger, closeTriggers, onOpen) => {
            const modal = document.getElementById(modalId);
            const content = document.getElementById(contentId);

            const open = () => {
                if (onOpen) onOpen();
                modal.classList.remove('hidden');
                void modal.offsetWidth; // reflow
                modal.classList.remove('opacity-0');
                content.classList.remove('scale-95');
            };

            const close = () => {
                modal.classList.add('opacity-0');
                content.classList.add('scale-95');
                setTimeout(() => modal.classList.add('hidden'), 200);
            };

            if (openTrigger) openTrigger.onclick = open;
            closeTriggers.forEach(btn => {
                if (btn) btn.onclick = close;
            });
            modal.onclick = (e) => { if (e.target === modal) close(); };

            return { open, close };
        };

        // 1. New Project Modal
        const newModal = setupModal('newProjectModal', 'modalContent', document.getElementById('btnNewProject'), [document.getElementById('btnCancelCreate')], () => {
            document.getElementById('inputProjectName').focus();
        });

        // 2. Edit Modal
        const editModal = setupModal('editProjectModal', 'editModalContent', null, [document.getElementById('btnCancelEdit')]);

        // 3. Delete Modal
        const deleteModal = setupModal('deleteProjectModal', 'deleteModalContent', null, [document.getElementById('btnCancelDelete')]);

        // --- Core Logic ---

        // Load Data
        await this.loadProjects();

        // Logout
        document.getElementById('btnLogout').onclick = () => {
            localStorage.removeItem('user');
            window.location.hash = '#/login';
        };

        // Create Confirm
        const btnCreate = document.getElementById('btnConfirmCreate');
        btnCreate.onclick = async () => {
            const nameInput = document.getElementById('inputProjectName');
            const name = nameInput.value.trim();
            if (!name) return;

            btnCreate.disabled = true;
            btnCreate.innerHTML = 'Creating...';

            const userJson = localStorage.getItem('user');
            const currentUser = userJson ? JSON.parse(userJson) : { nickname: 'Guest' };

            const res = await this.projectService.createProject(name, currentUser.nickname);
            if (res.success) {
                await this.loadProjects();
                newModal.close();
                nameInput.value = '';
            } else {
                alert('Failed: ' + res.message);
            }
            btnCreate.disabled = false;
            btnCreate.innerText = '立即创建';
        };

        // Edit Confirm
        const btnEdit = document.getElementById('btnConfirmEdit');
        btnEdit.onclick = async () => {
            if (!this.currentProjectToEdit) return;
            const name = document.getElementById('editProjectName').value.trim();
            const desc = document.getElementById('editProjectDesc').value.trim();
            if (!name) return;

            btnEdit.disabled = true;
            btnEdit.innerHTML = 'Saving...';

            const res = await this.projectService.updateProjectMetadata(this.currentProjectToEdit.id, name, desc);
            if (res.success) {
                await this.loadProjects();
                editModal.close();
            } else {
                alert('Update Failed');
            }
            btnEdit.disabled = false;
            btnEdit.innerText = '保存修改';
        };

        // Delete Confirm Logic (GitHub Style)
        const btnDelete = document.getElementById('btnConfirmDelete');
        const inputDelConfirm = document.getElementById('inputDeleteConfirm');

        inputDelConfirm.oninput = (e) => {
            if (this.currentProjectToDelete && e.target.value === this.currentProjectToDelete.name) {
                btnDelete.disabled = false;
            } else {
                btnDelete.disabled = true;
            }
        };

        btnDelete.onclick = async () => {
            if (!this.currentProjectToDelete) return;
            btnDelete.innerHTML = 'Deleting...';

            const res = await this.projectService.deleteProject(this.currentProjectToDelete.id);
            if (res.success) {
                await this.loadProjects();
                deleteModal.close();
            } else {
                alert('Delete Failed: ' + (res.message || 'Unknown error'));
            }
            btnDelete.innerHTML = '我已知晓后果，删除此项目';
        };

        // UI Handlers for dynamic cards (Delegation or re-binding)
        // Implemented inside renderGrid
    }

    async loadProjects() {
        const grid = document.getElementById('project-grid');
        try {
            this.projects = await this.projectService.getProjects();
            this.renderGrid(grid);
        } catch (error) {
            console.error(error);
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-red-400">Error loading projects</div>`;
        }
    }

    renderGrid(container) {
        if (this.projects.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    </div>
                    <h3 class="text-lg font-medium text-slate-900">暂无项目</h3>
                    <p class="text-slate-500 mt-1 mb-6 max-w-sm text-center">您的工作台空空如也。创建一个新项目开始设计流程吧。</p>
                    <button onclick="document.getElementById('btnNewProject').click()" class="text-blue-600 hover:text-blue-700 font-medium text-sm">立即创建 →</button>
                </div>`;
            return;
        }

        container.innerHTML = this.projects.map(p => `
            <div class="project-card group bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-200 hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden relative" onclick="window.location.hash='#/editor/${p.id}'">
                <!-- Action Menu Trigger (GitHub Style) -->
                <button class="btn-more-options absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all z-20" data-id="${p.id}" title="更多操作">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>

                <!-- Cover Area -->
                <div class="card-clickable h-36 bg-slate-50 group-hover:bg-blue-50/30 border-b border-slate-100 transition-colors relative flex items-center justify-center" data-id="${p.id}">
                    <div class="text-slate-300 group-hover:text-blue-400 transition-colors transform group-hover:scale-110 duration-500">
                        <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    </div>
                </div>

                <!-- Info Area -->
                <div class="card-clickable p-5" data-id="${p.id}">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-slate-800 truncate text-lg pr-4 group-hover:text-blue-600 transition-colors">${p.name}</h3>
                        <span class="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-100">V${p.version || '1.0'}</span>
                    </div>
                    <p class="text-slate-400 text-xs mb-4 line-clamp-2 h-8">${p.desc || '暂无描述信息'}</p>
                    <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div class="flex items-center gap-2">
                            <div class="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-[8px] text-white font-bold">
                                ${p.owner ? p.owner.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span class="text-xs text-slate-500 font-medium">${p.owner || 'Unknown'}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-mono">${p.updatedAt}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // 1. Bind Card Clicks (Open Editor)
        container.querySelectorAll('.card-clickable').forEach(el => {
            el.onclick = (e) => {
                const id = el.dataset.id;
                window.location.hash = `#/editor/${id}`;
            };
        });

        // 2. Bind Menu Clicks (Stop Propagation -> Show Context Menu)
        container.querySelectorAll('.btn-more-options').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault(); // Prevent accidental form submits or link follows
                e.stopPropagation(); // CRITICAL: Stop card click

                // Safest way to get the button that has the listener content
                const id = String(e.currentTarget.dataset.id);
                console.log('[Dashboard] Menu Click ID:', id);

                // Use loose comparison or string conversion to be safe
                const project = this.projects.find(p => String(p.id) === id);

                if (!project) {
                    console.error('[Dashboard] Project not found in memory:', id, this.projects);
                    return;
                }

                this.showActionMenu(project);
            };
        });
    }

    showActionMenu(project) {
        // A quick and dirty way to show actions: Use the Edit modal as entry or a custom overlay.
        // Let's create a temporary overlay logic here or reused browser default? 
        // Browser default confirm is ugly.
        // Let's auto-open Edit Modal but with a "Delete" button inside it? 
        // OR: Create a small Context Menu element.

        // Strategy: Open "Edit Project" modal, but add a danger "Delete Project" link at the bottom.

        this.currentProjectToEdit = project;
        this.currentProjectToDelete = project; // Pre-set for delete flow

        // Populate inputs
        document.getElementById('editProjectName').value = project.name;
        document.getElementById('editProjectDesc').value = project.desc || '';

        // Show Edit Modal
        const editModal = document.getElementById('editProjectModal');
        editModal.classList.remove('hidden');
        setTimeout(() => {
            editModal.classList.remove('opacity-0');
            document.getElementById('editModalContent').classList.remove('scale-95');
        }, 10);

        // Inject a "Delete" button into the Edit Modal footer if not valid (hacky but fast)
        // Or better: Let's clean up render. The Edit Modal should probably have "Delete" text.

        // Revised Strategy: 
        // To strictly follow "Premium", we should have a dropdown. 
        // For this iteration, clicking "..." will open the "Edit Details" modal, 
        // AND inside that modal, there is a red "Delete Project" button at the bottom left.

        const footer = document.querySelector('#editModalContent .flex.justify-end');
        let delBtn = document.getElementById('btnTriggerDeleteConfig');

        // Always recreate or reset to correctly bind the CLOSURE variable 'project' (this.currentProjectToDelete)
        if (delBtn) {
            delBtn.remove(); // Remove old button to prevent multi-binding or closure staleness
        }

        delBtn = document.createElement('button');
        delBtn.id = 'btnTriggerDeleteConfig';
        delBtn.className = 'mr-auto text-red-500 hover:text-red-700 text-sm font-medium transition-colors';
        delBtn.innerText = '删除此项目';
        footer.prepend(delBtn);

        delBtn.onclick = () => {
            // Close edit, Open Delete
            const em = document.getElementById('editProjectModal');
            em.classList.add('opacity-0');
            setTimeout(() => em.classList.add('hidden'), 200);

            // Open Delete
            this.currentProjectToDelete = project; // Ensure strictly set
            const dm = document.getElementById('deleteProjectModal');
            document.getElementById('delProjectNameDisplay').innerText = project.name;
            document.getElementById('inputDeleteConfirm').value = '';
            document.getElementById('btnConfirmDelete').disabled = true;

            dm.classList.remove('hidden');
            setTimeout(() => {
                dm.classList.remove('opacity-0');
                document.getElementById('deleteModalContent').classList.remove('scale-95');
                document.getElementById('inputDeleteConfirm').focus();
            }, 200);
        };
    }
}
