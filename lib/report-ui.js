(function attachAttendanceReportUI(globalScope) {
    const PILLS_INLINE_RENDER_LIMIT = 80;

    const createReportRenderer = ({ outputPanel, minRollEl, maxRollEl, attendanceInputEl, errorMessageEl, escapeHtml, maxRollRangeSize = 5000, onTargetActivate }) => {
        let reportMetaNode = null;
        let reportStatusNode = null;
        let reportStatsNode = null;
        let reportMetaCardNode = null;
        let cachedMetaItems = [];
        let cachedInteractiveCards = [];
        let lastReportMetaHtml = '';
        let lastReportStatusHtml = '';
        let lastReportStatsHtml = '';
        let lastRenderedStatsNumbersRef = null;
        let lastRenderedStatsMode = '';
        let lastRenderedStatsMin = NaN;
        let lastRenderedStatsMax = NaN;
        let activeTargetKey = '';

        const META_TARGETS = new Set(['faculty', 'sr', 'topic', 'date', 'time', 'class-type']);

        const refreshMetaDomCache = () => {
            reportMetaCardNode = document.getElementById('reportMetaCard');
            cachedMetaItems = reportMetaNode
                ? Array.from(reportMetaNode.querySelectorAll('.report-meta-item[data-report-target]'))
                : [];
        };

        const refreshInteractiveCardCache = () => {
            const statusCards = reportStatusNode
                ? Array.from(reportStatusNode.querySelectorAll('.report-interactive-card[data-report-target]'))
                : [];
            const statsCards = reportStatsNode
                ? Array.from(reportStatsNode.querySelectorAll('.report-interactive-card[data-report-target]'))
                : [];
            cachedInteractiveCards = statusCards.concat(statsCards);
        };

        const applyActiveHighlight = () => {
            if (!outputPanel) return;

            if (reportMetaCardNode) {
                reportMetaCardNode.classList.toggle('is-active-field-card', META_TARGETS.has(activeTargetKey));
            }

            for (let i = 0; i < cachedMetaItems.length; i++) {
                const item = cachedMetaItems[i];
                item.classList.toggle(
                    'is-active-report-item',
                    Boolean(activeTargetKey) && item.dataset.reportTarget === activeTargetKey
                );
            }

            const activeCardTargets = new Set();
            if (activeTargetKey === 'roll-range') {
                activeCardTargets.add('roll-range');
                activeCardTargets.add('present-stats');
                activeCardTargets.add('absent-stats');
            } else if (activeTargetKey === 'attendance') {
                activeCardTargets.add('attendance');
                if (lastRenderedStatsMode === 'absent') {
                    activeCardTargets.add('absent-stats');
                    activeCardTargets.add('absent-rolls');
                } else {
                    activeCardTargets.add('present-stats');
                    activeCardTargets.add('present-rolls');
                }
            } else if (activeTargetKey === 'present-stats' || activeTargetKey === 'present-rolls') {
                activeCardTargets.add('present-stats');
                activeCardTargets.add('present-rolls');
                activeCardTargets.add('attendance');
            } else if (activeTargetKey === 'absent-stats' || activeTargetKey === 'absent-rolls') {
                activeCardTargets.add('absent-stats');
                activeCardTargets.add('absent-rolls');
                activeCardTargets.add('attendance');
            }

            for (let i = 0; i < cachedInteractiveCards.length; i++) {
                const card = cachedInteractiveCards[i];
                card.classList.toggle(
                    'is-active-field-card',
                    activeCardTargets.has(card.dataset.reportTarget)
                );
            }
        };

        const setActiveTarget = (nextTarget = '') => {
            const normalized = nextTarget || '';
            if (activeTargetKey === normalized) return;
            activeTargetKey = normalized;
            applyActiveHighlight();
        };

        const ensureOutputStructure = () => {
            if (reportMetaNode && reportStatusNode && reportStatsNode) return;
            outputPanel.innerHTML = `
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

        const setSectionHtml = (node, nextHtml, lastHtmlKey, onUpdated) => {
            if (!node) return nextHtml;
            if (lastHtmlKey === nextHtml) return lastHtmlKey;
            node.innerHTML = nextHtml;
            if (typeof onUpdated === 'function') onUpdated();
            return nextHtml;
        };

        const invalidateRenderedStatsCache = () => {
            lastRenderedStatsNumbersRef = null;
            lastRenderedStatsMode = '';
            lastRenderedStatsMin = NaN;
            lastRenderedStatsMax = NaN;
        };

        const reset = () => {
            reportMetaNode = null;
            reportStatusNode = null;
            reportStatsNode = null;
            reportMetaCardNode = null;
            cachedMetaItems = [];
            cachedInteractiveCards = [];
            lastReportMetaHtml = '';
            lastReportStatusHtml = '';
            lastReportStatsHtml = '';
            invalidateRenderedStatsCache();
            outputPanel.innerHTML = `<div class="flex flex-col items-center justify-center h-full opacity-40">
                <p class="text-lg">Waiting for input...</p>
            </div>`;
        };

        const createMeter = (pct, colorClass) => `
            <div class="relative w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div class="h-full rounded-full ${colorClass}" style="width: ${pct}%"></div>
                <div class="quartile-marker" style="left: 25%"></div>
                <div class="quartile-marker" style="left: 50%"></div>
                <div class="quartile-marker" style="left: 75%"></div>
            </div>`;

        const buildPillsHtml = (ranges, pillClass, headingLabel) => {
            if (!ranges || !ranges.length) return '';
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

        const render = (state, report, buildValidationErrorMessage) => {
            const { attendance, attendanceInputMode } = state;
            const { range, validation } = report;
            ensureOutputStructure();

            const row = (label, value, targetKey) => `
                <div class="report-meta-item mb-1" data-report-target="${targetKey}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(label)}">
                    <p class="report-item-label text-sm uppercase tracking-wider opacity-90 mb-1 font-bold">${escapeHtml(label)}</p>
                    <p class="report-item-value font-medium text-lg">${escapeHtml(value || '-')}</p>
                </div>
            `;

            const metaHtml = `
                <div id="reportMetaCard" class="report-card p-5">
                    <div class="grid grid-cols-2 gap-4">
                        ${row("Faculty", state.facultyName, "faculty")}
                        ${row("Senior Resident", state.srName, "sr")}
                        ${row("Topic", state.lectureTopic, "topic")}
                        ${row("Type", report.typeLine, "class-type")}
                    </div>
                    <div class="grid grid-cols-2 gap-4 pt-2 border-t border-outline-light/10 mt-2 dark:border-outline-dark/10">
                        ${row("Date", report.dateWithDay, "date")}
                        ${row("Time (Duration)", report.timeLine, "time")}
                    </div>
                </div>
            `;
            lastReportMetaHtml = setSectionHtml(reportMetaNode, metaHtml, lastReportMetaHtml, refreshMetaDomCache);

            if (minRollEl) minRollEl.classList.remove('form-input-error');
            if (maxRollEl) maxRollEl.classList.remove('form-input-error');

            if (range.reason === 'missing') {
                lastReportStatusHtml = setSectionHtml(
                    reportStatusNode,
                    `<div class="report-interactive-card report-status-card flex flex-col items-center justify-center p-8 opacity-60 border-2 border-dashed border-outline-light/20 rounded-xl dark:border-outline-dark/20" data-report-target="roll-range" role="button" tabindex="0" aria-label="Edit Min and Max Roll Range"><p>Set a valid Min/Max roll number range to see stats.</p></div>`,
                    lastReportStatusHtml,
                    refreshInteractiveCardCache
                );
                lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml, refreshInteractiveCardCache);
                invalidateRenderedStatsCache();
                applyActiveHighlight();
                return;
            }

            if (range.reason === 'reversed') {
                if (minRollEl) minRollEl.classList.add('form-input-error');
                if (maxRollEl) maxRollEl.classList.add('form-input-error');
                lastReportStatusHtml = setSectionHtml(
                    reportStatusNode,
                    `<div class="report-interactive-card report-status-card flex flex-col items-center justify-center p-8 text-error-light dark:text-error-dark border-2 border-dashed border-error-light/30 rounded-xl dark:border-error-dark/30" data-report-target="roll-range" role="button" tabindex="0" aria-label="Edit Min and Max Roll Range"><p>Min Roll cannot be greater than Max Roll.</p></div>`,
                    lastReportStatusHtml,
                    refreshInteractiveCardCache
                );
                lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml, refreshInteractiveCardCache);
                invalidateRenderedStatsCache();
                applyActiveHighlight();
                return;
            }

            if (range.reason === 'tooLarge') {
                if (minRollEl) minRollEl.classList.add('form-input-error');
                if (maxRollEl) maxRollEl.classList.add('form-input-error');
                lastReportStatusHtml = setSectionHtml(
                    reportStatusNode,
                    `<div class="report-interactive-card report-status-card flex flex-col items-center justify-center p-8 text-error-light dark:text-error-dark border-2 border-dashed border-error-light/30 rounded-xl dark:border-error-dark/30" data-report-target="roll-range" role="button" tabindex="0" aria-label="Edit Min and Max Roll Range"><p>Roll range is too large. Use ${maxRollRangeSize} rolls or fewer.</p></div>`,
                    lastReportStatusHtml,
                    refreshInteractiveCardCache
                );
                lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml, refreshInteractiveCardCache);
                invalidateRenderedStatsCache();
                applyActiveHighlight();
                return;
            }

            if (attendanceInputEl) {
                attendanceInputEl.classList.remove('form-input-error', 'form-input-valid');
            }

            if (validation.valid) {
                if (errorMessageEl) errorMessageEl.textContent = '';
                if (attendance.trim().length > 0 && attendanceInputEl) {
                    attendanceInputEl.classList.add('form-input-valid');
                }
            } else {
                if (attendanceInputEl) attendanceInputEl.classList.add('form-input-error');
                if (errorMessageEl && typeof buildValidationErrorMessage === 'function') {
                    errorMessageEl.textContent = buildValidationErrorMessage(validation);
                }
            }

            if (!validation.valid && attendance.trim().length > 0) {
                lastReportStatusHtml = setSectionHtml(
                    reportStatusNode,
                    `<div class="report-interactive-card report-status-card flex flex-col items-center justify-center p-8 opacity-60 border-2 border-dashed border-outline-light/20 rounded-xl dark:border-outline-dark/20" data-report-target="attendance" role="button" tabindex="0" aria-label="Fix Roll Call Input"><p>Fix validation errors to calculate stats.</p></div>`,
                    lastReportStatusHtml,
                    refreshInteractiveCardCache
                );
                lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml, refreshInteractiveCardCache);
                invalidateRenderedStatsCache();
                applyActiveHighlight();
                return;
            }

            lastReportStatusHtml = setSectionHtml(reportStatusNode, '', lastReportStatusHtml, refreshInteractiveCardCache);

            const shouldRebuildStatsSection =
                lastRenderedStatsNumbersRef !== validation.numbers ||
                lastRenderedStatsMode !== attendanceInputMode ||
                lastRenderedStatsMin !== range.min ||
                lastRenderedStatsMax !== range.max;

            if (!shouldRebuildStatsSection) {
                applyActiveHighlight();
                return;
            }

            const { presentNumbers, absentNumbers } = report.stats;
            const { presentPct, absentPct } = report;

            const presentPillsHtml = buildPillsHtml(report.presentRanges, 'present-pill', 'Present');
            const absentPillsHtml = buildPillsHtml(report.absentRanges, 'absent-pill', 'Absent');
            const statsHtml = `
                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="report-card report-interactive-card p-4 stats-card border-success-light dark:border-success-dark" data-report-target="present-stats" role="button" tabindex="0" aria-label="Edit Present Roll Call">
                            <p class="stats-heading opacity-90">Present</p>
                            <div class="flex items-baseline gap-2">
                                <p class="text-2xl font-bold text-success-light dark:text-success-dark">${presentNumbers.length}</p>
                                <span class="text-sm opacity-50">(${presentPct.toFixed(1)}%)</span>
                            </div>
                            ${createMeter(presentPct, 'bg-meter-present')}
                        </div>
                        <div class="report-card report-interactive-card p-4 stats-card border-error-light dark:border-error-dark" data-report-target="absent-stats" role="button" tabindex="0" aria-label="Edit Absent Roll Call">
                            <p class="stats-heading opacity-90">Absent</p>
                            <div class="flex items-baseline gap-2">
                                <p class="text-2xl font-bold text-error-light dark:text-error-dark">${absentNumbers.length}</p>
                                <span class="text-sm opacity-50">(${absentPct.toFixed(1)}%)</span>
                            </div>
                            ${createMeter(absentPct, 'bg-meter-absent')}
                        </div>
                    </div>

                    ${presentNumbers.length > 0 ? `<div class="report-card report-interactive-card p-5" data-report-target="present-rolls" role="button" tabindex="0" aria-label="Edit Present Rolls"><p class="report-item-label text-sm font-bold uppercase tracking-wide opacity-90 mb-3">Present Rolls</p>${presentPillsHtml}</div>` : ''}
                    ${absentNumbers.length > 0 ? `<div class="report-card report-interactive-card p-5" data-report-target="absent-rolls" role="button" tabindex="0" aria-label="Edit Absent Rolls"><p class="report-item-label text-sm font-bold uppercase tracking-wide opacity-90 mb-3">Absent Rolls</p>${absentPillsHtml}</div>` : ''}
                </div>
            `;
            lastReportStatsHtml = setSectionHtml(reportStatsNode, statsHtml, lastReportStatsHtml, refreshInteractiveCardCache);
            lastRenderedStatsNumbersRef = validation.numbers;
            lastRenderedStatsMode = attendanceInputMode;
            lastRenderedStatsMin = range.min;
            lastRenderedStatsMax = range.max;
            applyActiveHighlight();
        };

        if (outputPanel && typeof onTargetActivate === 'function') {
            outputPanel.addEventListener('click', (event) => {
                if (event.target.closest('summary')) return;
                const targetEl = event.target.closest('[data-report-target]');
                if (!targetEl) return;
                const selection = window.getSelection ? window.getSelection().toString().trim() : '';
                if (selection.length > 0) return;
                onTargetActivate(targetEl.dataset.reportTarget, targetEl);
            });

            outputPanel.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                if (event.target.closest('summary')) return;
                const targetEl = event.target.closest('[data-report-target]');
                if (!targetEl) return;
                event.preventDefault();
                onTargetActivate(targetEl.dataset.reportTarget, targetEl);
            });
        }

        return {
            render,
            reset,
            setActiveTarget
        };
    };

    globalScope.AttendanceReportUI = {
        createReportRenderer
    };
})(window);
