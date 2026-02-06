/**
 * Planner App Logic
 * 
 * Features:
 * - LocalStorage Persistence
 * - ASAP vs Scheduled tasks
 * - Auto-cleanup of past days on init
 * - Auto-cleanup of completed tasks
 * - Dark Mode
 * - Recurring Tasks (/d, /w, /m)
 * - Move to Tomorrow
 */

// --- Constants & Config ---
const STORAGE_KEY = 'planner_data';
const THEME_KEY = 'planner_theme';
const ANIMATION_DELAY = 1500;

// --- State Management ---
const Store = {
    data: {
        asap: [],
        scheduled: {}, // { "YYYY-MM-DD": [] }
        recurring: [], // { id, text, rule, lastGenerated }
        lastOpened: null
    },

    init() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                this.data = JSON.parse(raw);
            } catch (e) {
                console.error('Data corruption, resetting.', e);
                this.reset();
            }
        }

        // Structure integrity
        if (!this.data.asap) this.data.asap = [];
        if (!this.data.scheduled) this.data.scheduled = {};
        if (!this.data.recurring) this.data.recurring = [];

        this.pruneOldTasks();
        this.processRecurring();

        this.data.lastOpened = DateUtils.getToday();
        this.save();
    },

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    },

    reset() {
        this.data = { asap: [], scheduled: {}, recurring: [], lastOpened: DateUtils.getToday() };
        this.save();
    },

    pruneOldTasks() {
        const today = DateUtils.getToday();
        const dates = Object.keys(this.data.scheduled);

        dates.forEach(dateStr => {
            if (dateStr < today) {
                delete this.data.scheduled[dateStr];
            }
        });
    },

    processRecurring() {
        const today = DateUtils.getToday();

        this.data.recurring.forEach(rule => {
            const lastGen = rule.lastGenerated || '1970-01-01'; // Default old date
            if (lastGen >= today) return; // Already generated for today or future

            // Simple logic: if lastGen < today, we MIGHT need to generate.
            // But we should only generate IF the cycle matches.
            // For simplicity in this v1:
            // - /d: Generate if missing for today.
            // - /w: Generate if today is same weekday.
            // - /m: Generate if today is same day of month.

            // NOTE: This runs on startup. If I didn't open app for a week, 
            // do I want 7 daily tasks? Probably NO. Just one for today.
            // Minimalist approach: "If today matches rule AND we haven't generated for TODAY yet, add it."

            let shouldGenerate = false;
            const todayDate = new Date();

            if (rule.rule === 'd') {
                shouldGenerate = true;
            } else if (rule.rule === 'w') {
                // Check if last generated was less than today AND today is same weekday
                // Actually, just check if today is correct weekday? 
                // We assume user created it on a valid day.
                // Let's store 'createdDay' or just use current day.
                // Simpler: Just generate if not already generated TODAY.
                // Wait, /w means "Every Wednesday". If today is Wed, gen.
                // But we don't know needed weekday from simple '/w' string unless we parse creation date.
                // IMPROVEMENT: Store the target weekday in the rule.
                // For now, let's assume '/d' is the main use case requested.
                // Let's refine parsing: Recurrence is added TODAy. 
                // So if I add /w on Wed, it means Every Wed.

                const created = new Date(parseInt(rule.id)); // ID is timestamp
                if (todayDate.getDay() === created.getDay()) shouldGenerate = true;
            } else if (rule.rule === 'm') {
                const created = new Date(parseInt(rule.id));
                if (todayDate.getDate() === created.getDate()) shouldGenerate = true;
            }

            if (shouldGenerate) {
                // Check if we already have this task text in today's listing to avoid dupe?
                // Or just trust 'lastGenerated'. 
                // Trust lastGenerated. 

                this.addScheduled(rule.text, today);
                rule.lastGenerated = today;
            }
        });
        this.save();
    },

    addAsap(text) {
        // Check recurrence tags
        const recur = this.parseRecurrence(text);
        if (recur) {
            this.addRecurring(recur.cleanText, recur.rule);
            text = recur.cleanText;
            // Continue to add the instance
        }

        const task = {
            id: Date.now().toString(),
            text,
            completed: false,
            createdAt: Date.now()
        };
        this.data.asap.push(task);
        this.save();
        return task;
    },

    addScheduled(text, dateStr) {
        // Check recurrence tags
        const recur = this.parseRecurrence(text);
        if (recur) {
            this.addRecurring(recur.cleanText, recur.rule);
            text = recur.cleanText;
        }

        if (!this.data.scheduled[dateStr]) {
            this.data.scheduled[dateStr] = [];
        }
        const task = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5), // Unique ID in loop
            text,
            completed: false,
            createdAt: Date.now()
        };
        this.data.scheduled[dateStr].push(task);
        this.save();
        return task;
    },

    addRecurring(text, rule) {
        this.data.recurring.push({
            id: Date.now().toString(),
            text,
            rule,
            lastGenerated: DateUtils.getToday() // Mark today as generated since we create instance now
        });
        this.save();
    },

    deleteRecurrence(id) {
        this.data.recurring = this.data.recurring.filter(r => r.id !== id);
        this.save();
    },

    parseRecurrence(text) {
        const rules = { '/d': 'd', '/w': 'w', '/m': 'm' };
        for (const [tag, rule] of Object.entries(rules)) {
            if (text.includes(tag)) {
                return {
                    rule,
                    cleanText: text.replace(tag, '').trim()
                };
            }
        }
        return null;
    },

    removeTask(id, listType, dateStr = null) {
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
    },

    moveTaskToNextDay(id, listType, dateStr) {
        // Find task
        let task = null;
        if (listType === 'asap') {
            task = this.data.asap.find(t => t.id === id);
        } else if (this.data.scheduled[dateStr]) {
            task = this.data.scheduled[dateStr].find(t => t.id === id);
        }

        if (!task) return;

        // Remove from old
        this.removeTask(id, listType, dateStr);

        // Calculate Target Date:
        // If it was ASAP, move to 'Tomorrow' from Today.
        // If it was Scheduled (e.g. 2025-02-10), move to 2025-02-11.
        let targetDate;

        if (listType === 'asap') {
            targetDate = DateUtils.getTomorrow();
        } else {
            // Get date object from string
            const current = new Date(dateStr + 'T12:00:00');
            // Add 1 day
            current.setDate(current.getDate() + 1);
            targetDate = DateUtils.format(current);
        }

        // Add to new date
        this.addScheduled(task.text, targetDate);
    }
};

