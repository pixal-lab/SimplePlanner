/**
 * Recurrence Logic
 */
export const RECURRENCE_RULES = {
    '/d': 'd', // Daily
    '/w': 'w', // Weekly
    '/m': 'm'  // Monthly
};

/**
 * Parses a task text to see if it contains recurrence tags.
 * @param {string} text 
 * @returns {Object|null} { rule, cleanText } or null
 */
export const parseRecurrence = (text) => {
    for (const [tag, rule] of Object.entries(RECURRENCE_RULES)) {
        if (text.includes(tag)) {
            return {
                rule,
                cleanText: text.replace(tag, '').trim()
            };
        }
    }
    return null;
};

/**
 * Determines if a recurring task should be generated for today.
 * @param {Object} rule - The recurring rule object { id, text, rule, lastGenerated }
 * @param {string} todayISO - Today's date in YYYY-MM-DD
 * @returns {boolean}
 */
export const shouldGenerateTask = (rule, todayISO) => {
    const lastGen = rule.lastGenerated || '1970-01-01';

    // If already generated today or in future (unlikely), skip
    if (lastGen >= todayISO) return false;

    // Simple logic for checking if we should generate
    // 'd' (daily) -> Always yes if not generated today
    if (rule.rule === 'd') return true;

    const todayDate = new Date();
    const createdDate = new Date(parseInt(rule.id)); // ID is timestamp

    // 'w' (weekly) -> Check same day of week
    if (rule.rule === 'w') {
        return todayDate.getDay() === createdDate.getDay();
    }

    // 'm' (monthly) -> Check same day of month
    if (rule.rule === 'm') {
        return todayDate.getDate() === createdDate.getDate();
    }

    return false;
};
