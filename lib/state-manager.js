(function attachAttendanceStateManager(globalScope) {
    const createStateStore = ({ config, storageUtils, savedIndicatorEl, getInitialState }) => {
        const { STORAGE_KEY, STORAGE_VERSION, MAX_UNDO_HISTORY } = config;
        const { safeStorage, loadStateFromStorage } = storageUtils;

        const SAVE_DEBOUNCE_DELAY = 180;

        let state = loadStateFromStorage(STORAGE_KEY, getInitialState);
        let undoStack = [JSON.stringify(state)];
        let redoStack = [];
        let persistPendingState = null;
        let persistTimer = null;
        let saveIndicatorTimeout = null;
        const listeners = new Set();

        const getHistoryMeta = () => ({
            canUndo: undoStack.length > 1,
            canRedo: redoStack.length > 0
        });

        const notify = (source = 'set') => {
            const meta = getHistoryMeta();
            listeners.forEach((listener) => {
                try {
                    listener(state, meta, source);
                } catch (error) {
                    console.error('Attendance state listener error:', error);
                }
            });
        };

        const persistStateNow = () => {
            if (!persistPendingState) return;
            const payload = JSON.stringify({
                version: STORAGE_VERSION,
                data: persistPendingState
            });
            const didPersist = safeStorage.set(STORAGE_KEY, payload);
            persistPendingState = null;
            if (!didPersist || !savedIndicatorEl) return;

            savedIndicatorEl.classList.add('show');
            if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
            saveIndicatorTimeout = setTimeout(() => {
                savedIndicatorEl.classList.remove('show');
            }, 2000);
        };

        const scheduleSave = () => {
            persistPendingState = state;
            if (persistTimer) clearTimeout(persistTimer);
            persistTimer = setTimeout(() => {
                persistTimer = null;
                persistStateNow();
            }, SAVE_DEBOUNCE_DELAY);
        };

        const flushPendingSave = () => {
            if (persistTimer) {
                clearTimeout(persistTimer);
                persistTimer = null;
            }
            persistStateNow();
        };

        const hasPatchChanges = (patch) => Object.keys(patch).some((key) => state[key] !== patch[key]);

        const setState = (patch) => {
            if (!hasPatchChanges(patch)) return;
            state = { ...state, ...patch };
            undoStack.push(JSON.stringify(state));
            if (undoStack.length > MAX_UNDO_HISTORY) {
                undoStack.shift();
            }
            redoStack = [];
            scheduleSave();
            notify('set');
        };

        const undo = () => {
            if (undoStack.length <= 1) return;
            redoStack.push(undoStack.pop());
            const previousState = JSON.parse(undoStack[undoStack.length - 1]);
            state = previousState;
            persistPendingState = state;
            flushPendingSave();
            notify('undo');
        };

        const redo = () => {
            if (redoStack.length === 0) return;
            const nextState = JSON.parse(redoStack.pop());
            undoStack.push(JSON.stringify(nextState));
            state = nextState;
            persistPendingState = state;
            flushPendingSave();
            notify('redo');
        };

        const reset = () => {
            if (persistTimer) {
                clearTimeout(persistTimer);
                persistTimer = null;
            }
            persistPendingState = null;
            safeStorage.remove(STORAGE_KEY);
            const clearedState = getInitialState();
            state = clearedState;
            undoStack = [JSON.stringify(clearedState)];
            redoStack = [];
            notify('reset');
        };

        const loadWithoutRecording = (newState) => {
            state = newState;
            notify('load');
        };

        const subscribe = (listener, immediate = false) => {
            listeners.add(listener);
            if (immediate) {
                listener(state, getHistoryMeta(), 'init');
            }
            return () => listeners.delete(listener);
        };

        return {
            getState: () => state,
            setState,
            undo,
            redo,
            reset,
            loadWithoutRecording,
            subscribe,
            flushPendingSave,
            getHistoryMeta,
            hasPatchChanges
        };
    };

    globalScope.AttendanceStateManager = {
        createStateStore
    };
})(window);