// --- Date Utilities ---
const DateUtils = {
    getToday() {
        const d = new Date();
        return this.format(d);
    },

    getTomorrow() {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return this.format(d);
    },

    format(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    getDisplayDate(dateStr) {
        const today = this.getToday();
        const tomorrow = this.getTomorrow();

        if (dateStr === today) return 'Hoy';
        if (dateStr === tomorrow) return 'Mañana';

        const date = new Date(dateStr + 'T12:00:00');
        const options = { weekday: 'long', day: 'numeric', month: 'short' };
        const s = date.toLocaleDateString('es-ES', options);
        return s.charAt(0).toUpperCase() + s.slice(1);
    },

    getFullHeaderDate() {
        const date = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const s = date.toLocaleDateString('es-ES', options);
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
};

// --- Theme Manager ---
const Theme = {
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
        toggleBtn.addEventListener('click', () => this.toggle());
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
    }
};

// --- UI Logic ---
const UI = {
    selectedDateType: 'asap', // 'asap', 'today', 'tomorrow', 'custom'
    customDateVal: null,

    init() {
        Theme.init(); // Init Theme

        // Render Header
        document.getElementById('currentDate').textContent = DateUtils.getFullHeaderDate();

        // Initial Render
        this.renderAll();

        // Listeners
        this.setupForm();
        this.setupDateSelectors();
        this.setupModal();

        // Sticky Header scroll
        window.addEventListener('scroll', () => {
            const inputSec = document.querySelector('.input-section');
            if (window.scrollY > 10) {
                inputSec.classList.add('scrolled');
            } else {
                inputSec.classList.remove('scrolled');
            }
        });
    },

    renderAll() {
        this.renderAsap();
        this.renderScheduled();
    },

    renderAsap() {
        const list = document.getElementById('asapList');
        list.innerHTML = '';
        Store.data.asap.forEach(task => {
            list.appendChild(this.createTaskEl(task, 'asap', null));
        });

        const section = document.getElementById('asapSection');
        section.style.display = 'block';
        if (Store.data.asap.length === 0) {
            list.innerHTML = '<li style="color:var(--text-secondary); padding:10px 0; font-size:0.9rem; font-style:italic;">No hay pendientes urgentes</li>';
        }
    },

    renderScheduled() {
        const container = document.getElementById('scheduledContainer');
        container.innerHTML = '';

        const dates = Object.keys(Store.data.scheduled).sort();
        const pendingDates = dates.filter(d => Store.data.scheduled[d].length > 0);

        const today = DateUtils.getToday();
        const tomorrow = DateUtils.getTomorrow();

        const datesToRender = new Set([...pendingDates, today, tomorrow]);
        const sortedDates = Array.from(datesToRender).sort();

        sortedDates.forEach(dateStr => {
            const tasks = Store.data.scheduled[dateStr] || [];
            if (tasks.length === 0 && dateStr > tomorrow) return;

            const section = document.createElement('section');
            section.className = 'task-group';

            const h2 = document.createElement('h2');
            h2.textContent = DateUtils.getDisplayDate(dateStr);
            section.appendChild(h2);

            const ul = document.createElement('ul');
            ul.className = 'task-list';

            if (tasks.length === 0) {
                ul.innerHTML = '<li style="color:var(--text-secondary); padding:5px 0; font-size:0.8rem;">Sin tareas</li>';
            } else {
                tasks.forEach(task => {
                    ul.appendChild(this.createTaskEl(task, 'scheduled', dateStr));
                });
            }

            section.appendChild(ul);
            container.appendChild(section);
        });
    },

    createTaskEl(task, listType, dateStr) {
        const li = document.createElement('li');
        li.className = 'task-item';
        if (task.completed) li.classList.add('completed');

        const id = `checkbox-${task.id}`;

        li.innerHTML = `
            <div class="task-content-wrapper">
                <div class="task-checkbox-wrapper">
                    <input type="checkbox" id="${id}" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="custom-checkbox"></span>
                </div>
                <span class="task-text">${task.text}</span>
            </div>
            <button class="icon-btn reschedule-btn" title="Mover a Mañana">➡️</button>
        `;

        // Checkbox listener
        const checkbox = li.querySelector('.task-checkbox');
        checkbox.addEventListener('change', (e) => {
            this.handleComplete(task.id, listType, dateStr, li, e.target.checked);
        });

        // Move Listener
        const moveBtn = li.querySelector('.reschedule-btn');
        moveBtn.addEventListener('click', () => {
            this.handleMove(task.id, listType, dateStr, li);
        });

        return li;
    },

    handleComplete(id, listType, dateStr, rowEl, isChecked) {
        rowEl.classList.toggle('completed', isChecked);
        if (isChecked) {
            setTimeout(() => {
                rowEl.classList.add('removing');
                rowEl.addEventListener('animationend', () => {
                    Store.removeTask(id, listType, dateStr);
                    if (listType === 'asap') this.renderAsap();
                    else this.renderScheduled();
                });
            }, ANIMATION_DELAY);
        }
    },

    handleMove(id, listType, dateStr, rowEl) {
        // Animate out
        rowEl.classList.add('removing');
        rowEl.addEventListener('animationend', () => {
            Store.moveTaskToNextDay(id, listType, dateStr);
            this.renderAll(); // Re-render to show updated lists
        });
    },

    setupModal() {
        const modal = document.getElementById('recurringModal');
        const openBtn = document.getElementById('manageRecurringBtn');
        const closeBtn = document.getElementById('closeModalBtn');
        const list = document.getElementById('recurringList');
        const emptyText = document.getElementById('noRecurringText');

        const renderRules = () => {
            list.innerHTML = '';
            const rules = Store.data.recurring;

            if (rules.length === 0) {
                emptyText.style.display = 'block';
            } else {
                emptyText.style.display = 'none';
                rules.forEach(rule => {
                    const li = document.createElement('li');
                    li.className = 'recurring-item';

                    const label = rule.rule === 'd' ? 'Diario' : rule.rule === 'w' ? 'Semanal' : 'Mensual';

                    li.innerHTML = `
                        <div>
                            <span class="rule-badge">${label}</span>
                            <span>${rule.text}</span>
                        </div>
                        <button class="delete-rule-btn" data-id="${rule.id}">Eliminar</button>
                     `;

                    li.querySelector('.delete-rule-btn').addEventListener('click', () => {
                        Store.deleteRecurrence(rule.id);
                        renderRules();
                    });

                    list.appendChild(li);
                });
            }
        };

        openBtn.addEventListener('click', () => {
            renderRules();
            modal.classList.remove('hidden');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    },

    setupForm() {
        const form = document.getElementById('addTaskForm');
        const input = document.getElementById('taskInput');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            if (this.selectedDateType === 'asap') {
                Store.addAsap(text);
                this.renderAsap(); // Recurrence might toggle this, but safe to render
            } else {
                let targetDate;
                if (this.selectedDateType === 'today') targetDate = DateUtils.getToday();
                else if (this.selectedDateType === 'tomorrow') targetDate = DateUtils.getTomorrow();
                else if (this.selectedDateType === 'custom') targetDate = this.customDateVal;

                if (targetDate) {
                    Store.addScheduled(text, targetDate);
                    this.renderScheduled();
                } else {
                    alert('Por favor selecciona una fecha válida');
                    return;
                }
            }

            // Always re-render scheduled just in case recurrence added something to today
            if (text.includes('/d') || text.includes('/w') || text.includes('/m')) {
                this.renderAll();
            }

            input.value = '';
            input.blur();
        });
    },

    setupDateSelectors() {
        const buttons = document.querySelectorAll('.date-btn:not(#customDateBtn)');
        const customBtn = document.getElementById('customDateBtn');
        const picker = document.getElementById('datePicker');

        const setActive = (btn) => {
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                setActive(btn);
                this.selectedDateType = btn.dataset.date;
                document.getElementById('taskInput').focus();
            });
        });

        customBtn.addEventListener('click', () => {
            picker.showPicker();
        });

        picker.addEventListener('change', (e) => {
            this.customDateVal = e.target.value;
            this.selectedDateType = 'custom';
            setActive(customBtn);
            customBtn.textContent = new Date(this.customDateVal).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            document.getElementById('taskInput').focus();
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    Store.init();
    UI.init();
});
