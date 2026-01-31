/**
 * Router.js
 * 
 * Simple hash-based router for the App Shell.
 * Handles navigation between:
 * - Login (#/login)
 * - Dashboard (#/dashboard)
 * - Editor (#/editor/:id)
 */
import { LoginView } from './LoginView.js';
import { DashboardView } from './DashboardView.js';
import { EditorView } from './EditorView.js';

// Define Routes
const routes = {
    'login': new LoginView(),
    'dashboard': new DashboardView(),
    'editor': new EditorView()
};

export class Router {
    constructor(routes) {
        this.routes = routes;
        this.appContainer = document.getElementById('app');

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Handle initial load
        window.addEventListener('load', () => this.handleRoute());
    }

    handleRoute() {
        const hash = window.location.hash || '#/login';
        console.log(`[Router] Navigating to: ${hash}`);

        // Extract path and params (e.g., #/editor/123 -> path: /editor, id: 123)
        // Simple matching for now

        if (hash.startsWith('#/editor')) {
            const projectId = hash.split('/')[2];
            this.render('editor', { projectId });
        } else if (hash.startsWith('#/dashboard')) {
            this.render('dashboard');
        } else {
            this.render('login');
        }
    }

    async render(routeName, params = {}) {
        if (this.routes[routeName]) {
            // Unmount previous view if needed? (Simple generic innerHTML for now)
            this.appContainer.innerHTML = '';

            // Render new view
            const view = this.routes[routeName];
            const content = await view.render(params);

            if (typeof content === 'string') {
                this.appContainer.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                this.appContainer.appendChild(content);
            }

            // Execute afterRender hook if available
            if (view.afterRender) {
                view.afterRender(params);
            }
        }
    }

    navigate(path) {
        window.location.hash = path;
    }
}
