import { AuthService } from './AuthService.js';

export class LoginView {
    constructor() {
        this.authService = new AuthService();
    }

    render() {
        return `
            <div class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
                <!-- Background Decoration -->
                <div class="absolute -top-20 -left-20 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                <div class="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

                <div class="bg-white p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md border border-slate-100 relative z-10 transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                    <div class="text-center mb-10">
                        <div class="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <h2 class="text-3xl font-bold text-slate-800 tracking-tight">欢迎回来</h2>
                        <p class="text-slate-400 mt-2 text-sm">Goldmine V3 流程设计引擎</p>
                    </div>

                    <form id="loginForm" class="space-y-6">
                        <div>
                            <label class="block text-slate-500 text-xs font-bold mb-2 uppercase tracking-wide">用户名 / Username</label>
                            <input type="text" id="username" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400" placeholder="请输入用户名" required>
                        </div>
                        <div>
                            <label class="block text-slate-500 text-xs font-bold mb-2 uppercase tracking-wide">密码 / Password</label>
                            <input type="password" id="password" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400" placeholder="••••••••" required>
                        </div>
                        
                        <div class="flex items-center justify-between text-sm">
                            <label class="flex items-center text-slate-500 cursor-pointer hover:text-slate-700">
                                <input type="checkbox" class="mr-2 text-blue-600 rounded focus:ring-blue-500 border-gray-300">
                                <span>记住我</span>
                            </label>
                            <a href="#" class="text-blue-600 hover:text-blue-700 font-medium transition-colors">忘记密码?</a>
                        </div>

                        <button type="submit" id="btnLogin" class="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-slate-900/20 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2">
                            <span>登 录</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                    </form>
                    
                    <p class="mt-8 text-center text-sm text-slate-400">
                        可以使用默认账号 <span class="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">santaalex</span> / <span class="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">123456</span>
                    </p>
                </div>
            </div>
        `;
    }

    afterRender() {
        const form = document.getElementById('loginForm');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const btnLogin = document.getElementById('btnLogin');

        // Auto-fill for convenience (Remove in production)
        usernameInput.value = 'santaalex';
        passwordInput.value = '123456';

        form.onsubmit = async (e) => {
            e.preventDefault();
            const username = usernameInput.value;
            const password = passwordInput.value;

            btnLogin.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 登录中...';
            btnLogin.disabled = true;
            btnLogin.classList.add('opacity-80', 'cursor-not-allowed');

            await this.handleLogin(username, password);

            btnLogin.innerHTML = '<span>登 录</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>';
            btnLogin.disabled = false;
            btnLogin.classList.remove('opacity-80', 'cursor-not-allowed');
        };
    }

    async handleLogin(username, password) {
        // 1. Login Check
        const result = await this.authService.login(username, password);

        if (result.success) {
            console.log('Login Success:', result.user);

            // 2. Identity Verification (Double Check with V3)
            const verifyRes = await this.authService.verifyIdentity(username, result.user.nickname); // Use nickname from login result

            if (verifyRes.success) {
                // Store User Info
                const userData = {
                    ...result.user,
                    rowId: verifyRes.rowId || result.user.rowId // Ensure we have the latest rowId
                };
                localStorage.setItem('user', JSON.stringify(userData));

                // Show Success Toast (Mock)
                // alert(`登录成功，欢迎回来 ${userData.nickname}!`);

                // Navigate
                window.location.hash = '#/dashboard';
            } else {
                alert(`安全校验失败: ${verifyRes.message}`);
            }
        } else {
            alert(`登录失败: ${result.message}`);
        }
    }
}
