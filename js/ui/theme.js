/**
 * Theme Manager
 */
const THEME_KEY = 'planner_theme';

export const Theme = {
    init() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) {
            document.documentElement.setAttribute('data-theme', stored);
        } else {
            // Check system pref
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }

        // Listeners
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
    }
};
