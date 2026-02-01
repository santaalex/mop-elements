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
            const id = hash.split('/')[2];
            this.render('editor', { id });
        } else if (hash.startsWith('#/dashboard')) {
            this.render('dashboard');
        } else {
            this.render('login');
        }
    }

    async render(routeName, params = {}) {
        const view = this.routes[routeName];
        if (!view) return;

        // Pattern A: Mount (Container-First) - Used by EditorView
        // This is the modern pattern where the view takes control of the container.
        if (typeof view.mount === 'function') {
            // Clear container first? Usually mount handles it, but let's ensure clean slate if needed.
            // But EditorView replaces innerHTML, so it's fine.
            await view.mount(this.appContainer, params);
            return;
        }

        // Pattern B: Render (String/Element-First) - Used by Login/Dashboard
        // This is the legacy pattern where router orchestrates placement.
        if (typeof view.render === 'function') {
            this.appContainer.innerHTML = ''; // Start clean

            const content = await view.render(params);

            if (typeof content === 'string') {
                this.appContainer.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                this.appContainer.appendChild(content);
            }

            // Execute afterRender hook if available
            if (typeof view.afterRender === 'function') {
                await view.afterRender(params);
            }
        }
    }

    navigate(path) {
        window.location.hash = path;
    }
}
