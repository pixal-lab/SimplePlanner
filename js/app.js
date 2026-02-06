/**
 * Planner App Entry Point
 */
import { store } from './core/store.js';
import { UI } from './ui/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    store.init();
    UI.init();
});
