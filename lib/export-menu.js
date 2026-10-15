(function attachAttendanceExportMenu(globalScope) {
    const createExportMenuController = ({
        downloadMenu,
        downloadButton,
        downloadOptionReport,
        downloadOptionSheet,
        onCopyReport,
        onCopySheet
    }) => {
        const closeMenu = () => {
            if (!downloadMenu) return;
            downloadMenu.classList.remove('open');
            if (downloadButton) downloadButton.setAttribute('aria-expanded', 'false');
        };

        const openMenu = () => {
            if (!downloadMenu) return;
            downloadMenu.classList.add('open');
            if (downloadButton) downloadButton.setAttribute('aria-expanded', 'true');
        };

        const isOpen = () => Boolean(downloadMenu && downloadMenu.classList.contains('open'));

        const init = () => {
            if (downloadButton) {
                downloadButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const nextOpen = downloadMenu.classList.toggle('open');
                    downloadButton.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
                });

                downloadButton.addEventListener('keydown', (event) => {
                    if (event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    openMenu();
                    if (downloadOptionReport) downloadOptionReport.focus();
                });
            }

            if (downloadOptionReport) {
                downloadOptionReport.addEventListener('click', () => {
                    if (typeof onCopyReport === 'function') onCopyReport();
                });
            }

            if (downloadOptionSheet) {
                downloadOptionSheet.addEventListener('click', () => {
                    if (typeof onCopySheet === 'function') onCopySheet();
                });
            }

            document.addEventListener('click', (event) => {
                if (downloadMenu && !downloadMenu.contains(event.target)) {
                    closeMenu();
                }
            });
        };

        return {
            init,
            open: openMenu,
            close: closeMenu,
            isOpen
        };
    };

    globalScope.AttendanceExportMenu = {
        createExportMenuController
    };
})(window);
