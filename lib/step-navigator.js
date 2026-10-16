(function attachAttendanceStepNavigator(globalScope) {
    const createStepNavigator = ({ sectionOrder = ['section1', 'section2', 'section3'], attendanceInputId = 'attendanceInput' } = {}) => {
        let cachedSectionNodes = null;
        let cachedNavButtons = null;
        let cachedNavContainer = null;

        const getSectionNodes = () => {
            if (!cachedSectionNodes) cachedSectionNodes = Array.from(document.querySelectorAll('.section-content'));
            return cachedSectionNodes;
        };

        const getNavButtons = () => {
            if (!cachedNavButtons) cachedNavButtons = Array.from(document.querySelectorAll('.nav-section-btn'));
            return cachedNavButtons;
        };

        const getNavContainer = () => {
            if (!cachedNavContainer) {
                const firstBtn = getNavButtons()[0];
                cachedNavContainer = firstBtn ? firstBtn.parentElement : null;
            }
            return cachedNavContainer;
        };

        const getCurrentSectionId = () => {
            const visibleSection = getSectionNodes().find((section) => !section.classList.contains('hidden'));
            return visibleSection ? visibleSection.id : sectionOrder[0];
        };

        const getVisibleFormControls = (container) => {
            if (!container) return [];
            return Array.from(container.querySelectorAll('input, select, textarea'))
                .filter((el) => !el.disabled && el.offsetParent !== null && !el.closest('.hidden'));
        };

        const switchSection = (targetId, { focusFirst = false } = {}) => {
            const prevSectionId = getCurrentSectionId();
            const prevIndex = sectionOrder.indexOf(prevSectionId);
            const targetIndex = sectionOrder.indexOf(targetId);
            const shouldAnimate = prevSectionId !== targetId && prevIndex !== -1 && targetIndex !== -1;
            const directionClass = targetIndex >= prevIndex ? 'section-enter-forward' : 'section-enter-backward';

            getSectionNodes().forEach((el) => {
                el.classList.remove('section-enter-forward', 'section-enter-backward');
                el.classList.add('hidden');
            });

            const target = document.getElementById(targetId);
            if (!target) return;
            target.classList.remove('hidden');

            if (shouldAnimate) {
                void target.offsetWidth;
                target.classList.add(directionClass);
            }

            const navContainer = getNavContainer();
            if (navContainer && targetIndex !== -1) {
                navContainer.style.setProperty('--active-tab-index', String(targetIndex));
            }

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
            } else if (focusFirst) {
                requestAnimationFrame(() => {
                    const controls = getVisibleFormControls(target);
                    if (controls[0]) controls[0].focus();
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
            switchSection(nextSectionId, { focusFirst: true });
        };

        const handleFieldEnterKey = (event) => {
            if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
            const target = event.target;
            if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'SELECT')) return;
            if (target.id === 'datePicker') return;

            const section = target.closest('.section-content');
            if (!section) return;

            const controls = getVisibleFormControls(section);
            const currentIndex = controls.indexOf(target);
            if (currentIndex === -1) return;

            event.preventDefault();
            const nextControl = controls[currentIndex + 1];
            if (nextControl) {
                nextControl.focus();
                if (typeof nextControl.select === 'function' && nextControl.type === 'text') {
                    nextControl.select();
                }
            } else {
                navigateOffset(1);
            }
        };

        const init = () => {
            document.querySelectorAll('.nav-section-btn').forEach((btn) => {
                btn.addEventListener('click', () => switchSection(btn.dataset.target));
            });
            document.querySelectorAll('[data-switch]').forEach((btn) => {
                btn.addEventListener('click', () => switchSection(btn.dataset.switch, { focusFirst: true }));
            });
            getSectionNodes().forEach((section) => {
                section.addEventListener('keydown', handleFieldEnterKey);
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

