/**
 * Store - Manages State and Persistence
 */
import { getTodayISO } from '../utils/dates.js';
import { shouldGenerateTask, parseRecurrence } from './recurrence.js';

const STORAGE_KEY = 'planner_data';

const defaultState = {
    asap: [],
    scheduled: {}, // { "YYYY-MM-DD": [] }
    recurring: [], // { id, text, rule, lastGenerated }
    lastOpened: null
};

class Store {
    constructor() {
        this.data = JSON.parse(JSON.stringify(defaultState));
        this.listeners = [];
    }

    init() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                this.data = JSON.parse(raw);
                // Schema migrations/defensive checks could go here
                if (!this.data.asap) this.data.asap = [];
                if (!this.data.scheduled) this.data.scheduled = {};
                if (!this.data.recurring) this.data.recurring = [];
            } catch (e) {
                console.error('Data corruption, resetting.', e);
                this.reset();
            }
        } else {
            this.reset();
        }

        this.performMaintenance();
        this.save();
    }

    reset() {
        this.data = JSON.parse(JSON.stringify(defaultState));
        this.data.lastOpened = getTodayISO();
        this.save();
        this.notify();
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(fn => fn(this.data));
    }

    performMaintenance() {
        const today = getTodayISO();

        // 1. Prune old scheduled tasks
        const dates = Object.keys(this.data.scheduled);
        dates.forEach(dateStr => {
            if (dateStr < today) {
                delete this.data.scheduled[dateStr];
            }
        });

        // 2. Process Recurring Tasks
        let recurringChanged = false;
        this.data.recurring.forEach(rule => {
            if (shouldGenerateTask(rule, today)) {
                // Add to scheduled for today
                this.addScheduled(rule.text, today, false); // false = don't check recurrence inside
                rule.lastGenerated = today;
                recurringChanged = true;
            }
        });

        this.data.lastOpened = today;

        if (recurringChanged) {
            this.save();
            this.notify();
        }
    }

    /**
     * @param {string} text 
     * @returns {Object} The created task
     */
    addAsap(text) {
        // Check recurrence
        const recur = parseRecurrence(text);
        if (recur) {
            this.addRecurring(recur.cleanText, recur.rule);
            text = recur.cleanText;
        }

        const task = {
            id: Date.now().toString(),
            text,
            completed: false,
            createdAt: Date.now()
        };
        this.data.asap.push(task);
        this.save();
        this.notify();
        return task;
    }

    addScheduled(text, dateStr, checkRecurrence = true) {
        if (checkRecurrence) {
            const recur = parseRecurrence(text);
            if (recur) {
                this.addRecurring(recur.cleanText, recur.rule);
                text = recur.cleanText;
            }
        }

        if (!this.data.scheduled[dateStr]) {
            this.data.scheduled[dateStr] = [];
        }

        const task = {
            // Ensure unique ID even if added in same ms
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            text,
            completed: false,
            createdAt: Date.now()
        };
        this.data.scheduled[dateStr].push(task);
        this.save();
        this.notify();
        return task;
    }

    addRecurring(text, rule) {
        const newRule = {
            id: Date.now().toString(),
            text,
            rule,
            lastGenerated: getTodayISO()
        };
        this.data.recurring.push(newRule);
        this.save();
        this.notify();
    }

    deleteRecurrence(id) {
        this.data.recurring = this.data.recurring.filter(r => r.id !== id);
        this.save();
        this.notify();
    }

    removeTask(id, listType, dateStr = null, silent = false) {
        if (listType === 'asap') {
            this.data.asap = this.data.asap.filter(t => t.id !== id);
        } else if (listType === 'scheduled' && dateStr) {
            if (this.data.scheduled[dateStr]) {
                this.data.scheduled[dateStr] = this.data.scheduled[dateStr].filter(t => t.id !== id);
                if (this.data.scheduled[dateStr].length === 0) {
                    delete this.data.scheduled[dateStr];
                }
            }
        }
        this.save();
        if (!silent) this.notify();
    }

    moveTask(id, listType, fromDateStr, targetDateStr) {
        let task = null;
        if (listType === 'asap') {
            task = this.data.asap.find(t => t.id === id);
        } else if (this.data.scheduled[fromDateStr]) {
            task = this.data.scheduled[fromDateStr].find(t => t.id === id);
        }

        if (!task) return;

        // Remove without notifying
        this.removeTask(id, listType, fromDateStr, true);

        // Add to new (this triggers notify)
        this.addScheduled(task.text, targetDateStr, false);
    }

    reorderTask(listType, dateStr, fromIndex, toIndex) {
        let list = null;
        if (listType === 'asap') {
            list = this.data.asap;
        } else if (listType === 'scheduled' && dateStr) {
            list = this.data.scheduled[dateStr];
        }

        if (!list || fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
            return;
        }

        const [movedItem] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, movedItem);

        this.save();
        this.notify();
    }
}

export const store = new Store();
