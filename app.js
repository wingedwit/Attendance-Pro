        const STORAGE_KEY = 'attendanceProData';
        const STORAGE_VERSION = 2;
        let debounceTimer = null;
        const DEBOUNCE_DELAY = 300;
        const FAST_INPUT_DEBOUNCE_DELAY = 120;
        const SAVE_DEBOUNCE_DELAY = 180;
        const MAX_UNDO_HISTORY = 200;
        const PILLS_INLINE_RENDER_LIMIT = 80;
        const FLATPICKR_SCRIPT_SRC = './assets/vendor/flatpickr/flatpickr.min.js';
        const safeStorage = {
            get(key) {
                try { return localStorage.getItem(key); }
                catch (e) { return null; }
            },
            set(key, value) {
                try {
                    localStorage.setItem(key, value);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            remove(key) {
                try {
                    localStorage.removeItem(key);
                    return true;
                } catch (e) {
                    return false;
                }
            }
        };
        let cachedSectionNodes = null;
        let cachedNavButtons = null;

        const getSectionNodes = () => {
            if (!cachedSectionNodes) cachedSectionNodes = Array.from(document.querySelectorAll('.section-content'));
            return cachedSectionNodes;
        };

        const getNavButtons = () => {
            if (!cachedNavButtons) cachedNavButtons = Array.from(document.querySelectorAll('.nav-section-btn'));
            return cachedNavButtons;
        };

        function switchSection(targetId) {
            getSectionNodes().forEach(el => {
                el.classList.add('hidden');
            });
            const target = document.getElementById(targetId);
            if (!target) return;
            target.classList.remove('hidden');

            getNavButtons().forEach(btn => {
                btn.classList.toggle('active', btn.dataset.target === targetId);
            });

            if (targetId === 'section3') {
                requestAnimationFrame(() => {
                    const attendanceInput = document.getElementById('attendanceInput');
                    if (attendanceInput) attendanceInput.focus();
                });
            }
        }

        function getCurrentSectionId() {
            const visibleSection = getSectionNodes()
                .find(section => !section.classList.contains('hidden'));
            return visibleSection ? visibleSection.id : 'section1';
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (window.matchMedia) {
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
                datePickerEl: document.getElementById("datePicker"), startTimeEl: document.getElementById("startTime"), endTimeEl: document.getElementById("endTime"),
                classType: document.getElementById("classType"), theoryType: document.getElementById("theoryType"), batch: document.getElementById("batch"),
                minRoll: document.getElementById("minRoll"), maxRoll: document.getElementById("maxRoll"),
                facultyName: document.getElementById("facultyName"), srName: document.getElementById("srName"), lectureTopic: document.getElementById("lectureTopic"), 
                attendanceInput: document.getElementById("attendanceInput"), errorMessage: document.getElementById("errorMessage"), 
                theoryTypeContainer: document.getElementById("theoryTypeContainer"), batchContainer: document.getElementById("batchContainer"),
                undoButton: document.getElementById("undoButton"), redoButton: document.getElementById("redoButton"), 
                downloadMenu: document.getElementById("downloadMenu"), downloadButton: document.getElementById("downloadButton"),
                downloadOptionReport: document.getElementById("downloadOptionReport"), downloadOptionSheet: document.getElementById("downloadOptionSheet"),
                clearFormButton: document.getElementById("clearFormButton"), outputPanel: document.getElementById("outputPanel"), 
                toast: document.getElementById("toast"), rollCount: document.getElementById("rollCount"),
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
            const sectionOrder = ['section1', 'section2', 'section3'];

            let state = {};
            let undoStack = [];
            let redoStack = [];
            let saveTimeout = null;
            let persistTimer = null;
            let persistPendingJson = null;
            let validationCacheKey = '';
            let validationCacheValue = null;
            let statsCacheInputRef = null;
            let statsCacheMode = '';
            let statsCacheMin = NaN;
            let statsCacheMax = NaN;
            let statsCacheResult = null;
            let allNumbersCacheMin = NaN;
            let allNumbersCacheMax = NaN;
            let allNumbersCache = [];
            let reportMetaNode = null;
            let reportStatusNode = null;
            let reportStatsNode = null;
            let lastReportMetaHtml = '';
            let lastReportStatusHtml = '';
            let lastReportStatsHtml = '';
            let lastRenderedStatsNumbersRef = null;
            let lastRenderedStatsMode = '';
            let lastRenderedStatsMin = NaN;
            let lastRenderedStatsMax = NaN;
            const fastInputTimers = new Map();
            const groupedRangesCache = new WeakMap();
            let rollCountTimer = null;
            let pendingRollCountInput = '';
            let flatpickrLoadPromise = null;
            let flatpickrInstance = null;

            const getInitialState = () => ({
                date: window.flatpickr ? flatpickr.formatDate(new Date(), "d-m-Y") : formatDateDDMMYYYY(new Date()),
                startTime: '', endTime: '',
                classType: "Theory", theoryType: "", batch: "",
                minRoll: '', maxRoll: '',
                facultyName: "", srName: "", lectureTopic: "", attendance: "",
                attendanceInputMode: 'present'
            });

            const escapeHtml = (value) => String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const parseDDMMYYYY = (rawValue) => {
                const value = String(rawValue || '').trim();
                const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!match) return null;
                const [, day, month, year] = match;
                const parsed = new Date(Number(year), Number(month) - 1, Number(day));
                if (Number.isNaN(parsed.getTime())) return null;
                if (
                    parsed.getDate() !== Number(day) ||
                    parsed.getMonth() !== Number(month) - 1 ||
                    parsed.getFullYear() !== Number(year)
                ) {
                    return null;
                }
                return parsed;
            };

            const normalizeStatePayload = (savedPayload) => {
                if (!savedPayload || typeof savedPayload !== 'object') return getInitialState();

                // Backward compatible: older versions stored state directly.
                const isWrappedPayload = Object.prototype.hasOwnProperty.call(savedPayload, 'version') &&
                    Object.prototype.hasOwnProperty.call(savedPayload, 'data');
                const rawState = isWrappedPayload ? savedPayload.data : savedPayload;
                const merged = { ...getInitialState(), ...(rawState || {}) };

                return {
                    ...merged,
                    startTime: normalizeTimeTo24h(merged.startTime),
                    endTime: normalizeTimeTo24h(merged.endTime)
                };
            };

            const normalizeTimeTo24h = (rawValue) => {
                const value = String(rawValue || '').trim();
                if (!value) return '';

                const match24h = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
                if (match24h) {
                    return `${String(Number(match24h[1])).padStart(2, '0')}:${match24h[2]}`;
                }

                const match12h = value.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
                if (!match12h) return '';

                let hours = Number(match12h[1]);
                const minutes = match12h[2];
                const period = match12h[3].toUpperCase();
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                return `${String(hours).padStart(2, '0')}:${minutes}`;
            };

            const formatTimeForReport = (rawValue) => {
                const value = String(rawValue || '').trim();
                if (!value) return '';

                const match24h = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
                if (match24h) {
                    const hours24 = Number(match24h[1]);
                    const minutes = match24h[2];
                    const period = hours24 >= 12 ? 'PM' : 'AM';
                    const hours12 = hours24 % 12 || 12;
                    return `${hours12}:${minutes} ${period}`;
                }

                const match12h = value.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
                if (match12h) {
                    return `${Number(match12h[1])}:${match12h[2]} ${match12h[3].toUpperCase()}`;
                }

                return value;
            };

            const loadFromStorage = () => {
                const saved = safeStorage.get(STORAGE_KEY);
                if (!saved) return getInitialState();
                try {
                    const parsed = JSON.parse(saved);
                    return normalizeStatePayload(parsed);
                }
                catch (e) { return getInitialState(); }
            };

            const persistStateNow = () => {
                if (!persistPendingJson) return;
                const didPersist = safeStorage.set(STORAGE_KEY, persistPendingJson);
                persistPendingJson = null;
                if (!didPersist) return;
                elements.savedIndicator.classList.add('show');
                if (saveTimeout) clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => elements.savedIndicator.classList.remove('show'), 2000);
            };

            const cancelPendingAttendanceCommit = () => {
                if (!debounceTimer) return;
                clearTimeout(debounceTimer);
                debounceTimer = null;
            };

            const flushPendingAttendanceCommit = () => {
                if (!debounceTimer) return;
                clearTimeout(debounceTimer);
                debounceTimer = null;
                const latestValue = elements.attendanceInput.value;
                if (state.attendance === latestValue) return;
                state = { ...state, attendance: latestValue };
                renderOutput();
                saveToStorage();
            };

            const flushPendingSave = () => {
                flushPendingAttendanceCommit();
                if (persistTimer) {
                    clearTimeout(persistTimer);
                    persistTimer = null;
                }
                persistStateNow();
            };

            const saveToStorage = () => {
                persistPendingJson = JSON.stringify({
                    version: STORAGE_VERSION,
                    data: state
                });
                if (persistTimer) clearTimeout(persistTimer);
                persistTimer = setTimeout(() => {
                    persistTimer = null;
                    persistStateNow();
                }, SAVE_DEBOUNCE_DELAY);
            };

            let datePickerOnChange = null;
            let datePicker = {
                setDate(value, triggerChange = false) {
                    const dateObj = value instanceof Date ? value : (parseDDMMYYYY(value) || new Date(value));
                    const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
                    const formatted = formatDateDDMMYYYY(safeDate);
                    if (elements.datePickerEl) elements.datePickerEl.value = formatted;
                    if (triggerChange && typeof datePickerOnChange === 'function') {
                        datePickerOnChange([], formatted);
                    }
                },
                set(option, callback) {
                    if (option === 'onChange') datePickerOnChange = callback;
                }
            };

            const enableFlatpickrThemeStyles = () => {
                const themeLink = document.getElementById('flatpickr-theme');
                if (!themeLink) return;
                themeLink.dataset.enabled = 'true';
                if (themeLink.dataset.pendingHref) {
                    themeLink.href = themeLink.dataset.pendingHref;
                }
            };

            const upgradeDatePicker = () => {
                if (flatpickrInstance || !window.flatpickr || !elements.datePickerEl) return;
                enableFlatpickrThemeStyles();
                flatpickrInstance = flatpickr(elements.datePickerEl, { dateFormat: "d-m-Y" });
                if (typeof datePickerOnChange === 'function') {
                    flatpickrInstance.set('onChange', datePickerOnChange);
                }
                if (state.date) {
                    flatpickrInstance.setDate(state.date, false);
                }
                datePicker = flatpickrInstance;
            };

            const ensureFlatpickrLoaded = () => {
                if (window.flatpickr) {
                    upgradeDatePicker();
                    return Promise.resolve(datePicker);
                }
                if (flatpickrLoadPromise) return flatpickrLoadPromise;

                enableFlatpickrThemeStyles();
                flatpickrLoadPromise = new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = FLATPICKR_SCRIPT_SRC;
                    script.async = true;
                    script.onload = () => {
                        upgradeDatePicker();
                        resolve(datePicker);
                    };
                    script.onerror = () => {
                        flatpickrLoadPromise = null;
                        reject(new Error('Failed to load flatpickr'));
                    };
                    document.head.appendChild(script);
                });
                return flatpickrLoadPromise;
            };
            
            const showToast = (message, isError = false) => {
                elements.toast.textContent = message;
                elements.toast.classList.toggle("error", isError);
                elements.toast.classList.add("show");
                setTimeout(() => { elements.toast.classList.remove("show"); }, 3000);
            };

            const copyText = (text, successMessage, copiedLabel = "") => {
                const toastMessage = copiedLabel ? `${successMessage} (${copiedLabel})` : successMessage;
                if (!navigator.clipboard) {
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    textArea.style.position = "fixed"; textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus(); textArea.select();
                    try { document.execCommand('copy'); showToast(toastMessage); } 
                    catch (err) { showToast("Copy failed", true); }
                    document.body.removeChild(textArea);
                } else {
                    navigator.clipboard.writeText(text).then(() => showToast(toastMessage), () => showToast("Copy failed", true));
                }
            };

            if (elements.upiCopyButton) {
                elements.upiCopyButton.addEventListener("click", () => copyText("vaibhav.ganesh51@okaxis", "Copied", "UPI ID"));
            }
            if (elements.mobileCopyButton) {
                elements.mobileCopyButton.addEventListener("click", () => copyText("+919468937372", "Copied", "Mobile Number"));
            }

            const groupNumbersIntoRanges = (numbers) => {
                if (!numbers || numbers.length === 0) return [];
                const ranges = [];
                let start = numbers[0], end = numbers[0];
                for (let i = 1; i < numbers.length; i++) {
                    if (numbers[i] === end + 1) { end = numbers[i]; } else {
                        ranges.push(start === end ? `${start}` : `${start}-${end}`);
                        start = numbers[i]; end = numbers[i];
                    }
                }
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                return ranges;
            };

            const groupNumbersIntoRangesCached = (numbers) => {
                if (!numbers || numbers.length === 0) return [];
                const cached = groupedRangesCache.get(numbers);
                if (cached) return cached;
                const computed = groupNumbersIntoRanges(numbers);
                groupedRangesCache.set(numbers, computed);
                return computed;
            };

            const getFormattedDateWithDay = (dateString) => {
                if (!dateString || typeof dateString !== 'string') return 'N/A';
                const parts = dateString.split('-');
                if (parts.length !== 3) return dateString;
                try {
                    const dateObj = new Date(Date.UTC(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
                    if (isNaN(dateObj.getTime())) return dateString;
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
                    return `${dateString} (${dayName})`;
                } catch (e) { return dateString; }
            };

            const getDurationInHours = () => {
                if (!state.startTime || !state.endTime || !state.startTime.includes(':') || !state.endTime.includes(':')) return 0;
                try {
                    const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
                    const startMatch = state.startTime.match(timePattern), endMatch = state.endTime.match(timePattern);
                    if (!startMatch || !endMatch) return 0;
                    let h1 = parseInt(startMatch[1]), m1 = parseInt(startMatch[2]), p1 = startMatch[3]?.toUpperCase();
                    let h2 = parseInt(endMatch[1]), m2 = parseInt(endMatch[2]), p2 = endMatch[3]?.toUpperCase();
                    if (p1 === 'PM' && h1 !== 12) h1 += 12; else if (p1 === 'AM' && h1 === 12) h1 = 0;
                    if (p2 === 'PM' && h2 !== 12) h2 += 12; else if (p2 === 'AM' && h2 === 12) h2 = 0;
                    const t1 = new Date(0,0,0,h1,m1), t2 = new Date(0,0,0,h2,m2);
                    return t2 <= t1 ? 0 : (t2 - t1) / 36e5;
                } catch (e) { return 0; }
            };

            const getDurationString = () => {
                const totalHours = getDurationInHours();
                if (totalHours === 0) return "";
                const h = Math.floor(totalHours), m = Math.round((totalHours - h) * 60);
                return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
            };

            const getRollRanges = () => [
                state.minRoll === '' ? NaN : parseInt(state.minRoll || '', 10),
                state.maxRoll === '' ? NaN : parseInt(state.maxRoll || '', 10)
            ];

            const validateRollNumbers = (input) => {
                const rawTokens = input.trim().split(/[,\s\n]+/).filter(Boolean);
                if (rawTokens.length === 0) return { valid: true, numbers: [], duplicates: [], errors: { nonNumeric: [], outOfRange: [], invalidRange: [] } };
                const seen = new Map();
                const numbers = [], duplicates = [], nonNumeric = [], outOfRange = [], invalidRange = [];
                const [min, max] = getRollRanges();

                rawTokens.forEach(token => {
                    if (token.includes('-')) {
                        const [startStr, endStr] = token.split('-');
                        const start = Number(startStr.trim()), end = Number(endStr.trim());
                        if (isNaN(start) || isNaN(end) || start > end) { invalidRange.push(token); return; }
                        for (let i = start; i <= end; i++) {
                            if (seen.has(i)) duplicates.push(i);
                            seen.set(i, (seen.get(i) || 0) + 1);
                            if (i >= min && i <= max) numbers.push(i); else outOfRange.push(i);
                        }
                    } else {
                        const num = Number(token);
                        if (isNaN(num)) { nonNumeric.push(token); return; }
                        if (seen.has(num)) duplicates.push(num);
                        seen.set(num, (seen.get(num) || 0) + 1);
                        if (num < min || num > max) outOfRange.push(num);
                        else numbers.push(num);
                    }
                });

                const uniqueDuplicates = [...new Set(duplicates)];

                return {
                    valid: nonNumeric.length === 0 && outOfRange.length === 0 && invalidRange.length === 0 && uniqueDuplicates.length === 0,
                    numbers: [...new Set(numbers)].sort((a, b) => a - b),
                    duplicates: uniqueDuplicates,
                    errors: { nonNumeric, outOfRange, invalidRange }
                };
            };

            const getValidationResult = (inputText) => {
                const input = String(inputText || '');
                const [min, max] = getRollRanges();
                const cacheKey = `${min}|${max}|${input}`;
                if (validationCacheKey === cacheKey && validationCacheValue) return validationCacheValue;
                const result = validateRollNumbers(input);
                validationCacheKey = cacheKey;
                validationCacheValue = result;
                return result;
            };

            const buildValidationErrorMessage = (validation) => {
                if (!validation || validation.valid) return '';
                const summarize = (label, values) => {
                    const list = Array.isArray(values) ? values : [];
                    const deduped = [...new Set(list.map((item) => String(item).trim()).filter(Boolean))];
                    if (deduped.length === 0) return '';
                    const previewLimit = 12;
                    const preview = deduped.slice(0, previewLimit).join(', ');
                    const extra = deduped.length > previewLimit ? `, +${deduped.length - previewLimit} more` : '';
                    return `${label} (${deduped.length}): ${preview}${extra}`;
                };

                const parts = [
                    summarize('Duplicates', validation.duplicates),
                    summarize('Non-numeric', validation.errors?.nonNumeric),
                    summarize('Out of range', validation.errors?.outOfRange),
                    summarize('Invalid ranges', validation.errors?.invalidRange)
                ].filter(Boolean);

                return parts.join(' | ');
            };

            const getAttendanceStats = (inputNumbers, inputMode) => {
                const [min, max] = getRollRanges();

                if (
                    statsCacheInputRef === inputNumbers &&
                    statsCacheMode === inputMode &&
                    statsCacheMin === min &&
                    statsCacheMax === max &&
                    statsCacheResult
                ) {
                    return statsCacheResult;
                }

                if (isNaN(min) || isNaN(max) || min > max) return { presentNumbers: [], absentNumbers: [], allNumbers: [] };
                if (allNumbersCacheMin !== min || allNumbersCacheMax !== max) {
                    allNumbersCache = Array.from({ length: max - min + 1 }, (_, i) => i + min);
                    allNumbersCacheMin = min;
                    allNumbersCacheMax = max;
                }
                const allNumbers = allNumbersCache;
                const inputNumbersSet = new Set(inputNumbers);
                let presentNumbers, absentNumbers;
                if (inputMode === 'absent') {
                    absentNumbers = [...inputNumbers].sort((a,b)=>a-b);
                    presentNumbers = allNumbers.filter(n => !inputNumbersSet.has(n));
                } else {
                    presentNumbers = [...inputNumbers].sort((a,b)=>a-b);
                    absentNumbers = allNumbers.filter(n => !inputNumbersSet.has(n));
                }
                const result = { presentNumbers, absentNumbers, allNumbers };
                statsCacheInputRef = inputNumbers;
                statsCacheMode = inputMode;
                statsCacheMin = min;
                statsCacheMax = max;
                statsCacheResult = result;
                return result;
            };

            const updateAttendanceModeUI = (mode) => {
                elements.attendanceModeToggle.querySelectorAll('button').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === mode);
                });
            };

            const toggleClassTypeFields = () => {
                const isTheory = elements.classType.value === "Theory";
                elements.theoryTypeContainer.classList.toggle("hidden", !isTheory);
                elements.batchContainer.classList.toggle("hidden", isTheory);
            };

            const updateUndoRedoButtons = () => {
                elements.undoButton.disabled = undoStack.length <= 1;
                elements.redoButton.disabled = redoStack.length === 0;
            };

            const updateRollCount = (attendanceText = '') => {
                const validation = getValidationResult(attendanceText);
                elements.rollCount.textContent = String(validation.numbers.length);
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

            const ensureOutputStructure = () => {
                if (reportMetaNode && reportStatusNode && reportStatsNode) return;
                elements.outputPanel.innerHTML = `
                    <div class="space-y-6">
                        <div id="reportMetaSection"></div>
                        <div id="reportStatusSection"></div>
                        <div id="reportStatsSection"></div>
                    </div>
                `;
                reportMetaNode = document.getElementById('reportMetaSection');
                reportStatusNode = document.getElementById('reportStatusSection');
                reportStatsNode = document.getElementById('reportStatsSection');
            };

            const setSectionHtml = (node, nextHtml, lastHtmlKey) => {
                if (!node) return nextHtml;
                if (lastHtmlKey === nextHtml) return lastHtmlKey;
                node.innerHTML = nextHtml;
                return nextHtml;
            };

            const invalidateRenderedStatsCache = () => {
                lastRenderedStatsNumbersRef = null;
                lastRenderedStatsMode = '';
                lastRenderedStatsMin = NaN;
                lastRenderedStatsMax = NaN;
            };

            const resetOutputPanel = () => {
                reportMetaNode = null;
                reportStatusNode = null;
                reportStatsNode = null;
                lastReportMetaHtml = '';
                lastReportStatusHtml = '';
                lastReportStatsHtml = '';
                invalidateRenderedStatsCache();
                elements.outputPanel.innerHTML = `<div class="flex flex-col items-center justify-center h-full opacity-40">
                    <p class="text-lg">Waiting for input...</p>
                </div>`;
            };

            const renderOutput = () => {
                const { attendance, attendanceInputMode } = state;
                const [minRoll, maxRoll] = getRollRanges();
                updateRollCount(attendance);
                ensureOutputStructure();

                const duration = getDurationString();
                const formattedStartTime = formatTimeForReport(state.startTime);
                const formattedEndTime = formatTimeForReport(state.endTime);
                const liveReportTimeLine = (formattedStartTime && formattedEndTime)
                    ? `${formattedStartTime} - ${formattedEndTime} (${duration})`
                    : "N/A";
                const row = (l, v) => `<div class="mb-3"><p class="text-sm uppercase tracking-wider opacity-90 mb-1 font-bold">${escapeHtml(l)}</p><p class="font-medium text-lg">${escapeHtml(v || '—')}</p></div>`;
                
                const metaHtml = `
                    <div class="report-card p-5">
                        <div class="grid grid-cols-2 gap-4">
                            ${row("Faculty", state.facultyName)}
                            ${row("Senior Resident", state.srName || '—')}
                            ${row("Topic", state.lectureTopic)}
                        </div>
                        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-outline-light/10 mt-2 dark:border-outline-dark/10">
                            ${row("Date", getFormattedDateWithDay(state.date))}
                            ${row("Time (Duration)", liveReportTimeLine)}
                        </div>
                    </div>
                `;
                lastReportMetaHtml = setSectionHtml(reportMetaNode, metaHtml, lastReportMetaHtml);

                elements.minRoll.classList.remove('form-input-error');
                elements.maxRoll.classList.remove('form-input-error');

                if (isNaN(minRoll) || isNaN(maxRoll)) {
                    lastReportStatusHtml = setSectionHtml(
                        reportStatusNode,
                        `<div class="flex flex-col items-center justify-center p-8 opacity-50 border-2 border-dashed border-outline-light/20 rounded-xl dark:border-outline-dark/20"><p>Set a valid Min/Max roll number range to see stats.</p></div>`,
                        lastReportStatusHtml
                    );
                    lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml);
                    invalidateRenderedStatsCache();
                    return;
                }

                if (minRoll > maxRoll) {
                    elements.minRoll.classList.add('form-input-error');
                    elements.maxRoll.classList.add('form-input-error');
                    lastReportStatusHtml = setSectionHtml(
                        reportStatusNode,
                        `<div class="flex flex-col items-center justify-center p-8 text-error-light dark:text-error-dark border-2 border-dashed border-error-light/30 rounded-xl dark:border-error-dark/30"><p>Min Roll cannot be greater than Max Roll.</p></div>`,
                        lastReportStatusHtml
                    );
                    lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml);
                    invalidateRenderedStatsCache();
                    return;
                }
                
                const validation = getValidationResult(attendance);
                elements.attendanceInput.classList.remove("form-input-error", "form-input-valid");
                
                if (validation.valid) {
                    elements.errorMessage.textContent = '';
                    if(attendance.trim().length > 0) elements.attendanceInput.classList.add("form-input-valid");
                } else {
                    elements.attendanceInput.classList.add("form-input-error");
                    elements.errorMessage.textContent = buildValidationErrorMessage(validation);
                }
                if (!validation.valid && attendance.trim().length > 0) {
                    lastReportStatusHtml = setSectionHtml(
                        reportStatusNode,
                        `<div class="flex flex-col items-center justify-center p-8 opacity-50"><p>Fix validation errors to calculate stats.</p></div>`,
                        lastReportStatusHtml
                    );
                    lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml);
                    invalidateRenderedStatsCache();
                    return;
                }

                lastReportStatusHtml = setSectionHtml(reportStatusNode, '', lastReportStatusHtml);

                const shouldRebuildStatsSection =
                    lastRenderedStatsNumbersRef !== validation.numbers ||
                    lastRenderedStatsMode !== attendanceInputMode ||
                    lastRenderedStatsMin !== minRoll ||
                    lastRenderedStatsMax !== maxRoll;

                if (!shouldRebuildStatsSection) return;

                const { presentNumbers, absentNumbers, allNumbers } = getAttendanceStats(validation.numbers, attendanceInputMode);
                const presentPct = allNumbers.length ? (presentNumbers.length / allNumbers.length * 100) : 0;
                const absentPct = allNumbers.length ? (absentNumbers.length / allNumbers.length * 100) : 0;

                const createMeter = (pct, colorClass) => `
                    <div class="relative w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div class="h-full rounded-full ${colorClass}" style="width: ${pct}%"></div>
                        <div class="quartile-marker" style="left: 25%"></div>
                        <div class="quartile-marker" style="left: 50%"></div>
                        <div class="quartile-marker" style="left: 75%"></div>
                    </div>`;

                const presentRanges = groupNumbersIntoRangesCached(presentNumbers);
                const absentRanges = groupNumbersIntoRangesCached(absentNumbers);
                const buildPillsHtml = (ranges, pillClass, headingLabel) => {
                    if (!ranges.length) return '';
                    const toPill = (range) => `<span class="${pillClass} attendance-pill shadow-sm">${range}</span>`;

                    if (ranges.length <= PILLS_INLINE_RENDER_LIMIT) {
                        return `<div class="attendance-pill-list">${ranges.map(toPill).join('')}</div>`;
                    }

                    const previewRanges = ranges.slice(0, PILLS_INLINE_RENDER_LIMIT);
                    const remaining = ranges.length - previewRanges.length;
                    return `
                        <div class="space-y-3">
                            <div class="attendance-pill-list">${previewRanges.map(toPill).join('')}</div>
                            <details class="rounded-lg border border-outline-light/20 dark:border-outline-dark/20 p-3">
                                <summary class="cursor-pointer text-sm font-semibold">Show ${remaining} more ${escapeHtml(headingLabel.toLowerCase())} ranges</summary>
                                <div class="attendance-pill-list mt-3">${ranges.slice(PILLS_INLINE_RENDER_LIMIT).map(toPill).join('')}</div>
                            </details>
                        </div>
                    `;
                };
                const presentPillsHtml = buildPillsHtml(presentRanges, 'present-pill', 'Present');
                const absentPillsHtml = buildPillsHtml(absentRanges, 'absent-pill', 'Absent');
                const statsHtml = `
                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="report-card p-4 stats-card border-success-light dark:border-success-dark">
                                <p class="stats-heading opacity-90">Present</p>
                                <div class="flex items-baseline gap-2">
                                    <p class="text-2xl font-bold text-success-light dark:text-success-dark">${presentNumbers.length}</p>
                                    <span class="text-sm opacity-50">(${presentPct.toFixed(1)}%)</span>
                                </div>
                                ${createMeter(presentPct, 'bg-meter-present')}
                            </div>
                            <div class="report-card p-4 stats-card border-error-light dark:border-error-dark">
                                <p class="stats-heading opacity-90">Absent</p>
                                <div class="flex items-baseline gap-2">
                                    <p class="text-2xl font-bold text-error-light dark:text-error-dark">${absentNumbers.length}</p>
                                    <span class="text-sm opacity-50">(${absentPct.toFixed(1)}%)</span>
                                </div>
                                ${createMeter(absentPct, 'bg-meter-absent')}
                            </div>
                        </div>

                        ${presentNumbers.length > 0 ? `<div class="report-card p-5"><p class="text-sm font-bold uppercase tracking-wide opacity-90 mb-3">Present Rolls</p>${presentPillsHtml}</div>` : ''}
                        ${absentNumbers.length > 0 ? `<div class="report-card p-5"><p class="text-sm font-bold uppercase tracking-wide opacity-90 mb-3">Absent Rolls</p>${absentPillsHtml}</div>` : ''}
                    </div>
                `;
                lastReportStatsHtml = setSectionHtml(reportStatsNode, statsHtml, lastReportStatsHtml);
                lastRenderedStatsNumbersRef = validation.numbers;
                lastRenderedStatsMode = attendanceInputMode;
                lastRenderedStatsMin = minRoll;
                lastRenderedStatsMax = maxRoll;
            };

            const recordAndRender = (newState) => {
                state = newState;
                undoStack.push(JSON.stringify(state));
                if (undoStack.length > MAX_UNDO_HISTORY) undoStack.shift();
                redoStack = [];
                updateUndoRedoButtons();
                renderOutput();
                saveToStorage();
            };
            const hasPatchChanges = (patch) => Object.keys(patch).some(key => state[key] !== patch[key]);
            const setState = (patch) => {
                if (!hasPatchChanges(patch)) return;
                recordAndRender({ ...state, ...patch });
            };

            const loadStateWithoutRecording = (newState) => {
                cancelScheduledRollCountUpdate();
                state = newState;
                if(newState.date) datePicker.setDate(newState.date, false);
                
                for (const key in state) {
                    if (elements[key] && typeof elements[key].value !== 'undefined') { elements[key].value = state[key]; }
                }

                // Keep textarea content in sync with stored attendance across refresh/undo/redo.
                elements.attendanceInput.value = state.attendance || '';
                
                toggleClassTypeFields();
                updateAttendanceModeUI(state.attendanceInputMode || 'present');
                updateRollCount(elements.attendanceInput.value);

                renderOutput();
                updateUndoRedoButtons();
            };

            const onInputChange = (field, value) => {
                if (state[field] === value) return;
                setState({ [field]: value });
            };
            const onDateChange = (value) => {
                const nextDate = String(value || '').trim();
                if (!nextDate) return;
                // Re-render when the same date is reselected, without creating an extra undo step.
                if (state.date === nextDate) {
                    renderOutput();
                    return;
                }
                setState({ date: nextDate });
            };
            const onTimeFieldChange = (field) => (e) => {
                const nextValue = e.target.value;
                if (state[field] === nextValue) return;
                onInputChange(field, nextValue);
            };

            elements.attendanceInput.addEventListener('input', e => {
                const value = e.target.value;
                scheduleRollCountUpdate(value);

                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => setState({ attendance: value }), DEBOUNCE_DELAY);
            });

            elements.clearRollsButton.addEventListener('click', () => {
                cancelPendingAttendanceCommit();
                cancelScheduledRollCountUpdate();
                elements.attendanceInput.value = '';
                updateRollCount('');
                elements.errorMessage.textContent = '';
                elements.attendanceInput.classList.remove('form-input-valid', 'form-input-error');
                setState({ attendance: '' });
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
                if (!validation.valid) {
                    elements.errorMessage.textContent = buildValidationErrorMessage(validation);
                    elements.attendanceInput.classList.remove('form-input-valid');
                    elements.attendanceInput.classList.add('form-input-error');
                    showToast('Invalid entries found. Remove them and try sorting again.', true);
                    return;
                }

                const sortedValid = validation.numbers;
                const newInput = sortedValid.join(', ');

                elements.attendanceInput.value = newInput;
                cancelScheduledRollCountUpdate();
                updateRollCount(newInput);

                cancelPendingAttendanceCommit();
                setState({ attendance: newInput });

                const validCount = sortedValid.length;
                showToast(`Sorted ${validCount} valid roll${validCount !== 1 ? 's' : ''}`);
            });

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

            elements.classType.addEventListener('change', e => {
                toggleClassTypeFields();
                onInputChange('classType', e.target.value);
            });

            elements.attendanceModeToggle.addEventListener('click', e => {
                if(e.target.tagName === 'BUTTON') {
                    const newMode = e.target.dataset.mode;
                    updateAttendanceModeUI(newMode);
                    onInputChange('attendanceInputMode', newMode);
                }
            });

            datePicker.set("onChange", (_, str) => onDateChange(str));
            if (!window.flatpickr && elements.datePickerEl) {
                elements.datePickerEl.addEventListener('input', (event) => onDateChange(event.target.value));
            }
            if (elements.datePickerEl) {
                ['focus', 'pointerdown', 'touchstart'].forEach((eventName) => {
                    elements.datePickerEl.addEventListener(eventName, () => {
                        ensureFlatpickrLoaded().catch(() => {
                            // Native date entry remains available if the enhancement fails.
                        });
                    }, { passive: true, once: true });
                });
            }
            const setDateByOffset = (offsetDays) => {
                const target = new Date();
                target.setDate(target.getDate() + offsetDays);
                datePicker.setDate(target, true);
            };
            if (elements.setYesterdayButton) elements.setYesterdayButton.addEventListener("click", () => setDateByOffset(-1));
            if (elements.setTodayButton) elements.setTodayButton.addEventListener("click", () => setDateByOffset(0));
            if (elements.setTomorrowButton) elements.setTomorrowButton.addEventListener("click", () => setDateByOffset(1));
            elements.startTimeEl.addEventListener("change", onTimeFieldChange("startTime"));
            elements.endTimeEl.addEventListener("change", onTimeFieldChange("endTime"));

            elements.undoButton.addEventListener("click", () => {
                if (undoStack.length > 1) { 
                    redoStack.push(undoStack.pop()); 
                    loadStateWithoutRecording(JSON.parse(undoStack[undoStack.length - 1])); 
                }
            });
            elements.redoButton.addEventListener("click", () => {
                if (redoStack.length > 0) { 
                    const nextState = JSON.parse(redoStack.pop()); 
                    undoStack.push(JSON.stringify(nextState)); 
                    loadStateWithoutRecording(nextState); 
                }
            });

            const resetForm = () => {
                if (confirm("Reset form? All data will be cleared.")) { 
                    cancelPendingAttendanceCommit();
                    cancelScheduledRollCountUpdate();
                    if (persistTimer) {
                        clearTimeout(persistTimer);
                        persistTimer = null;
                    }
                    persistPendingJson = null;
                    safeStorage.remove(STORAGE_KEY);
                    const clearedState = getInitialState();

                    state = clearedState;
                    undoStack = [JSON.stringify(clearedState)];
                    redoStack = [];

                    datePicker.setDate(clearedState.date, true);
                    elements.startTimeEl.value = '';
                    elements.endTimeEl.value = '';

                    ['facultyName', 'srName', 'lectureTopic', 'theoryType', 'batch', 'minRoll', 'maxRoll', 'attendanceInput']
                        .forEach(key => { elements[key].value = ''; });
                    elements.classType.value = 'Theory';
                    elements.attendanceInput.classList.remove('form-input-valid', 'form-input-error');
                    elements.errorMessage.textContent = '';
                    elements.rollCount.textContent = '0';

                    elements.attendanceModeToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                    elements.attendanceModeToggle.querySelector('[data-mode="present"]').classList.add('active');

                    toggleClassTypeFields();

                    resetOutputPanel();

                    switchSection('section1');

                    showToast("Form cleared");
                    updateUndoRedoButtons();
                }
            };
            elements.clearFormButton.addEventListener("click", resetForm);

            const buildReportCopyText = () => {
                const validation = getValidationResult(state.attendance);
                if (!validation.valid && state.attendance.trim() !== "") { 
                    showToast("Fix errors first", true); 
                    return null;
                }
                
                const { presentNumbers, absentNumbers, allNumbers } = getAttendanceStats(validation.numbers, state.attendanceInputMode);
                const duration = getDurationString();
                const total = allNumbers.length;
                const pPct = total ? ((presentNumbers.length / total) * 100).toFixed(1) : "0.0";
                const aPct = total ? ((absentNumbers.length / total) * 100).toFixed(1) : "0.0";

                const formattedStartTime = formatTimeForReport(state.startTime);
                const formattedEndTime = formatTimeForReport(state.endTime);
                const timeLine = formattedStartTime && formattedEndTime 
                    ? `${formattedStartTime} - ${formattedEndTime}${duration ? ` (${duration})` : ''}` 
                    : 'N/A';

                let typeLine = state.classType;
                if (state.classType === "Theory" && state.theoryType) {
                    typeLine = `Lecture (${state.theoryType})`;
                } else if (state.classType === "Practical" && state.batch) {
                    typeLine = `Practical (${state.batch})`;
                }

                const dateWithDay = getFormattedDateWithDay(state.date).replace(
                    /^(\d{2})-(\d{2})-(\d{4})/,
                    '$1/$2/$3'
                );

                const text = `Date: ${dateWithDay}, Time: ${timeLine}
Faculty - ${state.facultyName || '—'}, Senior Resident - ${state.srName || '—'}
Topic - ${state.lectureTopic || '—'}
Type - ${typeLine || '—'}
Total Students: ${total}, Present: ${presentNumbers.length} (${pPct}%), Absent: ${absentNumbers.length} (${aPct}%)
Present Students: ${groupNumbersIntoRanges(presentNumbers).join(', ') || 'None'}
Absent Students: ${groupNumbersIntoRanges(absentNumbers).join(', ') || 'None'}`;
                return text;
            };

            const buildSheetCopyText = () => {
                const validation = getValidationResult(state.attendance);
                if (!validation.valid && state.attendance.trim() !== "") {
                    showToast("Invalid roll numbers", true);
                    return null;
                }

                const [min, max] = getRollRanges();
                if (isNaN(min) || isNaN(max) || min > max) {
                    showToast("Invalid Roll Range", true);
                    return null;
                }

                const { presentNumbers } = getAttendanceStats(validation.numbers, state.attendanceInputMode);
                const presentSet = new Set(presentNumbers);
                const durationVal = getDurationInHours() || 1;

                const rows = [];
                for(let i = min; i <= max; i++) {
                    rows.push(presentSet.has(i) ? durationVal : 0);
                }
                return rows.join('\n');
            };

            const closeDownloadMenu = () => {
                elements.downloadMenu.classList.remove('open');
                elements.downloadButton.setAttribute('aria-expanded', 'false');
            };

            elements.downloadButton.addEventListener("click", (event) => {
                event.stopPropagation();
                const isOpen = elements.downloadMenu.classList.toggle('open');
                elements.downloadButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });

            elements.downloadOptionReport.addEventListener("click", () => {
                const text = buildReportCopyText();
                if (text) copyText(text, "Copied", "G-Doc Data");
                closeDownloadMenu();
            });

            elements.downloadOptionSheet.addEventListener("click", () => {
                const text = buildSheetCopyText();
                if (text) copyText(text, "Copied", "G-Sheet Data");
                closeDownloadMenu();
            });

            document.addEventListener("click", (event) => {
                if (!elements.downloadMenu.contains(event.target)) closeDownloadMenu();
            });

            document.querySelectorAll('.nav-section-btn').forEach(btn => {
                btn.addEventListener('click', () => switchSection(btn.dataset.target));
            });
            document.querySelectorAll('[data-switch]').forEach(btn => {
                btn.addEventListener('click', () => switchSection(btn.dataset.switch));
            });

            document.addEventListener('keydown', (event) => {
                if (
                    event.key === 'Backspace' &&
                    event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey &&
                    !event.metaKey
                ) {
                    event.preventDefault();
                    resetForm();
                    return;
                }

                if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return;
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

                const currentSectionIndex = sectionOrder.indexOf(getCurrentSectionId());
                if (currentSectionIndex === -1) return;

                const nextIndex = event.key === 'ArrowRight'
                    ? Math.min(currentSectionIndex + 1, sectionOrder.length - 1)
                    : Math.max(currentSectionIndex - 1, 0);

                if (nextIndex === currentSectionIndex) return;

                event.preventDefault();
                switchSection(sectionOrder[nextIndex]);
                const section = document.getElementById(sectionOrder[nextIndex]);
                const firstFocusable = section && Array.from(section.querySelectorAll('input, select, textarea, button'))
                    .find(el => !el.disabled && el.offsetParent);
                if (firstFocusable) firstFocusable.focus();
            });

            let initialState = loadFromStorage();
            undoStack.push(JSON.stringify(initialState));
            loadStateWithoutRecording(initialState);
            switchSection('section1');

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') flushPendingSave();
            });
            window.addEventListener('pagehide', flushPendingSave);
            window.addEventListener('beforeunload', flushPendingSave);
        });
