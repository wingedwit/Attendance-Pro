(function attachAttendanceStepNavigator(globalScope) {
    const createStepNavigator = ({ sectionOrder = ['section1', 'section2', 'section3'], attendanceInputId = 'attendanceInput' } = {}) => {
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

        const getCurrentSectionId = () => {
            const visibleSection = getSectionNodes().find((section) => !section.classList.contains('hidden'));
            return visibleSection ? visibleSection.id : sectionOrder[0];
        };

        const switchSection = (targetId) => {
            getSectionNodes().forEach((el) => {
                el.classList.add('hidden');
            });
            const target = document.getElementById(targetId);
            if (!target) return;
            target.classList.remove('hidden');

            getNavButtons().forEach((btn) => {
                const isActive = btn.dataset.target === targetId;
                btn.classList.toggle('active', isActive);
                if (isActive) {
                    btn.setAttribute('aria-current', 'step');
                } else {
                    btn.removeAttribute('aria-current');
                }
            });

            if (targetId === 'section3') {
                requestAnimationFrame(() => {
                    const attendanceInput = document.getElementById(attendanceInputId);
                    if (attendanceInput) attendanceInput.focus();
                });
            }
        };

        const navigateOffset = (delta) => {
            const currentSectionIndex = sectionOrder.indexOf(getCurrentSectionId());
            if (currentSectionIndex === -1) return;

            const nextIndex = delta > 0
                ? Math.min(currentSectionIndex + delta, sectionOrder.length - 1)
                : Math.max(currentSectionIndex + delta, 0);

            if (nextIndex === currentSectionIndex) return;

            const nextSectionId = sectionOrder[nextIndex];
            switchSection(nextSectionId);
            const section = document.getElementById(nextSectionId);
            const firstFocusable = section && Array.from(section.querySelectorAll('input, select, textarea, button'))
                .find((el) => !el.disabled && el.offsetParent);
            if (firstFocusable) firstFocusable.focus();
        };

        const init = () => {
            document.querySelectorAll('.nav-section-btn').forEach((btn) => {
                btn.addEventListener('click', () => switchSection(btn.dataset.target));
            });
            document.querySelectorAll('[data-switch]').forEach((btn) => {
                btn.addEventListener('click', () => switchSection(btn.dataset.switch));
            });
        };

        return {
            init,
            switchSection,
            getCurrentSectionId,
            navigateOffset,
            sectionOrder
        };
    };

    globalScope.AttendanceStepNavigator = {
        createStepNavigator
    };
})(window);
