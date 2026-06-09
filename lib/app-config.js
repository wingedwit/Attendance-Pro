(function attachAttendanceConfig(globalScope) {
    const STORAGE_KEY = 'attendanceProData';
    const STORAGE_VERSION = 2;
    const MAX_UNDO_HISTORY = 200;

    const createInitialState = (date) => ({
        date,
        startTime: '',
        endTime: '',
        classType: 'Theory',
        theoryType: '',
        batch: '',
        minRoll: '',
        maxRoll: '',
        facultyName: '',
        srName: '',
        lectureTopic: '',
        attendance: '',
        attendanceInputMode: 'present'
    });

    globalScope.AttendanceConfig = {
        STORAGE_KEY,
        STORAGE_VERSION,
        MAX_UNDO_HISTORY,
        createInitialState
    };
})(window);
