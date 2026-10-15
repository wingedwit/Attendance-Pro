(function attachAttendanceReportUI(globalScope) {
    const PILLS_INLINE_RENDER_LIMIT = 80;

    const createReportRenderer = ({ outputPanel, minRollEl, maxRollEl, attendanceInputEl, errorMessageEl, escapeHtml, maxRollRangeSize = 5000 }) => {
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

        const reset = () => {
            reportMetaNode = null;
            reportStatusNode = null;
            reportStatsNode = null;
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

            const row = (label, value) => `<div class="mb-3"><p class="text-sm uppercase tracking-wider opacity-90 mb-1 font-bold">${escapeHtml(label)}</p><p class="font-medium text-lg">${escapeHtml(value || '-')}</p></div>`;

            const metaHtml = `
                <div class="report-card p-5">
                    <div class="grid grid-cols-2 gap-4">
                        ${row("Faculty", state.facultyName)}
                        ${row("Senior Resident", state.srName)}
                        ${row("Topic", state.lectureTopic)}
                    </div>
                    <div class="grid grid-cols-2 gap-4 pt-2 border-t border-outline-light/10 mt-2 dark:border-outline-dark/10">
                        ${row("Date", report.dateWithDay)}
                        ${row("Time (Duration)", report.timeLine)}
                    </div>
                </div>
            `;
            lastReportMetaHtml = setSectionHtml(reportMetaNode, metaHtml, lastReportMetaHtml);

            if (minRollEl) minRollEl.classList.remove('form-input-error');
            if (maxRollEl) maxRollEl.classList.remove('form-input-error');

            if (range.reason === 'missing') {
                lastReportStatusHtml = setSectionHtml(
                    reportStatusNode,
                    `<div class="flex flex-col items-center justify-center p-8 opacity-50 border-2 border-dashed border-outline-light/20 rounded-xl dark:border-outline-dark/20"><p>Set a valid Min/Max roll number range to see stats.</p></div>`,
                    lastReportStatusHtml
                );
                lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml);
                invalidateRenderedStatsCache();
                return;
            }

            if (range.reason === 'reversed') {
                if (minRollEl) minRollEl.classList.add('form-input-error');
                if (maxRollEl) maxRollEl.classList.add('form-input-error');
                lastReportStatusHtml = setSectionHtml(
                    reportStatusNode,
                    `<div class="flex flex-col items-center justify-center p-8 text-error-light dark:text-error-dark border-2 border-dashed border-error-light/30 rounded-xl dark:border-error-dark/30"><p>Min Roll cannot be greater than Max Roll.</p></div>`,
                    lastReportStatusHtml
                );
                lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml);
                invalidateRenderedStatsCache();
                return;
            }

            if (range.reason === 'tooLarge') {
                if (minRollEl) minRollEl.classList.add('form-input-error');
                if (maxRollEl) maxRollEl.classList.add('form-input-error');
                lastReportStatusHtml = setSectionHtml(
                    reportStatusNode,
                    `<div class="flex flex-col items-center justify-center p-8 text-error-light dark:text-error-dark border-2 border-dashed border-error-light/30 rounded-xl dark:border-error-dark/30"><p>Roll range is too large. Use ${maxRollRangeSize} rolls or fewer.</p></div>`,
                    lastReportStatusHtml
                );
                lastReportStatsHtml = setSectionHtml(reportStatsNode, '', lastReportStatsHtml);
                invalidateRenderedStatsCache();
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
                lastRenderedStatsMin !== range.min ||
                lastRenderedStatsMax !== range.max;

            if (!shouldRebuildStatsSection) return;

            const { presentNumbers, absentNumbers } = report.stats;
            const { presentPct, absentPct } = report;

            const presentPillsHtml = buildPillsHtml(report.presentRanges, 'present-pill', 'Present');
            const absentPillsHtml = buildPillsHtml(report.absentRanges, 'absent-pill', 'Absent');
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
            lastRenderedStatsMin = range.min;
            lastRenderedStatsMax = range.max;
        };

        return {
            render,
            reset
        };
    };

    globalScope.AttendanceReportUI = {
        createReportRenderer
    };
})(window);
