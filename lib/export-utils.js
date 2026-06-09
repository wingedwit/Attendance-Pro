(function attachAttendanceExportUtils(globalScope) {
    const buildReportCopyPayload = ({ state, report, escapeHtml }) => {
        const { presentNumbers, absentNumbers } = report.stats;
        const dateWithDay = report.dateWithDay.replace(
            /^(\d{2})-(\d{2})-(\d{4})/,
            '$1/$2/$3'
        );
        const presentList = report.presentRanges.join(', ') || 'None';
        const absentList = report.absentRanges.join(', ') || 'None';

        const plain = `Date: ${dateWithDay}, Time: ${report.timeLine}
Faculty - ${state.facultyName || '-'}, Senior Resident - ${state.srName || '-'}
Topic - ${state.lectureTopic || '-'}
Type - ${report.typeLine || '-'}
Total Students: ${report.total}, Present: ${presentNumbers.length} (${report.presentPct.toFixed(1)}%), Absent: ${absentNumbers.length} (${report.absentPct.toFixed(1)}%)
- Present Students: ${presentList}
- Absent Students: ${absentList}`;

        const html = `<b>Date:</b> <b>${escapeHtml(dateWithDay)}</b>, Time: ${escapeHtml(report.timeLine)}<br>Faculty - ${escapeHtml(state.facultyName || '-')}, Senior Resident - ${escapeHtml(state.srName || '-')}<br>Topic - ${escapeHtml(state.lectureTopic || '-')}<br>Type - ${escapeHtml(report.typeLine || '-')}<br>Total Students: ${report.total}, Present: ${presentNumbers.length} (${report.presentPct.toFixed(1)}%), Absent: ${absentNumbers.length} (${report.absentPct.toFixed(1)}%)<ul><li>Present Students: ${escapeHtml(presentList)}</li><li>Absent Students: ${escapeHtml(absentList)}</li></ul>`;

        return { plain, html };
    };

    const buildSheetCopyText = ({ report, durationValue }) => {
        const presentSet = new Set(report.stats.presentNumbers);
        const rows = [];
        for (let roll = report.range.min; roll <= report.range.max; roll++) {
            rows.push(presentSet.has(roll) ? durationValue : 0);
        }
        return rows.join('\n');
    };

    globalScope.AttendanceExportUtils = {
        buildReportCopyPayload,
        buildSheetCopyText
    };
})(window);
