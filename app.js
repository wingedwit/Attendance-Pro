const requiredAttendanceModules = [
    'AttendanceDateUtils',
    'AttendanceStorageUtils',
    'AttendanceLogic',
    'AttendanceConfig',
    'AttendanceUIUtils',
    'AttendanceExportUtils',
    'AttendanceStepNavigator',
    'AttendanceStateManager',
    'AttendanceDatePicker',
    'AttendanceReportUI',
    'AttendanceExportMenu',
    'AttendanceShortcuts'
];

requiredAttendanceModules.forEach((moduleName) => {
    if (!window[moduleName]) {
        throw new Error(`Attendance Pro dependency missing: ${moduleName}. Check index.html script order.`);
    }
});

const {
    parseDDMMYYYY,
    formatTimeForReport,
    getFormattedDateWithDay,
    getDurationInHours,
    getDurationString
} = window.AttendanceDateUtils;

const { MAX_ROLL_RANGE_SIZE = 5000, createAttendanceEngine, groupNumbersIntoRanges } = window.AttendanceLogic;
const { createInitialState } = window.AttendanceConfig;
const { createToast, createClipboard, createCopyFeedback } = window.AttendanceUIUtils;
const { buildReportCopyPayload, buildSheetCopyText: formatSheetCopyText } = window.AttendanceExportUtils;

const { createStepNavigator } = window.AttendanceStepNavigator;
const { createStateStore } = window.AttendanceStateManager;
const { createDatePickerController, createTimePickerController } = window.AttendanceDatePicker;
const { createReportRenderer } = window.AttendanceReportUI;
const { createExportMenuController } = window.AttendanceExportMenu;
const { initKeyboardShortcuts } = window.AttendanceShortcuts;

