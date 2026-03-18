(function attachStorageUtils(globalScope) {
    const safeStorage = {
        get(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                return null;
            }
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

    const normalizeStatePayload = (savedPayload, getInitialState) => {
        if (!savedPayload || typeof savedPayload !== 'object') return getInitialState();

        const isWrappedPayload = Object.prototype.hasOwnProperty.call(savedPayload, 'version') &&
            Object.prototype.hasOwnProperty.call(savedPayload, 'data');
        const rawState = isWrappedPayload ? savedPayload.data : savedPayload;
        const merged = { ...getInitialState(), ...(rawState || {}) };
        const dateUtils = globalScope.AttendanceDateUtils || {};

        return {
            ...merged,
            startTime: typeof dateUtils.normalizeTimeTo24h === 'function'
                ? dateUtils.normalizeTimeTo24h(merged.startTime)
                : merged.startTime,
            endTime: typeof dateUtils.normalizeTimeTo24h === 'function'
                ? dateUtils.normalizeTimeTo24h(merged.endTime)
                : merged.endTime
        };
    };

    const loadStateFromStorage = (storageKey, getInitialState) => {
        const saved = safeStorage.get(storageKey);
        if (!saved) return getInitialState();
        try {
            const parsed = JSON.parse(saved);
            return normalizeStatePayload(parsed, getInitialState);
        } catch (e) {
            return getInitialState();
        }
    };

    globalScope.AttendanceStorageUtils = {
        safeStorage,
        normalizeStatePayload,
        loadStateFromStorage
    };
})(window);
