/**
 * Date Utility Functions
 */

export const getTodayISO = () => {
    return formatDateISO(new Date());
};

export const getTomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateISO(d);
};

export const formatDateISO = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const getDisplayDate = (dateStr) => {
    const today = getTodayISO();
    const tomorrow = getTomorrowISO();

    if (dateStr === today) return 'Hoy';
    if (dateStr === tomorrow) return 'Mañana';

    const date = new Date(dateStr + 'T12:00:00');
    // Check if valid date
    if (isNaN(date.getTime())) return dateStr;

    const options = { weekday: 'long', day: 'numeric', month: 'short' };
    const s = date.toLocaleDateString('es-ES', options);
    // Capitalize first letter
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export const getFullHeaderDate = () => {
    const date = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const s = date.toLocaleDateString('es-ES', options);
    return s.charAt(0).toUpperCase() + s.slice(1);
};