const startApp = () => {
    if (window.matchMedia && typeof applySystemTheme === 'function') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        applySystemTheme(mediaQuery.matches);
        const handleThemeChange = (event) => applySystemTheme(event.matches);
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleThemeChange);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(handleThemeChange);
        }
    }

    const elements = {
        datePickerEl: document.getElementById("datePicker"),
        startTimeEl: document.getElementById("startTime"),
        endTimeEl: document.getElementById("endTime"),
        classType: document.getElementById("classType"),
        theoryType: document.getElementById("theoryType"),
        batch: document.getElementById("batch"),
        minRoll: document.getElementById("minRoll"),
        maxRoll: document.getElementById("maxRoll"),
        facultyName: document.getElementById("facultyName"),
        srName: document.getElementById("srName"),
        lectureTopic: document.getElementById("lectureTopic"),
        attendanceInput: document.getElementById("attendanceInput"),
        errorMessage: document.getElementById("errorMessage"),
        theoryTypeContainer: document.getElementById("theoryTypeContainer"),
        batchContainer: document.getElementById("batchContainer"),
        undoButton: document.getElementById("undoButton"),
        redoButton: document.getElementById("redoButton"),
        downloadMenu: document.getElementById("downloadMenu"),
        downloadButton: document.getElementById("downloadButton"),
        downloadOptionReport: document.getElementById("downloadOptionReport"),
        downloadOptionSheet: document.getElementById("downloadOptionSheet"),
        clearFormButton: document.getElementById("clearFormButton"),
        outputPanel: document.getElementById("outputPanel"),
        toast: document.getElementById("toast"),
        rollCount: document.getElementById("rollCount"),
        attendanceModeToggle: document.getElementById("attendanceModeToggle"),
        savedIndicator: document.getElementById("savedIndicator"),
        clearRollsButton: document.getElementById("clearRollsButton"),
        sortAndHighlightButton: document.getElementById("sortAndHighlightButton"),
        upiCopyButton: document.getElementById("upiCopyButton"),
        mobileCopyButton: document.getElementById("mobileCopyButton"),
        setYesterdayButton: document.getElementById("setYesterdayButton"),
        setTodayButton: document.getElementById("setTodayButton"),
        setTomorrowButton: document.getElementById("setTomorrowButton")
    };

    const trackEvent = (eventName, params = {}) => {
        if (typeof window.gtag !== 'function') return;
        window.gtag('event', eventName, params);
    };

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const getInitialState = () => createInitialState(formatDateDDMMYYYY(new Date()));

    // Initialize Store
    const store = createStateStore({
        config: window.AttendanceConfig,
        storageUtils: window.AttendanceStorageUtils,
        savedIndicatorEl: elements.savedIndicator,
        getInitialState
    });

    // Initialize Step Navigator
    const stepNavigator = createStepNavigator();
    stepNavigator.init();

    // Debounce constants & caches
    const DEBOUNCE_DELAY = 300;
    const FAST_INPUT_DEBOUNCE_DELAY = 120;
    let attendanceDebounceTimer = null;
    let rollCountTimer = null;
    let pendingRollCountInput = '';
    const fastInputTimers = new Map();
    const groupedRangesCache = new WeakMap();

    const showToast = createToast(elements.toast);
    const { copyText, copyRichText } = createClipboard(showToast);
    const triggerButtonSuccess = createCopyFeedback();

    if (elements.upiCopyButton) {
        elements.upiCopyButton.addEventListener("click", () => copyText("vaibhav.ganesh51@okaxis", "Copied", "UPI ID"));
    }
    if (elements.mobileCopyButton) {
        elements.mobileCopyButton.addEventListener("click", () => copyText("+919468937372", "Copied", "Mobile Number"));
    }

    let timePicker = null;

    // Date Picker Controller
    const datePicker = createDatePickerController({
        datePickerEl: elements.datePickerEl,
        pills: {
            setYesterday: elements.setYesterdayButton,
            setToday: elements.setTodayButton,
            setTomorrow: elements.setTomorrowButton
        },
        dateUtils: window.AttendanceDateUtils,
        onDateChange: (nextDate) => {
            const trimmed = String(nextDate || '').trim();
            if (!trimmed) return;
            const currentState = store.getState();
            if (currentState.date === trimmed) {
                renderOutput();
                return;
            }
            store.setState({ date: trimmed });
        },
        getCurrentDate: () => store.getState().date,
        onOpen: () => timePicker?.close?.()
    });
    datePicker.init();

    // Time Picker Controller
    timePicker = createTimePickerController({
        startTimeEl: elements.startTimeEl,
        endTimeEl: elements.endTimeEl,
        dateUtils: window.AttendanceDateUtils,
        onTimeChange: (field, value) => {
            const currentState = store.getState();
            if (currentState[field] === value) {
                renderOutput();
                return;
            }
            store.setState({ [field]: value });
        },
        getCurrentTimes: () => {
            const currentState = store.getState();
            return {
                startTime: currentState.startTime,
                endTime: currentState.endTime
            };
        },
        onOpen: () => datePicker.close?.()
    });
    timePicker.init();

    const focusAndSelectControl = (control) => {
        if (!control) return;
        if (typeof control.scrollIntoView === 'function') {
            control.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        control.focus();
        if (typeof control.select === 'function' && (control.type === 'text' || control.type === 'number')) {
            control.select();
        }
    };

    const activateControlForReportTarget = (targetKey) => {
        if (targetKey === 'date') {
            stepNavigator.switchSection('section1');
            requestAnimationFrame(() => {
                datePicker.open();
                syncActiveReportTarget();
            });
            return;
        }

        if (targetKey === 'time') {
            stepNavigator.switchSection('section1');
            requestAnimationFrame(() => {
                const currentState = store.getState();
                const targetField = (currentState.startTime && !currentState.endTime)
                    ? 'endTime'
                    : 'startTime';
                timePicker.open(targetField);
                syncActiveReportTarget();
            });
            return;
        }

        if (targetKey === 'roll-range') {
            stepNavigator.switchSection('section1');
            requestAnimationFrame(() => {
                const targetEl = (elements.minRoll?.value && !elements.maxRoll?.value)
                    ? elements.maxRoll
                    : elements.minRoll;
                focusAndSelectControl(targetEl);
                syncActiveReportTarget();
            });
            return;
        }

        if (targetKey === 'faculty') {
            stepNavigator.switchSection('section2');
            requestAnimationFrame(() => {
                focusAndSelectControl(elements.facultyName);
                syncActiveReportTarget();
            });
            return;
        }

        if (targetKey === 'sr') {
            stepNavigator.switchSection('section2');
            requestAnimationFrame(() => {
                focusAndSelectControl(elements.srName);
                syncActiveReportTarget();
            });
            return;
        }

        if (targetKey === 'topic') {
            stepNavigator.switchSection('section2');
            requestAnimationFrame(() => {
                focusAndSelectControl(elements.lectureTopic);
                syncActiveReportTarget();
            });
            return;
        }

        if (targetKey === 'class-type') {
            stepNavigator.switchSection('section2');
            requestAnimationFrame(() => {
                const isTheory = elements.classType?.value === 'Theory';
                const dependentControl = isTheory ? elements.theoryType : elements.batch;
                const targetEl = (dependentControl && !dependentControl.closest('.hidden') && elements.classType?.value)
                    ? dependentControl
                    : elements.classType;
                focusAndSelectControl(targetEl);
                syncActiveReportTarget();
            });
            return;
        }

        if (
            targetKey === 'attendance' ||
            targetKey === 'present-stats' ||
            targetKey === 'absent-stats' ||
            targetKey === 'present-rolls' ||
            targetKey === 'absent-rolls'
        ) {
            stepNavigator.switchSection('section3');
            requestAnimationFrame(() => {
                elements.attendanceInput?.focus();
                syncActiveReportTarget();
            });
        }
    };

    // Report Renderer
    const reportRenderer = createReportRenderer({
        outputPanel: elements.outputPanel,
        minRollEl: elements.minRoll,
        maxRollEl: elements.maxRoll,
        attendanceInputEl: elements.attendanceInput,
        errorMessageEl: elements.errorMessage,
        escapeHtml,
        maxRollRangeSize: MAX_ROLL_RANGE_SIZE,
        onTargetActivate: activateControlForReportTarget
    });

    const controlToReportTarget = new Map([
        [elements.datePickerEl, 'date'],
        [elements.setYesterdayButton, 'date'],
        [elements.setTodayButton, 'date'],
        [elements.setTomorrowButton, 'date'],
        [elements.startTimeEl, 'time'],
        [elements.endTimeEl, 'time'],
        [elements.minRoll, 'roll-range'],
        [elements.maxRoll, 'roll-range'],
        [elements.facultyName, 'faculty'],
        [elements.srName, 'sr'],
        [elements.lectureTopic, 'topic'],
        [elements.classType, 'class-type'],
        [elements.theoryType, 'class-type'],
        [elements.batch, 'class-type'],
        [elements.attendanceInput, 'attendance']
    ]);

    const targetToFormControls = {
        date: [elements.datePickerEl],
        time: [elements.startTimeEl, elements.endTimeEl],
        'roll-range': [elements.minRoll, elements.maxRoll],
        faculty: [elements.facultyName],
        sr: [elements.srName],
        topic: [elements.lectureTopic],
        'class-type': [elements.classType, elements.theoryType, elements.batch],
        attendance: [elements.attendanceInput],
        'present-stats': [elements.attendanceInput],
        'absent-stats': [elements.attendanceInput],
        'present-rolls': [elements.attendanceInput],
        'absent-rolls': [elements.attendanceInput]
    };

    let hoveredReportTarget = '';
    let activeLinkedWrappers = [];

    const syncLinkedFormControls = (activeTarget = '') => {
        for (let i = 0; i < activeLinkedWrappers.length; i++) {
            activeLinkedWrappers[i].classList.remove('is-linked-field');
        }
        activeLinkedWrappers = [];
        if (!activeTarget || !targetToFormControls[activeTarget]) return;
        const controls = targetToFormControls[activeTarget];
        for (let i = 0; i < controls.length; i++) {
            const wrapper = controls[i]?.parentElement;
            if (wrapper && !wrapper.classList.contains('hidden')) {
                wrapper.classList.add('is-linked-field');
                activeLinkedWrappers.push(wrapper);
            }
        }
    };

    const resolveActiveReportTarget = () => {
        if (typeof datePicker.isOpen === 'function' && datePicker.isOpen()) return 'date';
        if (typeof timePicker.isOpen === 'function' && timePicker.isOpen()) return 'time';
        const activeEl = document.activeElement;
        if (activeEl) {
            if (controlToReportTarget.has(activeEl)) return controlToReportTarget.get(activeEl) || '';
            if (activeEl.closest('.gcal-popover')) return 'date';
            if (activeEl.closest('.gtime-popover')) return 'time';
            if (activeEl.closest('#attendanceModeToggle')) return 'attendance';
            const focusedReportEl = activeEl.closest?.('[data-report-target]');
            if (focusedReportEl) return focusedReportEl.dataset.reportTarget || '';
        }
        return hoveredReportTarget || '';
    };

    const syncActiveReportTarget = () => {
        const activeTarget = resolveActiveReportTarget();
        if (typeof reportRenderer.setActiveTarget === 'function') {
            reportRenderer.setActiveTarget(activeTarget);
        }
        syncLinkedFormControls(activeTarget);
    };

    document.addEventListener('focusin', () => {
        requestAnimationFrame(syncActiveReportTarget);
    });

    document.addEventListener('focusout', () => {
        requestAnimationFrame(syncActiveReportTarget);
    });

    elements.outputPanel?.addEventListener('pointerover', (event) => {
        const targetEl = event.target.closest('[data-report-target]');
        const nextTarget = targetEl ? (targetEl.dataset.reportTarget || '') : '';
        if (hoveredReportTarget === nextTarget) return;
        hoveredReportTarget = nextTarget;
        syncActiveReportTarget();
    });

    elements.outputPanel?.addEventListener('pointerleave', () => {
        if (!hoveredReportTarget) return;
        hoveredReportTarget = '';
        syncActiveReportTarget();
    });

    const groupNumbersIntoRangesCached = (numbers) => {
        if (!numbers || numbers.length === 0) return [];
        const cached = groupedRangesCache.get(numbers);
        if (cached) return cached;
        const computed = groupNumbersIntoRanges(numbers);
        groupedRangesCache.set(numbers, computed);
        return computed;
    };

    const getStateDurationInHours = () => {
        const state = store.getState();
        return getDurationInHours(state.startTime, state.endTime);
    };

    const getStateDurationString = () => {
        const state = store.getState();
        return getDurationString(state.startTime, state.endTime);
    };

    const parseRollBoundary = (value) => {
        const text = String(value || '').trim();
        return /^\d+$/.test(text) ? Number(text) : NaN;
    };

    const getRollRanges = () => {
        const state = store.getState();
        return [
            state.minRoll === '' ? NaN : parseRollBoundary(state.minRoll),
            state.maxRoll === '' ? NaN : parseRollBoundary(state.maxRoll)
        ];
    };

    const attendanceEngine = createAttendanceEngine(getRollRanges);
    const getValidationResult = (inputText) => attendanceEngine.getValidationResult(inputText);
    const buildValidationErrorMessage = (validation) => attendanceEngine.buildValidationErrorMessage(validation);
    const getAttendanceStats = (inputNumbers, inputMode) => attendanceEngine.getAttendanceStats(inputNumbers, inputMode);

    const getRollRangeStatus = () => {
        const [min, max] = getRollRanges();
        if (Number.isNaN(min) || Number.isNaN(max)) return { valid: false, min, max, reason: 'missing' };
        if (min > max) return { valid: false, min, max, reason: 'reversed' };
        if ((max - min + 1) > MAX_ROLL_RANGE_SIZE) return { valid: false, min, max, reason: 'tooLarge' };
        return { valid: true, min, max, reason: '' };
    };

    const getClassTypeLine = (state) => {
        if (state.classType === "Theory" && state.theoryType) {
            const normalizedTheoryType = String(state.theoryType).trim();
            if (/^lecture$/i.test(normalizedTheoryType)) return "Lecture";
            return `Lecture (${normalizedTheoryType})`;
        }
        if (state.classType === "Practical" && state.batch) return `Practical (${state.batch})`;
        return state.classType || '-';
    };

    const getReportTimeLine = (state) => {
        const duration = getStateDurationString();
        const formattedStartTime = formatTimeForReport(state.startTime);
        const formattedEndTime = formatTimeForReport(state.endTime);
        if (!formattedStartTime || !formattedEndTime) return 'N/A';
        return `${formattedStartTime} - ${formattedEndTime}${duration ? ` (${duration})` : ''}`;
    };

    const getReportModel = () => {
        const state = store.getState();
        const range = getRollRangeStatus();
        const validation = getValidationResult(state.attendance);
        const stats = range.valid
            ? getAttendanceStats(validation.numbers, state.attendanceInputMode)
            : { presentNumbers: [], absentNumbers: [], allNumbers: [] };
        const total = stats.allNumbers.length;
        const presentPct = total ? (stats.presentNumbers.length / total * 100) : 0;
        const absentPct = total ? (stats.absentNumbers.length / total * 100) : 0;

        return {
            range,
            validation,
            stats,
            total,
            presentPct,
            absentPct,
            dateWithDay: getFormattedDateWithDay(state.date),
            timeLine: getReportTimeLine(state),
            typeLine: getClassTypeLine(state),
            presentRanges: groupNumbersIntoRangesCached(stats.presentNumbers),
            absentRanges: groupNumbersIntoRangesCached(stats.absentNumbers)
        };
    };

    const attendanceModeButtons = Array.from(elements.attendanceModeToggle.querySelectorAll('button'));
    const updateAttendanceModeUI = (mode) => {
        elements.attendanceModeToggle.dataset.activeMode = mode;
        attendanceModeButtons.forEach((btn) => {
            const isActive = btn.dataset.mode === mode;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    };

    const toggleClassTypeFields = (animate = false) => {
        const isTheory = elements.classType.value === "Theory";
        const activeContainer = isTheory ? elements.theoryTypeContainer : elements.batchContainer;
        const inactiveContainer = isTheory ? elements.batchContainer : elements.theoryTypeContainer;

        inactiveContainer.classList.remove("conditional-field-enter");
        inactiveContainer.classList.add("hidden");

        activeContainer.classList.remove("hidden", "conditional-field-enter");
        if (animate) {
            void activeContainer.offsetWidth;
            activeContainer.classList.add("conditional-field-enter");
        }
    };

    const updateUndoRedoButtons = ({ canUndo, canRedo }) => {
        elements.undoButton.disabled = !canUndo;
        elements.redoButton.disabled = !canRedo;
    };

    const updateRollCount = (attendanceText = '') => {
        const validation = getValidationResult(attendanceText);
        const nextCount = String(validation.numbers.length);
        if (elements.rollCount && elements.rollCount.textContent !== nextCount) {
            elements.rollCount.textContent = nextCount;
            elements.rollCount.classList.remove('count-pop');
            void elements.rollCount.offsetWidth;
            elements.rollCount.classList.add('count-pop');
        }
    };

    const scheduleRollCountUpdate = (attendanceText = '') => {
        pendingRollCountInput = attendanceText;
        if (rollCountTimer) return;
        rollCountTimer = setTimeout(() => {
            rollCountTimer = null;
            updateRollCount(pendingRollCountInput);
        }, FAST_INPUT_DEBOUNCE_DELAY);
    };

    const cancelScheduledRollCountUpdate = () => {
        if (!rollCountTimer) return;
        clearTimeout(rollCountTimer);
        rollCountTimer = null;
    };

    const cancelPendingAttendanceCommit = () => {
        if (!attendanceDebounceTimer) return;
        clearTimeout(attendanceDebounceTimer);
        attendanceDebounceTimer = null;
    };

    const flushPendingAttendanceCommit = () => {
        if (!attendanceDebounceTimer) return;
        clearTimeout(attendanceDebounceTimer);
        attendanceDebounceTimer = null;
        const latestValue = elements.attendanceInput.value;
        const currentState = store.getState();
        if (currentState.attendance === latestValue) return;
        store.setState({ attendance: latestValue });
    };

    const renderOutput = () => {
        const state = store.getState();
        const report = getReportModel();
        updateRollCount(state.attendance);
        reportRenderer.render(state, report, buildValidationErrorMessage);
    };

    // UI inputs sync
    const syncDOMInputs = (state) => {
        if (state.date) datePicker.setDate(state.date, false);
        timePicker.setTimes({
            startTime: state.startTime,
            endTime: state.endTime
        });

        for (const key in state) {
            if (elements[key] && typeof elements[key].value !== 'undefined' && elements[key] !== elements.attendanceInput) {
                elements[key].value = state[key] ?? '';
            }
        }

        elements.attendanceInput.value = state.attendance || '';
        toggleClassTypeFields();
        updateAttendanceModeUI(state.attendanceInputMode || 'present');
    };

    // Store subscription
    store.subscribe((state, meta, source) => {
        if (source === 'undo' || source === 'redo' || source === 'init') {
            cancelScheduledRollCountUpdate();
            syncDOMInputs(state);
        }
        updateUndoRedoButtons(meta);
        renderOutput();
    });

    // Attendance Input Handlers
    elements.attendanceInput.addEventListener('input', (e) => {
        const value = e.target.value;
        scheduleRollCountUpdate(value);

        cancelPendingAttendanceCommit();
        attendanceDebounceTimer = setTimeout(() => {
            store.setState({ attendance: value });
        }, DEBOUNCE_DELAY);
    });

    elements.clearRollsButton.addEventListener('click', () => {
        cancelPendingAttendanceCommit();
        cancelScheduledRollCountUpdate();
        elements.attendanceInput.value = '';
        updateRollCount('');
        elements.errorMessage.textContent = '';
        elements.attendanceInput.classList.remove('form-input-valid', 'form-input-error');
        store.setState({ attendance: '' });
    });

    elements.sortAndHighlightButton.addEventListener('click', () => {
        const input = elements.attendanceInput.value.trim();
        if (!input) {
            showToast("No rolls to sort", true);
            return;
        }

        const [min, max] = getRollRanges();
        if (isNaN(min) || isNaN(max)) {
            showToast("Set Min/Max Roll first", true);
            return;
        }

        const validation = getValidationResult(input);
        const hasHardErrors = (
            (validation.errors?.nonNumeric?.length || 0) > 0 ||
            (validation.errors?.outOfRange?.length || 0) > 0 ||
            (validation.errors?.invalidRange?.length || 0) > 0
        );
        if (hasHardErrors) {
            elements.errorMessage.textContent = buildValidationErrorMessage(validation);
            elements.attendanceInput.classList.remove('form-input-valid');
            elements.attendanceInput.classList.add('form-input-error');
            showToast('Invalid entries found. Remove them and try sorting again.', true);
            return;
        }

        const sortedValid = [...new Set(validation.numbers)].sort((a, b) => a - b);
        const newInput = sortedValid.join(', ');

        elements.attendanceInput.value = newInput;
        cancelScheduledRollCountUpdate();
        updateRollCount(newInput);

        cancelPendingAttendanceCommit();
        store.setState({ attendance: newInput });

        const validCount = sortedValid.length;
        const removedDuplicates = Math.max(0, validation.numbers.length - sortedValid.length);
        if (removedDuplicates > 0) {
            showToast(`Sorted ${validCount} rolls and removed ${removedDuplicates} duplicate${removedDuplicates !== 1 ? 's' : ''}`);
        } else {
            showToast(`Sorted ${validCount} valid roll${validCount !== 1 ? 's' : ''}`);
        }
    });

    // Form Field Handlers
    const onInputChange = (field, value) => {
        store.setState({ [field]: value });
    };

    const fastFields = ['theoryType', 'batch', 'facultyName', 'srName', 'lectureTopic'];
    fastFields.forEach((key) => {
        elements[key].addEventListener('input', (e) => {
            const nextValue = e.target.value;
            const existingTimer = fastInputTimers.get(key);
            if (existingTimer) clearTimeout(existingTimer);
            const timer = setTimeout(() => {
                fastInputTimers.delete(key);
                onInputChange(key, nextValue);
            }, FAST_INPUT_DEBOUNCE_DELAY);
            fastInputTimers.set(key, timer);
        });
        elements[key].addEventListener('blur', (e) => {
            const pendingTimer = fastInputTimers.get(key);
            if (pendingTimer) {
                clearTimeout(pendingTimer);
                fastInputTimers.delete(key);
            }
            onInputChange(key, e.target.value);
        });
    });

    ['minRoll', 'maxRoll'].forEach((key) => {
        elements[key].addEventListener('input', (e) => onInputChange(key, e.target.value));
    });

    elements.classType.addEventListener('change', (e) => {
        toggleClassTypeFields(true);
        onInputChange('classType', e.target.value);
    });

    elements.attendanceModeToggle.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const newMode = e.target.dataset.mode;
            updateAttendanceModeUI(newMode);
            onInputChange('attendanceInputMode', newMode);
        }
    });

    // Undo / Redo
    elements.undoButton.addEventListener("click", () => store.undo());
    elements.redoButton.addEventListener("click", () => store.redo());

    // Reset Form
    const resetForm = () => {
        cancelPendingAttendanceCommit();
        cancelScheduledRollCountUpdate();
        store.reset();

        const clearedState = store.getState();
        datePicker.setDate(clearedState.date, true);
        timePicker.setTimes({
            startTime: clearedState.startTime,
            endTime: clearedState.endTime
        });

        ['facultyName', 'srName', 'lectureTopic', 'theoryType', 'batch', 'minRoll', 'maxRoll', 'attendanceInput']
            .forEach((key) => { elements[key].value = ''; });
        elements.classType.value = 'Theory';
        elements.attendanceInput.classList.remove('form-input-valid', 'form-input-error');
        elements.errorMessage.textContent = '';
        elements.rollCount.textContent = '0';

        updateAttendanceModeUI('present');
        toggleClassTypeFields();
        reportRenderer.reset();
        stepNavigator.switchSection('section1');

        showToast("Form cleared");
    };
    elements.clearFormButton.addEventListener("click", resetForm);

    // Export Logic
    const buildReportCopyText = () => {
        const state = store.getState();
        const report = getReportModel();
        if (!report.validation.valid && state.attendance.trim() !== "") {
            showToast("Fix errors first", true);
            return null;
        }
        return buildReportCopyPayload({ state, report, escapeHtml });
    };

    const buildSheetCopyText = () => {
        const state = store.getState();
        const report = getReportModel();
        if (!report.validation.valid && state.attendance.trim() !== "") {
            showToast("Invalid roll numbers", true);
            return null;
        }

        const { reason } = report.range;
        if (reason === 'missing' || reason === 'reversed') {
            showToast("Invalid Roll Range", true);
            return null;
        }
        if (reason === 'tooLarge') {
            showToast(`Use ${MAX_ROLL_RANGE_SIZE} rolls or fewer`, true);
            return null;
        }

        const durationVal = getStateDurationInHours() || 1;
        return formatSheetCopyText({ report, durationValue: durationVal });
    };

    const copyReportData = async (trigger = 'menu') => {
        const result = buildReportCopyText();
        if (!result) return;
        const copied = await copyRichText(result.html, result.plain, "Copied", "G-Doc Data");
        if (copied) triggerButtonSuccess(elements.downloadButton);
        exportMenu.close();
        trackEvent('copy_gdoc_data', { trigger });
    };

    const copySheetData = async () => {
        const text = buildSheetCopyText();
        if (!text) return;
        const copied = await copyText(text, "Copied", "G-Sheet Data");
        if (copied) triggerButtonSuccess(elements.downloadButton);
        exportMenu.close();
    };

    // Export Menu Controller
    const exportMenu = createExportMenuController({
        downloadMenu: elements.downloadMenu,
        downloadButton: elements.downloadButton,
        downloadOptionReport: elements.downloadOptionReport,
        downloadOptionSheet: elements.downloadOptionSheet,
        onCopyReport: () => copyReportData('menu'),
        onCopySheet: () => copySheetData()
    });
    exportMenu.init();

    // Keyboard Shortcuts
    initKeyboardShortcuts({
        onEscape: () => {
            if (typeof datePicker.handleEscape === 'function' && datePicker.handleEscape()) {
                return true;
            }
            if (typeof timePicker.handleEscape === 'function' && timePicker.handleEscape()) {
                return true;
            }
            if (exportMenu.isOpen()) {
                exportMenu.close();
                elements.downloadButton.focus();
                return true;
            }
            return false;
        },
        onCopyReport: () => copyReportData('shortcut'),
        onCopySheet: () => copySheetData(),
        onReset: () => {
            datePicker.close?.();
            timePicker.close?.();
            resetForm();
        },
        onUndo: () => elements.undoButton?.click(),
        onRedo: () => elements.redoButton?.click(),
        onStepNext: () => {
            datePicker.close?.();
            timePicker.close?.();
            stepNavigator.navigateOffset(1);
        },
        onStepPrev: () => {
            datePicker.close?.();
            timePicker.close?.();
            stepNavigator.navigateOffset(-1);
        }
    });

    // Initial state sync & section 1 open
    syncDOMInputs(store.getState());
    renderOutput();
    updateUndoRedoButtons(store.getHistoryMeta());
    stepNavigator.switchSection('section1');

    // Lifecycle save flushes
    const flushAll = () => {
        flushPendingAttendanceCommit();
        store.flushPendingSave();
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushAll();
    });
    window.addEventListener('pagehide', flushAll);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
