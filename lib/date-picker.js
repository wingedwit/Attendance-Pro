(function attachAttendanceDatePicker(globalScope) {
    const FLATPICKR_SCRIPT_SRC = './assets/vendor/flatpickr/flatpickr.min.js';

    const formatDateDDMMYYYY = (date) => {
        const safe = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
        const d = String(safe.getDate()).padStart(2, '0');
        const m = String(safe.getMonth() + 1).padStart(2, '0');
        const y = safe.getFullYear();
        return `${d}-${m}-${y}`;
    };

    const createDatePickerController = ({ datePickerEl, pills = {}, dateUtils, onDateChange, getCurrentDate }) => {
        const { parseDDMMYYYY } = dateUtils;
        let flatpickrLoadPromise = null;
        let flatpickrInstance = null;
        let datePickerOnChange = null;

        const enableFlatpickrThemeStyles = () => {
            const themeLink = document.getElementById('flatpickr-theme');
            if (!themeLink) return;
            themeLink.dataset.enabled = 'true';
            if (themeLink.dataset.pendingHref) {
                themeLink.href = themeLink.dataset.pendingHref;
            }
        };

        const upgradeDatePicker = () => {
            if (flatpickrInstance || !window.flatpickr || !datePickerEl) return;
            enableFlatpickrThemeStyles();
            flatpickrInstance = window.flatpickr(datePickerEl, { dateFormat: 'd-m-Y' });
            if (typeof datePickerOnChange === 'function') {
                flatpickrInstance.set('onChange', datePickerOnChange);
            }
            const curDate = typeof getCurrentDate === 'function' ? getCurrentDate() : datePickerEl.value;
            if (curDate) {
                flatpickrInstance.setDate(curDate, false);
            }
        };

        const ensureFlatpickrLoaded = () => {
            if (window.flatpickr) {
                upgradeDatePicker();
                return Promise.resolve(flatpickrInstance);
            }
            if (flatpickrLoadPromise) return flatpickrLoadPromise;

            enableFlatpickrThemeStyles();
            flatpickrLoadPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = FLATPICKR_SCRIPT_SRC;
                script.async = true;
                script.onload = () => {
                    upgradeDatePicker();
                    resolve(flatpickrInstance);
                };
                script.onerror = () => {
                    flatpickrLoadPromise = null;
                    reject(new Error('Failed to load flatpickr'));
                };
                document.head.appendChild(script);
            });
            return flatpickrLoadPromise;
        };

        const updatePillButtons = (activeDateStr) => {
            if (!pills) return;
            const today = new Date();
            const yest = new Date(today);
            yest.setDate(yest.getDate() - 1);
            const tom = new Date(today);
            tom.setDate(tom.getDate() + 1);

            const yestStr = formatDateDDMMYYYY(yest);
            const todayStr = formatDateDDMMYYYY(today);
            const tomStr = formatDateDDMMYYYY(tom);

            if (pills.setYesterday) pills.setYesterday.classList.toggle('active', activeDateStr === yestStr);
            if (pills.setToday) pills.setToday.classList.toggle('active', activeDateStr === todayStr);
            if (pills.setTomorrow) pills.setTomorrow.classList.toggle('active', activeDateStr === tomStr);
        };

        const setDate = (value, triggerChange = false) => {
            const dateObj = value instanceof Date ? value : (parseDDMMYYYY(value) || new Date(value));
            const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
            const formatted = formatDateDDMMYYYY(safeDate);
            if (datePickerEl) datePickerEl.value = formatted;
            if (flatpickrInstance) {
                flatpickrInstance.setDate(formatted, false);
            }
            updatePillButtons(formatted);
            if (triggerChange && typeof onDateChange === 'function') {
                onDateChange(formatted);
            }
        };

        const setDateByOffset = (offsetDays) => {
            if ('vibrate' in navigator) {
                try { navigator.vibrate(8); } catch (_) {}
            }
            const target = new Date();
            target.setDate(target.getDate() + offsetDays);
            setDate(target, true);
        };

        const open = () => {
            if (datePickerEl) datePickerEl.focus();
            if (flatpickrInstance) {
                flatpickrInstance.open();
            } else {
                ensureFlatpickrLoaded()
                    .then((fp) => {
                        if (fp) fp.open();
                    })
                    .catch(() => {});
            }
        };

        const init = () => {
            datePickerOnChange = (_, str) => {
                if (typeof onDateChange === 'function') onDateChange(str);
            };

            if (datePickerEl) {
                if (!window.flatpickr) {
                    datePickerEl.addEventListener('input', (event) => {
                        if (typeof onDateChange === 'function') onDateChange(event.target.value);
                    });
                }

                ['focus', 'pointerdown', 'touchstart'].forEach((eventName) => {
                    datePickerEl.addEventListener(eventName, () => {
                        ensureFlatpickrLoaded().catch(() => {});
                    }, { passive: true, once: true });
                });
            }

            if (pills.setYesterday) pills.setYesterday.addEventListener('click', () => setDateByOffset(-1));
            if (pills.setToday) pills.setToday.addEventListener('click', () => setDateByOffset(0));
            if (pills.setTomorrow) pills.setTomorrow.addEventListener('click', () => setDateByOffset(1));
        };

        return {
            init,
            open,
            setDate,
            setDateByOffset,
            ensureFlatpickrLoaded,
            formatDateDDMMYYYY
        };
    };

    globalScope.AttendanceDatePicker = {
        createDatePickerController,
        formatDateDDMMYYYY
    };
})(window);
