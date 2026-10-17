(function attachAttendanceDatePicker(globalScope) {
    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const MONTH_SHORT = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const WEEKDAYS = [
        { short: 'S', full: 'Sunday' },
        { short: 'M', full: 'Monday' },
        { short: 'T', full: 'Tuesday' },
        { short: 'W', full: 'Wednesday' },
        { short: 'T', full: 'Thursday' },
        { short: 'F', full: 'Friday' },
        { short: 'S', full: 'Saturday' }
    ];

    const startOfDay = (date) => {
        const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const isSameDay = (a, b) => (
        Boolean(a && b) &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );

    const formatDateDDMMYYYY = (date) => {
        const safe = startOfDay(date);
        const d = String(safe.getDate()).padStart(2, '0');
        const m = String(safe.getMonth() + 1).padStart(2, '0');
        const y = safe.getFullYear();
        return `${d}-${m}-${y}`;
    };

    const clampDayInMonth = (year, month, day) => {
        const maxDay = new Date(year, month + 1, 0).getDate();
        return Math.min(Math.max(1, day), maxDay);
    };

    const createDatePickerController = ({ datePickerEl, pills = {}, dateUtils, onDateChange, getCurrentDate, onOpen }) => {
        const { parseDDMMYYYY } = dateUtils;

        let selectedDate = startOfDay(new Date());
        let focusedDate = new Date(selectedDate);
        let viewYear = selectedDate.getFullYear();
        let viewMonth = selectedDate.getMonth();
        let focusedMonth = viewMonth;
        let viewMode = 'days'; // 'days' | 'months'
        let isOpenState = false;

        let popoverEl = null;
        let titleBtn = null;
        let titleTextEl = null;
        let prevBtn = null;
        let nextBtn = null;
        let daysViewEl = null;
        let gridEl = null;
        let monthsViewEl = null;
        const dayButtons = [];
        const monthButtons = [];

        const parseAnyDate = (value) => {
            if (value instanceof Date && !Number.isNaN(value.getTime())) {
                return startOfDay(value);
            }
            if (typeof value === 'string' && value.trim()) {
                const parsedDDMM = parseDDMMYYYY(value.trim());
                if (parsedDDMM) return startOfDay(parsedDDMM);
                const fallback = new Date(value);
                if (!Number.isNaN(fallback.getTime())) return startOfDay(fallback);
            }
            return startOfDay(new Date());
        };

        const syncSelectedFromExternal = () => {
            const raw = typeof getCurrentDate === 'function' ? getCurrentDate() : datePickerEl?.value;
            if (raw) {
                selectedDate = parseAnyDate(raw);
            }
        };

        const buildPopoverDOM = () => {
            if (popoverEl) return popoverEl;

            popoverEl = document.createElement('div');
            popoverEl.className = 'gcal-popover';
            popoverEl.setAttribute('role', 'dialog');
            popoverEl.setAttribute('aria-modal', 'false');
            popoverEl.setAttribute('aria-label', 'Choose class date');
            popoverEl.tabIndex = -1;

            // Header
            const headerEl = document.createElement('div');
            headerEl.className = 'gcal-header';

            titleBtn = document.createElement('button');
            titleBtn.type = 'button';
            titleBtn.className = 'gcal-title-btn';
            titleBtn.setAttribute('aria-live', 'polite');
            titleBtn.setAttribute('aria-expanded', 'false');
            titleBtn.title = 'Switch month or year';

            titleTextEl = document.createElement('span');
            titleTextEl.className = 'gcal-title-text';

            const caretSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            caretSvg.setAttribute('class', 'gcal-title-caret');
            caretSvg.setAttribute('viewBox', '0 0 20 20');
            caretSvg.setAttribute('fill', 'currentColor');
            caretSvg.setAttribute('aria-hidden', 'true');
            caretSvg.innerHTML = '<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>';

            titleBtn.append(titleTextEl, caretSvg);

            const navEl = document.createElement('div');
            navEl.className = 'gcal-nav';

            prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.className = 'gcal-nav-btn gcal-prev-btn';
            prevBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 15L7.5 10L12.5 5"/></svg>';

            nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.className = 'gcal-nav-btn gcal-next-btn';
            nextBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 15L12.5 10L7.5 5"/></svg>';

            navEl.append(prevBtn, nextBtn);
            headerEl.append(titleBtn, navEl);

            // Days view
            daysViewEl = document.createElement('div');
            daysViewEl.className = 'gcal-days-view';

            const weekdaysEl = document.createElement('div');
            weekdaysEl.className = 'gcal-weekdays';
            weekdaysEl.setAttribute('role', 'row');
            WEEKDAYS.forEach(({ short, full }) => {
                const span = document.createElement('span');
                span.className = 'gcal-weekday';
                span.textContent = short;
                span.setAttribute('aria-label', full);
                span.title = full;
                weekdaysEl.appendChild(span);
            });

            gridEl = document.createElement('div');
            gridEl.className = 'gcal-grid';
            gridEl.setAttribute('role', 'grid');
            gridEl.setAttribute('aria-label', 'Calendar dates');

            for (let i = 0; i < 42; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gcal-day';
                btn.dataset.index = String(i);
                dayButtons.push(btn);
                gridEl.appendChild(btn);
            }

            daysViewEl.append(weekdaysEl, gridEl);

            // Months view (hidden by default, replaces daysViewEl in-place when toggled)
            monthsViewEl = document.createElement('div');
            monthsViewEl.className = 'gcal-months-view hidden';
            monthsViewEl.hidden = true;
            monthsViewEl.setAttribute('role', 'grid');
            monthsViewEl.setAttribute('aria-label', 'Select month');

            for (let m = 0; m < 12; m++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gcal-month-cell';
                btn.dataset.month = String(m);
                btn.textContent = MONTH_SHORT[m];
                btn.setAttribute('aria-label', MONTH_NAMES[m]);
                monthButtons.push(btn);
                monthsViewEl.appendChild(btn);
            }

            popoverEl.append(headerEl, daysViewEl, monthsViewEl);
            document.body.appendChild(popoverEl);

            // Event Listeners inside Popover
            titleBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleViewMode();
            });

            prevBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (viewMode === 'months') {
                    stepYear(-1);
                } else {
                    stepMonth(-1);
                }
            });

            nextBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (viewMode === 'months') {
                    stepYear(1);
                } else {
                    stepMonth(1);
                }
            });

            gridEl.addEventListener('click', (event) => {
                const btn = event.target.closest('.gcal-day');
                if (!btn) return;
                event.stopPropagation();
                const y = Number(btn.dataset.year);
                const m = Number(btn.dataset.month);
                const d = Number(btn.dataset.day);
                if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
                    commitDateSelection(new Date(y, m, d));
                }
            });

            monthsViewEl.addEventListener('click', (event) => {
                const btn = event.target.closest('.gcal-month-cell');
                if (!btn) return;
                event.stopPropagation();
                const m = Number(btn.dataset.month);
                if (!Number.isNaN(m)) {
                    viewMonth = m;
                    focusedMonth = m;
                    const clampedDay = clampDayInMonth(viewYear, viewMonth, focusedDate.getDate());
                    focusedDate = new Date(viewYear, viewMonth, clampedDay);
                    setViewMode('days', true);
                }
            });

            popoverEl.addEventListener('keydown', handlePopoverKeydown);
            return popoverEl;
        };

        const renderDaysGrid = (moveFocusToDay = false) => {
            const today = startOfDay(new Date());
            const firstOfMonth = new Date(viewYear, viewMonth, 1);
            const startOffset = firstOfMonth.getDay();

            titleTextEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
            titleBtn.setAttribute('aria-expanded', 'false');
            prevBtn.setAttribute('aria-label', 'Previous month');
            prevBtn.title = 'Previous month';
            nextBtn.setAttribute('aria-label', 'Next month');
            nextBtn.title = 'Next month';

            let buttonToFocus = null;

            for (let i = 0; i < 42; i++) {
                const cellDate = new Date(viewYear, viewMonth, 1 - startOffset + i);
                const btn = dayButtons[i];
                const isOutside = cellDate.getMonth() !== viewMonth;
                const isToday = isSameDay(cellDate, today);
                const isSelected = isSameDay(cellDate, selectedDate);
                const isFocused = isSameDay(cellDate, focusedDate);

                btn.textContent = String(cellDate.getDate());
                btn.dataset.year = String(cellDate.getFullYear());
                btn.dataset.month = String(cellDate.getMonth());
                btn.dataset.day = String(cellDate.getDate());

                btn.classList.toggle('is-outside', isOutside);
                btn.classList.toggle('is-today', isToday);
                btn.classList.toggle('is-selected', isSelected);
                btn.classList.toggle('is-focused', isFocused);

                btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                if (isToday) {
                    btn.setAttribute('aria-current', 'date');
                } else {
                    btn.removeAttribute('aria-current');
                }
                btn.setAttribute(
                    'aria-label',
                    `${cellDate.getDate()} ${MONTH_NAMES[cellDate.getMonth()]} ${cellDate.getFullYear()}`
                );
                btn.tabIndex = isFocused ? 0 : -1;

                if (isFocused) {
                    buttonToFocus = btn;
                }
            }

            if (moveFocusToDay && buttonToFocus && isOpenState) {
                buttonToFocus.focus({ preventScroll: true });
            }
        };

        const renderMonthsGrid = (moveFocusToMonth = false) => {
            const today = startOfDay(new Date());
            titleTextEl.textContent = `${viewYear}`;
            titleBtn.setAttribute('aria-expanded', 'true');
            prevBtn.setAttribute('aria-label', 'Previous year');
            prevBtn.title = 'Previous year';
            nextBtn.setAttribute('aria-label', 'Next year');
            nextBtn.title = 'Next year';

            let buttonToFocus = null;

            for (let m = 0; m < 12; m++) {
                const btn = monthButtons[m];
                const isCurrentMonth = viewYear === today.getFullYear() && m === today.getMonth();
                const isSelectedMonth = viewYear === selectedDate.getFullYear() && m === selectedDate.getMonth();
                const isFocusedMonth = m === focusedMonth;

                btn.classList.toggle('is-today', isCurrentMonth);
                btn.classList.toggle('is-selected', isSelectedMonth);
                btn.classList.toggle('is-focused', isFocusedMonth);
                btn.setAttribute('aria-selected', isSelectedMonth ? 'true' : 'false');
                btn.setAttribute('aria-label', `${MONTH_NAMES[m]} ${viewYear}`);
                btn.tabIndex = isFocusedMonth ? 0 : -1;

                if (isFocusedMonth) {
                    buttonToFocus = btn;
                }
            }

            if (moveFocusToMonth && buttonToFocus && isOpenState) {
                buttonToFocus.focus({ preventScroll: true });
            }
        };

        const setViewMode = (nextMode, moveFocus = false) => {
            viewMode = nextMode;
            if (!popoverEl) return;
            const isMonths = viewMode === 'months';
            daysViewEl.classList.toggle('hidden', isMonths);
            daysViewEl.hidden = isMonths;
            monthsViewEl.classList.toggle('hidden', !isMonths);
            monthsViewEl.hidden = !isMonths;
            popoverEl.classList.toggle('is-months-mode', isMonths);

            if (isMonths) {
                focusedMonth = viewMonth;
                renderMonthsGrid(moveFocus);
            } else {
                renderDaysGrid(moveFocus);
            }
        };

        const toggleViewMode = () => {
            setViewMode(viewMode === 'days' ? 'months' : 'days', true);
        };

        const stepMonth = (deltaMonths, moveFocus = false) => {
            const targetFirst = new Date(viewYear, viewMonth + deltaMonths, 1);
            viewYear = targetFirst.getFullYear();
            viewMonth = targetFirst.getMonth();
            const clampedDay = clampDayInMonth(viewYear, viewMonth, focusedDate.getDate());
            focusedDate = new Date(viewYear, viewMonth, clampedDay);
            renderDaysGrid(moveFocus);
        };

        const stepYear = (deltaYears, moveFocus = false) => {
            viewYear += deltaYears;
            const clampedDay = clampDayInMonth(viewYear, viewMonth, focusedDate.getDate());
            focusedDate = new Date(viewYear, viewMonth, clampedDay);
            if (viewMode === 'months') {
                renderMonthsGrid(moveFocus);
            } else {
                renderDaysGrid(moveFocus);
            }
        };

        const moveFocusedDayBy = (deltaDays) => {
            const next = new Date(focusedDate);
            next.setDate(next.getDate() + deltaDays);
            focusedDate = startOfDay(next);
            viewYear = focusedDate.getFullYear();
            viewMonth = focusedDate.getMonth();
            renderDaysGrid(true);
        };

        const moveFocusedMonthBy = (deltaMonths) => {
            const totalMonths = viewYear * 12 + focusedMonth + deltaMonths;
            viewYear = Math.floor(totalMonths / 12);
            focusedMonth = ((totalMonths % 12) + 12) % 12;
            viewMonth = focusedMonth;
            renderMonthsGrid(true);
        };

        const positionPopover = () => {
            if (!popoverEl || !datePickerEl || !isOpenState) return;
            const rect = datePickerEl.getBoundingClientRect();
            const popWidth = popoverEl.offsetWidth || 284;
            const popHeight = popoverEl.offsetHeight || 292;
            const margin = 8;
            const viewportPad = 12;

            let top = rect.bottom + margin;
            let placeAbove = false;

            if (top + popHeight > window.innerHeight - viewportPad && rect.top - popHeight - margin > viewportPad) {
                top = rect.top - popHeight - margin;
                placeAbove = true;
            }

            let left = rect.left;
            if (left + popWidth > window.innerWidth - viewportPad) {
                left = Math.max(viewportPad, window.innerWidth - popWidth - viewportPad);
            }
            if (left < viewportPad) {
                left = viewportPad;
            }

            popoverEl.classList.toggle('gcal-above', placeAbove);
            popoverEl.style.top = `${Math.round(top)}px`;
            popoverEl.style.left = `${Math.round(left)}px`;
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

        const commitDateSelection = (dateObj) => {
            if ('vibrate' in navigator) {
                try { navigator.vibrate(6); } catch (_) {}
            }
            setDate(dateObj, true);
            close({ restoreFocus: true });
        };

        const setDate = (value, triggerChange = false) => {
            const safeDate = parseAnyDate(value);
            selectedDate = safeDate;
            focusedDate = new Date(safeDate);
            viewYear = safeDate.getFullYear();
            viewMonth = safeDate.getMonth();
            focusedMonth = viewMonth;

            const formatted = formatDateDDMMYYYY(safeDate);
            if (datePickerEl) {
                datePickerEl.value = formatted;
            }
            if (popoverEl && isOpenState) {
                if (viewMode === 'months') {
                    renderMonthsGrid(false);
                } else {
                    renderDaysGrid(false);
                }
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
            if (isOpenState) {
                close({ restoreFocus: false });
            }
        };

        const handleOutsidePointerDown = (event) => {
            if (!isOpenState || !popoverEl) return;
            const target = event.target;
            if (popoverEl.contains(target) || (datePickerEl && datePickerEl.contains(target))) {
                return;
            }
            close({ restoreFocus: false });
        };

        const handleViewportChange = () => {
            if (isOpenState) {
                positionPopover();
            }
        };

        const open = ({ focusCalendar = true } = {}) => {
            if (typeof onOpen === 'function') {
                onOpen();
            }
            buildPopoverDOM();
            syncSelectedFromExternal();
            focusedDate = new Date(selectedDate);
            viewYear = selectedDate.getFullYear();
            viewMonth = selectedDate.getMonth();
            focusedMonth = viewMonth;

            isOpenState = true;
            popoverEl.classList.add('open');
            if (datePickerEl) {
                datePickerEl.setAttribute('aria-expanded', 'true');
            }

            setViewMode('days', focusCalendar);
            positionPopover();

            document.addEventListener('pointerdown', handleOutsidePointerDown, true);
            window.addEventListener('resize', handleViewportChange, { passive: true });
            window.addEventListener('scroll', handleViewportChange, true);
        };

        const close = ({ restoreFocus = false } = {}) => {
            if (!isOpenState) return;
            isOpenState = false;
            if (popoverEl) {
                popoverEl.classList.remove('open');
            }
            if (datePickerEl) {
                datePickerEl.setAttribute('aria-expanded', 'false');
                if (restoreFocus) {
                    datePickerEl.focus({ preventScroll: true });
                }
            }
            document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };

        const handleEscape = () => {
            if (!isOpenState) return false;
            if (viewMode === 'months') {
                setViewMode('days', true);
                return true;
            }
            close({ restoreFocus: true });
            return true;
        };

        const handlePopoverKeydown = (event) => {
            if (!isOpenState) return;
            if (event.altKey || event.ctrlKey || event.metaKey) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                handleEscape();
                return;
            }

            if (viewMode === 'months') {
                switch (event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        event.stopPropagation();
                        moveFocusedMonthBy(-1);
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        event.stopPropagation();
                        moveFocusedMonthBy(1);
                        break;
                    case 'ArrowUp':
                        event.preventDefault();
                        event.stopPropagation();
                        moveFocusedMonthBy(-3);
                        break;
                    case 'ArrowDown':
                        event.preventDefault();
                        event.stopPropagation();
                        moveFocusedMonthBy(3);
                        break;
                    case 'PageUp':
                        event.preventDefault();
                        event.stopPropagation();
                        stepYear(-1, true);
                        break;
                    case 'PageDown':
                        event.preventDefault();
                        event.stopPropagation();
                        stepYear(1, true);
                        break;
                    case 'Enter':
                    case ' ':
                        if (document.activeElement?.classList.contains('gcal-month-cell')) {
                            event.preventDefault();
                            event.stopPropagation();
                            viewMonth = focusedMonth;
                            const clampedDay = clampDayInMonth(viewYear, viewMonth, focusedDate.getDate());
                            focusedDate = new Date(viewYear, viewMonth, clampedDay);
                            setViewMode('days', true);
                        }
                        break;
                    default:
                        break;
                }
                return;
            }

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(-1);
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(1);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(-7);
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(7);
                    break;
                case 'Home':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(-focusedDate.getDay());
                    break;
                case 'End':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(6 - focusedDate.getDay());
                    break;
                case 'PageUp':
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.shiftKey) {
                        stepYear(-1, true);
                    } else {
                        stepMonth(-1, true);
                    }
                    break;
                case 'PageDown':
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.shiftKey) {
                        stepYear(1, true);
                    } else {
                        stepMonth(1, true);
                    }
                    break;
                case 't':
                case 'T':
                    event.preventDefault();
                    event.stopPropagation();
                    commitDateSelection(new Date());
                    break;
                case 'Enter':
                case ' ':
                    if (document.activeElement?.classList.contains('gcal-day')) {
                        event.preventDefault();
                        event.stopPropagation();
                        commitDateSelection(focusedDate);
                    }
                    break;
                default:
                    break;
            }
        };

        const init = () => {
            if (datePickerEl) {
                datePickerEl.readOnly = true;
                datePickerEl.setAttribute('aria-haspopup', 'dialog');
                datePickerEl.setAttribute('aria-expanded', 'false');

                datePickerEl.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (isOpenState) {
                        close({ restoreFocus: false });
                    } else {
                        open({ focusCalendar: true });
                    }
                });

                datePickerEl.addEventListener('keydown', (event) => {
                    if (event.altKey || event.ctrlKey || event.metaKey) return;
                    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        event.stopPropagation();
                        open({ focusCalendar: true });
                    } else if (event.key === 'Escape' && isOpenState) {
                        event.preventDefault();
                        event.stopPropagation();
                        handleEscape();
                    }
                });
            }

            if (pills.setYesterday) pills.setYesterday.addEventListener('click', () => setDateByOffset(-1));
            if (pills.setToday) pills.setToday.addEventListener('click', () => setDateByOffset(0));
            if (pills.setTomorrow) pills.setTomorrow.addEventListener('click', () => setDateByOffset(1));
        };

        return {
            init,
            open,
            close,
            isOpen: () => isOpenState,
            handleEscape,
            setDate,
            setDateByOffset,
            formatDateDDMMYYYY
        };
    };

    const MINUTE_STEPS = [0, 15, 30, 45];

    const parseTimeParts = (rawValue) => {
        const value = String(rawValue || '').trim();
        if (!value) return { valid: false };

        const match24h = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
        if (match24h) {
            const hours24 = Number(match24h[1]);
            const minute = Number(match24h[2]);
            const period = hours24 >= 12 ? 'PM' : 'AM';
            const hour12 = hours24 % 12 || 12;
            return { valid: true, hour12, minute, period, hours24 };
        }

        const match12h = value.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
        if (match12h) {
            const hour12 = Number(match12h[1]);
            if (hour12 < 1 || hour12 > 12) return { valid: false };
            const minute = Number(match12h[2]);
            const period = match12h[3].toUpperCase();
            let hours24 = hour12;
            if (period === 'PM' && hours24 !== 12) hours24 += 12;
            if (period === 'AM' && hours24 === 12) hours24 = 0;
            return { valid: true, hour12, minute, period, hours24 };
        }

        return { valid: false };
    };

    const to24hTimeString = (hour12, minute, period) => {
        let hours24 = Number(hour12) || 12;
        const cleanPeriod = String(period || 'AM').toUpperCase() === 'PM' ? 'PM' : 'AM';
        if (cleanPeriod === 'PM' && hours24 !== 12) hours24 += 12;
        if (cleanPeriod === 'AM' && hours24 === 12) hours24 = 0;
        const cleanMin = Math.min(59, Math.max(0, Number(minute) || 0));
        return `${String(hours24).padStart(2, '0')}:${String(cleanMin).padStart(2, '0')}`;
    };

    const to12hDisplayString = (rawValue) => {
        const parsed = parseTimeParts(rawValue);
        if (!parsed.valid) return '';
        return `${parsed.hour12}:${String(parsed.minute).padStart(2, '0')} ${parsed.period}`;
    };

    const snapToMinuteStep = (minute) => {
        const num = Number(minute) || 0;
        let closest = MINUTE_STEPS[0];
        let minDiff = Math.abs(num - closest);
        for (let i = 1; i < MINUTE_STEPS.length; i++) {
            const diff = Math.abs(num - MINUTE_STEPS[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = MINUTE_STEPS[i];
            }
        }
        return closest;
    };

    const createTimePickerController = ({
        startTimeEl,
        endTimeEl,
        dateUtils = {},
        onTimeChange,
        getCurrentTimes,
        onOpen
    }) => {
        const { getDurationString } = dateUtils;

        let isOpenState = false;
        let activeField = 'startTime'; // 'startTime' | 'endTime'
        let selectedHour12 = 9;
        let selectedMinute = 0;
        let selectedPeriod = 'AM';
        let hasValue = false;

        let popoverEl = null;
        let fieldBadgeEl = null;
        let previewTextEl = null;
        let durationBadgeEl = null;
        let periodAmBtn = null;
        let periodPmBtn = null;
        const hourButtons = [];
        const minuteButtons = [];

        const getActiveInputEl = () => (activeField === 'endTime' ? endTimeEl : startTimeEl);

        const buildPopoverDOM = () => {
            if (popoverEl) return popoverEl;

            popoverEl = document.createElement('div');
            popoverEl.className = 'gcal-popover gtime-popover';
            popoverEl.setAttribute('role', 'dialog');
            popoverEl.setAttribute('aria-modal', 'false');
            popoverEl.setAttribute('aria-label', 'Choose class time');
            popoverEl.tabIndex = -1;

            const header = document.createElement('div');
            header.className = 'gtime-header';

            const headerInfo = document.createElement('div');
            headerInfo.className = 'gtime-header-info';

            fieldBadgeEl = document.createElement('span');
            fieldBadgeEl.className = 'gtime-field-badge';

            previewTextEl = document.createElement('span');
            previewTextEl.className = 'gtime-preview';

            durationBadgeEl = document.createElement('span');
            durationBadgeEl.className = 'gtime-duration-badge hidden';
            durationBadgeEl.hidden = true;

            headerInfo.append(fieldBadgeEl, previewTextEl, durationBadgeEl);

            const periodToggle = document.createElement('div');
            periodToggle.className = 'gtime-period-toggle';
            periodToggle.setAttribute('role', 'group');
            periodToggle.setAttribute('aria-label', 'AM or PM');

            periodAmBtn = document.createElement('button');
            periodAmBtn.type = 'button';
            periodAmBtn.className = 'gtime-period-btn';
            periodAmBtn.dataset.period = 'AM';
            periodAmBtn.textContent = 'AM';

            periodPmBtn = document.createElement('button');
            periodPmBtn.type = 'button';
            periodPmBtn.className = 'gtime-period-btn';
            periodPmBtn.dataset.period = 'PM';
            periodPmBtn.textContent = 'PM';

            periodToggle.append(periodAmBtn, periodPmBtn);
            header.append(headerInfo, periodToggle);

            const hoursLabel = document.createElement('div');
            hoursLabel.className = 'gtime-section-label';
            hoursLabel.textContent = 'Hour';

            const hoursGrid = document.createElement('div');
            hoursGrid.className = 'gtime-hours-grid';
            hoursGrid.setAttribute('role', 'listbox');
            hoursGrid.setAttribute('aria-label', 'Hours');

            for (let h = 1; h <= 12; h++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gtime-hour-cell';
                btn.dataset.hour = String(h);
                btn.setAttribute('role', 'option');
                btn.textContent = String(h);
                hourButtons.push(btn);
                hoursGrid.appendChild(btn);
            }

            const minutesLabel = document.createElement('div');
            minutesLabel.className = 'gtime-section-label';
            minutesLabel.textContent = 'Minute';

            const minutesGrid = document.createElement('div');
            minutesGrid.className = 'gtime-minutes-grid';
            minutesGrid.setAttribute('role', 'listbox');
            minutesGrid.setAttribute('aria-label', 'Minutes');

            for (let i = 0; i < MINUTE_STEPS.length; i++) {
                const minVal = MINUTE_STEPS[i];
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gtime-minute-cell';
                btn.dataset.minute = String(minVal);
                btn.setAttribute('role', 'option');
                btn.textContent = `:${String(minVal).padStart(2, '0')}`;
                minuteButtons.push(btn);
                minutesGrid.appendChild(btn);
            }

            const footer = document.createElement('div');
            footer.className = 'gtime-footer';

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'gtime-action-btn secondary';
            clearBtn.dataset.action = 'clear';
            clearBtn.textContent = 'Clear';

            const doneBtn = document.createElement('button');
            doneBtn.type = 'button';
            doneBtn.className = 'gtime-action-btn primary';
            doneBtn.dataset.action = 'done';
            doneBtn.textContent = 'Done';

            footer.append(clearBtn, doneBtn);
            popoverEl.append(header, hoursLabel, hoursGrid, minutesLabel, minutesGrid, footer);
            document.body.appendChild(popoverEl);

            popoverEl.addEventListener('click', (event) => {
                const hourBtn = event.target.closest('.gtime-hour-cell');
                if (hourBtn) {
                    event.stopPropagation();
                    selectedHour12 = Number(hourBtn.dataset.hour);
                    hasValue = true;
                    commitCurrentTime();
                    renderPopoverUI(false);
                    return;
                }

                const minBtn = event.target.closest('.gtime-minute-cell');
                if (minBtn) {
                    event.stopPropagation();
                    selectedMinute = Number(minBtn.dataset.minute);
                    hasValue = true;
                    commitCurrentTime();
                    renderPopoverUI(false);
                    return;
                }

                const periodBtn = event.target.closest('.gtime-period-btn');
                if (periodBtn) {
                    event.stopPropagation();
                    selectedPeriod = periodBtn.dataset.period === 'PM' ? 'PM' : 'AM';
                    hasValue = true;
                    commitCurrentTime();
                    renderPopoverUI(false);
                    return;
                }

                const actionBtn = event.target.closest('.gtime-action-btn');
                if (actionBtn) {
                    event.stopPropagation();
                    const action = actionBtn.dataset.action;
                    if (action === 'clear') {
                        clearActiveTime();
                        close({ restoreFocus: true });
                    } else if (action === 'done') {
                        if (!hasValue) {
                            hasValue = true;
                            commitCurrentTime();
                        }
                        const wasStart = activeField === 'startTime';
                        close({ restoreFocus: true });
                        if (wasStart && endTimeEl && !endTimeEl.value) {
                            endTimeEl.focus({ preventScroll: true });
                        }
                    }
                }
            });

            popoverEl.addEventListener('keydown', handlePopoverKeydown);
            return popoverEl;
        };

        const renderPopoverUI = (moveFocusToHour = false) => {
            if (!popoverEl) return;

            fieldBadgeEl.textContent = activeField === 'endTime' ? 'End' : 'Start';
            previewTextEl.textContent = `${selectedHour12}:${String(selectedMinute).padStart(2, '0')} ${selectedPeriod}`;

            const currentTimes = typeof getCurrentTimes === 'function' ? getCurrentTimes() : {};
            const candidate24h = to24hTimeString(selectedHour12, selectedMinute, selectedPeriod);
            const start24h = activeField === 'endTime' ? (currentTimes.startTime || '') : candidate24h;
            const end24h = activeField === 'endTime' ? candidate24h : (currentTimes.endTime || '');
            const durationText = (start24h && end24h && typeof getDurationString === 'function')
                ? getDurationString(start24h, end24h)
                : '';

            if (durationText) {
                durationBadgeEl.textContent = durationText;
                durationBadgeEl.classList.remove('hidden');
                durationBadgeEl.hidden = false;
            } else {
                durationBadgeEl.textContent = '';
                durationBadgeEl.classList.add('hidden');
                durationBadgeEl.hidden = true;
            }

            const isPm = selectedPeriod === 'PM';
            periodAmBtn.classList.toggle('is-selected', !isPm);
            periodAmBtn.setAttribute('aria-pressed', !isPm ? 'true' : 'false');
            periodPmBtn.classList.toggle('is-selected', isPm);
            periodPmBtn.setAttribute('aria-pressed', isPm ? 'true' : 'false');

            let activeHourBtn = null;
            for (let i = 0; i < hourButtons.length; i++) {
                const btn = hourButtons[i];
                const isSelected = Number(btn.dataset.hour) === selectedHour12;
                btn.classList.toggle('is-selected', isSelected);
                btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                btn.tabIndex = isSelected ? 0 : -1;
                if (isSelected) activeHourBtn = btn;
            }

            for (let i = 0; i < minuteButtons.length; i++) {
                const btn = minuteButtons[i];
                const isSelected = Number(btn.dataset.minute) === selectedMinute;
                btn.classList.toggle('is-selected', isSelected);
                btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                btn.tabIndex = isSelected ? 0 : -1;
            }

            if (moveFocusToHour && activeHourBtn && isOpenState) {
                requestAnimationFrame(() => {
                    if (isOpenState) activeHourBtn.focus({ preventScroll: true });
                });
            }
        };

        const commitCurrentTime = () => {
            if ('vibrate' in navigator) {
                try { navigator.vibrate(5); } catch (_) {}
            }
            const next24h = to24hTimeString(selectedHour12, selectedMinute, selectedPeriod);
            const activeInput = getActiveInputEl();
            if (activeInput) {
                activeInput.value = to12hDisplayString(next24h);
            }
            if (typeof onTimeChange === 'function') {
                onTimeChange(activeField, next24h);
            }
        };

        const clearActiveTime = () => {
            hasValue = false;
            const activeInput = getActiveInputEl();
            if (activeInput) {
                activeInput.value = '';
            }
            if (typeof onTimeChange === 'function') {
                onTimeChange(activeField, '');
            }
        };

        const setTimes = ({ startTime = '', endTime = '' } = {}) => {
            if (startTimeEl) {
                startTimeEl.value = to12hDisplayString(startTime);
            }
            if (endTimeEl) {
                endTimeEl.value = to12hDisplayString(endTime);
            }
            if (isOpenState) {
                syncDraftFromState();
                renderPopoverUI(false);
            }
        };

        const syncDraftFromState = () => {
            const times = typeof getCurrentTimes === 'function' ? getCurrentTimes() : {};
            const rawVal = activeField === 'endTime' ? times.endTime : times.startTime;
            const parsed = parseTimeParts(rawVal);

            if (parsed.valid) {
                selectedHour12 = parsed.hour12;
                selectedMinute = snapToMinuteStep(parsed.minute);
                selectedPeriod = parsed.period;
                hasValue = true;
                return;
            }

            hasValue = false;
            if (activeField === 'endTime' && times.startTime) {
                const startParsed = parseTimeParts(times.startTime);
                if (startParsed.valid) {
                    const nextHours24 = (startParsed.hours24 + 1) % 24;
                    selectedPeriod = nextHours24 >= 12 ? 'PM' : 'AM';
                    selectedHour12 = nextHours24 % 12 || 12;
                    selectedMinute = snapToMinuteStep(startParsed.minute);
                    return;
                }
            }

            selectedHour12 = 9;
            selectedMinute = 0;
            selectedPeriod = 'AM';
        };

        const positionPopover = () => {
            const anchorEl = getActiveInputEl();
            if (!popoverEl || !anchorEl || !isOpenState) return;
            const rect = anchorEl.getBoundingClientRect();
            const popWidth = popoverEl.offsetWidth || 284;
            const popHeight = popoverEl.offsetHeight || 296;
            const margin = 8;
            const viewportPad = 12;

            let top = rect.bottom + margin;
            let placeAbove = false;

            if (top + popHeight > window.innerHeight - viewportPad && rect.top - popHeight - margin > viewportPad) {
                top = rect.top - popHeight - margin;
                placeAbove = true;
            }

            let left = rect.left;
            if (left + popWidth > window.innerWidth - viewportPad) {
                left = Math.max(viewportPad, window.innerWidth - popWidth - viewportPad);
            }
            if (left < viewportPad) {
                left = viewportPad;
            }

            popoverEl.classList.toggle('gcal-above', placeAbove);
            popoverEl.style.top = `${Math.round(top)}px`;
            popoverEl.style.left = `${Math.round(left)}px`;
        };

        const handleOutsidePointerDown = (event) => {
            if (!isOpenState || !popoverEl) return;
            const target = event.target;
            if (
                popoverEl.contains(target) ||
                (startTimeEl && startTimeEl.contains(target)) ||
                (endTimeEl && endTimeEl.contains(target))
            ) {
                return;
            }
            close({ restoreFocus: false });
        };

        const handleViewportChange = () => {
            if (isOpenState) {
                positionPopover();
            }
        };

        const open = (field = 'startTime', { focusPopover = true } = {}) => {
            if (typeof onOpen === 'function') {
                onOpen();
            }
            buildPopoverDOM();

            const prevField = activeField;
            activeField = field === 'endTime' ? 'endTime' : 'startTime';

            if (startTimeEl) {
                startTimeEl.setAttribute('aria-expanded', activeField === 'startTime' ? 'true' : 'false');
            }
            if (endTimeEl) {
                endTimeEl.setAttribute('aria-expanded', activeField === 'endTime' ? 'true' : 'false');
            }

            syncDraftFromState();
            isOpenState = true;
            popoverEl.classList.add('open');

            renderPopoverUI(focusPopover);
            positionPopover();

            if (prevField !== activeField) {
                positionPopover();
            }

            document.addEventListener('pointerdown', handleOutsidePointerDown, true);
            window.addEventListener('resize', handleViewportChange, { passive: true });
            window.addEventListener('scroll', handleViewportChange, true);
        };

        const close = ({ restoreFocus = false } = {}) => {
            if (!isOpenState) return;
            isOpenState = false;
            if (popoverEl) {
                popoverEl.classList.remove('open');
            }
            const activeInput = getActiveInputEl();
            if (startTimeEl) startTimeEl.setAttribute('aria-expanded', 'false');
            if (endTimeEl) endTimeEl.setAttribute('aria-expanded', 'false');
            if (restoreFocus && activeInput) {
                activeInput.focus({ preventScroll: true });
            }
            document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };

        const handleEscape = () => {
            if (!isOpenState) return false;
            close({ restoreFocus: true });
            return true;
        };

        const handlePopoverKeydown = (event) => {
            if (!isOpenState) return;
            if (event.altKey || event.ctrlKey || event.metaKey) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                handleEscape();
                return;
            }

            if (event.key === 'a' || event.key === 'A') {
                event.preventDefault();
                event.stopPropagation();
                selectedPeriod = 'AM';
                hasValue = true;
                commitCurrentTime();
                renderPopoverUI(false);
                return;
            }

            if (event.key === 'p' || event.key === 'P') {
                event.preventDefault();
                event.stopPropagation();
                selectedPeriod = 'PM';
                hasValue = true;
                commitCurrentTime();
                renderPopoverUI(false);
                return;
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                event.stopPropagation();
                clearActiveTime();
                close({ restoreFocus: true });
                return;
            }

            const activeEl = document.activeElement;
            const isMinuteFocus = activeEl?.classList.contains('gtime-minute-cell');

            if (isMinuteFocus) {
                const currentIdx = Math.max(0, MINUTE_STEPS.indexOf(selectedMinute));
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    event.stopPropagation();
                    const delta = event.key === 'ArrowRight' ? 1 : -1;
                    const nextIdx = (currentIdx + delta + MINUTE_STEPS.length) % MINUTE_STEPS.length;
                    selectedMinute = MINUTE_STEPS[nextIdx];
                    hasValue = true;
                    commitCurrentTime();
                    renderPopoverUI(false);
                    minuteButtons[nextIdx]?.focus({ preventScroll: true });
                    return;
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    event.stopPropagation();
                    renderPopoverUI(true);
                    return;
                }
            } else {
                const currentHourIdx = selectedHour12 - 1;
                if (
                    event.key === 'ArrowLeft' ||
                    event.key === 'ArrowRight' ||
                    event.key === 'ArrowUp' ||
                    event.key === 'ArrowDown'
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.key === 'ArrowDown' && currentHourIdx >= 8) {
                        const minIdx = Math.max(0, MINUTE_STEPS.indexOf(selectedMinute));
                        minuteButtons[minIdx]?.focus({ preventScroll: true });
                        return;
                    }
                    const deltaMap = {
                        ArrowLeft: -1,
                        ArrowRight: 1,
                        ArrowUp: -4,
                        ArrowDown: 4
                    };
                    const delta = deltaMap[event.key] || 0;
                    const nextIdx = (currentHourIdx + delta + 12) % 12;
                    selectedHour12 = nextIdx + 1;
                    hasValue = true;
                    commitCurrentTime();
                    renderPopoverUI(true);
                    return;
                }
            }

            if (event.key === 'Enter') {
                if (!activeEl?.classList.contains('gtime-action-btn')) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!hasValue) {
                        hasValue = true;
                        commitCurrentTime();
                    }
                    const wasStart = activeField === 'startTime';
                    close({ restoreFocus: true });
                    if (wasStart && endTimeEl && !endTimeEl.value) {
                        endTimeEl.focus({ preventScroll: true });
                    }
                }
            }
        };

        const bindInput = (inputEl, fieldName) => {
            if (!inputEl) return;
            inputEl.readOnly = true;
            inputEl.setAttribute('aria-haspopup', 'dialog');
            inputEl.setAttribute('aria-expanded', 'false');

            inputEl.addEventListener('click', (event) => {
                event.stopPropagation();
                if (isOpenState && activeField === fieldName) {
                    close({ restoreFocus: false });
                } else {
                    open(fieldName, { focusPopover: true });
                }
            });

            inputEl.addEventListener('keydown', (event) => {
                if (event.altKey || event.ctrlKey || event.metaKey) return;
                if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    event.stopPropagation();
                    open(fieldName, { focusPopover: true });
                } else if ((event.key === 'Backspace' || event.key === 'Delete') && inputEl.value) {
                    event.preventDefault();
                    event.stopPropagation();
                    activeField = fieldName;
                    clearActiveTime();
                } else if (event.key === 'Escape' && isOpenState) {
                    event.preventDefault();
                    event.stopPropagation();
                    handleEscape();
                }
            });
        };

        const init = () => {
            bindInput(startTimeEl, 'startTime');
            bindInput(endTimeEl, 'endTime');
        };

        return {
            init,
            open,
            close,
            isOpen: () => isOpenState,
            getActiveField: () => (isOpenState ? activeField : ''),
            handleEscape,
            setTimes
        };
    };

    globalScope.AttendanceDatePicker = {
        createDatePickerController,
        createTimePickerController,
        formatDateDDMMYYYY
    };
})(window);
