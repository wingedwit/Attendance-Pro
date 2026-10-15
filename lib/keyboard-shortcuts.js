(function attachAttendanceShortcuts(globalScope) {
    const initKeyboardShortcuts = ({
        onEscape,
        onCopyReport,
        onCopySheet,
        onReset,
        onUndo,
        onRedo,
        onStepNext,
        onStepPrev
    }) => {
        const handler = (event) => {
            const key = String(event.key || '').toLowerCase();

            if (event.key === 'Escape') {
                if (typeof onEscape === 'function' && onEscape()) {
                    return;
                }
            }

            const isDocShortcut = event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey &&
                (event.code === 'KeyD' || key === 'd');
            const isSheetShortcut = event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey &&
                (event.code === 'KeyS' || key === 's');

            if (!event.repeat && (isDocShortcut || isSheetShortcut)) {
                event.preventDefault();
                if (isDocShortcut && typeof onCopyReport === 'function') onCopyReport();
                if (isSheetShortcut && typeof onCopySheet === 'function') onCopySheet();
                return;
            }

            if (
                event.key === 'Backspace' &&
                event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey &&
                !event.metaKey
            ) {
                event.preventDefault();
                if (typeof onReset === 'function') onReset();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (event.code === 'KeyZ' || key === 'z')) {
                const tag = (event.target && event.target.tagName) || '';
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    event.preventDefault();
                    if (typeof onUndo === 'function') onUndo();
                    return;
                }
            }

            if (
                !event.altKey &&
                (((event.ctrlKey || event.metaKey) && (event.code === 'KeyY' || key === 'y')) ||
                ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === 'KeyZ' || key === 'z')))
            ) {
                const tag = (event.target && event.target.tagName) || '';
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    event.preventDefault();
                    if (typeof onRedo === 'function') onRedo();
                    return;
                }
            }

            if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return;
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

            event.preventDefault();
            if (event.key === 'ArrowRight' && typeof onStepNext === 'function') {
                onStepNext();
            } else if (event.key === 'ArrowLeft' && typeof onStepPrev === 'function') {
                onStepPrev();
            }
        };

        document.addEventListener('keydown', handler, true);
        return () => document.removeEventListener('keydown', handler, true);
    };

    globalScope.AttendanceShortcuts = {
        initKeyboardShortcuts
    };
})(window);
