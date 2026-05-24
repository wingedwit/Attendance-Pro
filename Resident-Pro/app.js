const STORAGE_KEY = 'residentProData';

const RESIDENT_GROUPS = [
    { level: 'JR1', names: ['Dr. Prabhav', 'Dr. Muskan', 'Dr. Jyotsna', 'Dr. Mukesh'] },
    { level: 'JR2', names: ['Dr. Naresh', 'Dr. Vaibhav', 'Dr. Shivangi', 'Dr. Zahid'] },
    { level: 'JR3', names: ['Dr. Saumya', 'Dr. Malhar', 'Dr. Anurag', 'Dr. Danish', 'Dr. Snigdha'] }
];

const MODERATOR_OPTIONS = [
    'Dr. Arpita Singh',
    'Dr. Pooja Shukla',
    'Dr. Himanshu Sharma',
    'Dr. Garima Adhaulia',
    'Dr. Govind Mishra',
    'Dr. Parul Kamal'
];

const SENIOR_OPTIONS = [
    'Dr. Harshika',
    'Dr. Anjali',
    'Dr. Vishakha',
    'Dr. Punit',
    'Dr. Garima'
];

const TYPE_OPTIONS = [
    'Group discussion',
    'Journal club',
    'Seminar',
    'Practical'
];

const PRESENTER_OPTIONS = RESIDENT_GROUPS.flatMap((group) => group.names);
const ALL_RESIDENTS = [...PRESENTER_OPTIONS];

const fields = {
    date: document.getElementById('dateInput'),
    topic: document.getElementById('topicInput')
};

const liveReport = document.getElementById('liveReport');
const copyDocButton = document.getElementById('copyDocButton');
const copyDocIcon = document.getElementById('copyDocIcon');
const mobileCopyButton = document.getElementById('mobileCopyButton');
const upiCopyButton = document.getElementById('upiCopyButton');
const clearButton = document.getElementById('clearButton');
const toast = document.getElementById('toast');



const residentAttendanceButton = document.getElementById('residentAttendanceButton');
const residentAttendanceCount = document.getElementById('residentAttendanceCount');
const residentModal = document.getElementById('residentModal');
const residentChecklist = document.getElementById('residentChecklist');
const residentClearButton = document.getElementById('residentClearButton');
const residentDoneButton = document.getElementById('residentDoneButton');
const residentSelectAll = document.getElementById('residentSelectAll');

const typePickerButton = document.getElementById('typePickerButton');
const presenterPickerButton = document.getElementById('presenterPickerButton');
const seniorPickerButton = document.getElementById('seniorPickerButton');
const moderatorPickerButton = document.getElementById('moderatorPickerButton');
const typePickerValue = document.getElementById('typePickerValue');
const presenterPickerValue = document.getElementById('presenterPickerValue');
const seniorPickerValue = document.getElementById('seniorPickerValue');
const moderatorPickerValue = document.getElementById('moderatorPickerValue');

const pickerModal = document.getElementById('pickerModal');
const pickerModalTitle = document.getElementById('pickerModalTitle');
const pickerChecklist = document.getElementById('pickerChecklist');
const pickerModalClose = document.getElementById('pickerModalClose');
const pickerClearButton = document.getElementById('pickerClearButton');
const pickerDoneButton = document.getElementById('pickerDoneButton');

const datePillButtons = Array.from(document.querySelectorAll('[data-date-offset]'));

let toastTimer = null;
let activePicker = null;

const FLATPICKR_SCRIPT_SRC = '../assets/vendor/flatpickr/flatpickr.min.js';
let flatpickrLoadPromise = null;
let flatpickrInstance = null;

const enableFlatpickrThemeStyles = () => {
    const themeLink = document.getElementById('flatpickr-theme');
    if (!themeLink) return;
    themeLink.dataset.enabled = 'true';
    if (themeLink.dataset.pendingHref) {
        themeLink.href = themeLink.dataset.pendingHref;
    }
};

const upgradeDatePicker = () => {
    if (flatpickrInstance || !window.flatpickr || !fields.date) return;
    enableFlatpickrThemeStyles();
    flatpickrInstance = flatpickr(fields.date, {
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d-m-Y",
        onChange: (selectedDates, dateStr) => {
            setState({ date: dateStr });
        }
    });
    if (state.date) {
        flatpickrInstance.setDate(state.date, false);
    }
};

const ensureFlatpickrLoaded = () => {
    if (window.flatpickr) {
        upgradeDatePicker();
        return Promise.resolve();
    }
    if (flatpickrLoadPromise) return flatpickrLoadPromise;

    enableFlatpickrThemeStyles();
    flatpickrLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = FLATPICKR_SCRIPT_SRC;
        script.async = true;
        script.onload = () => {
            upgradeDatePicker();
            resolve();
        };
        script.onerror = () => {
            flatpickrLoadPromise = null;
            reject(new Error('Failed to load flatpickr'));
        };
        document.head.appendChild(script);
    });
    return flatpickrLoadPromise;
};

const toLocalISODate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const todayISO = () => toLocalISODate(new Date());

if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    applySystemTheme(mediaQuery.matches);
    const handleThemeChange = (event) => applySystemTheme(event.matches);
    if (typeof mediaQuery.addEventListener === 'function') mediaQuery.addEventListener('change', handleThemeChange);
    else if (typeof mediaQuery.addListener === 'function') mediaQuery.addListener(handleThemeChange);
}

const getInitialState = () => ({
    date: todayISO(),
    topic: '',
    type: '',
    presenter: '',
    seniorResident: '',
    moderator: '',
    residentsPresent: []
});

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (isoDate) => {
    if (!isoDate) return '-';
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;
    const dateText = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    return `${dateText}, ${dayName}`;
};

const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        toastTimer = null;
    }, 1800);
};

const loadState = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const loaded = { ...getInitialState(), ...(saved || {}) };
        if (loaded.type === 'Practical') {
            loaded.presenter = '';
        }
        return loaded;
    } catch (_) {
        return getInitialState();
    }
};

let state = loadState();

let saveStateTimeout = null;
const saveState = (immediate = false) => {
    const performSave = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (_) {
            // Keep functional even if storage is blocked.
        }
        if (saveStateTimeout) {
            clearTimeout(saveStateTimeout);
            saveStateTimeout = null;
        }
    };

    if (immediate) {
        performSave();
    } else {
        if (saveStateTimeout) clearTimeout(saveStateTimeout);
        saveStateTimeout = setTimeout(performSave, 250);
    }
};

const getSelectedResidents = () => (Array.isArray(state.residentsPresent) ? state.residentsPresent : []);
const displayValue = (value) => String(value ?? '').trim() || '-';
const getResidentsPresentText = () => {
    const selected = getSelectedResidents();
    const lines = RESIDENT_GROUPS.map(group => {
        const presentInGroup = group.names.filter(name => selected.includes(name));
        return `${group.level} - ${presentInGroup.join(', ')}`;
    });
    return lines.join('\n');
};

const getResidentsAbsentText = () => {
    const selected = getSelectedResidents();
    const absent = [];
    RESIDENT_GROUPS.forEach(group => {
        group.names.forEach(name => {
            if (!selected.includes(name)) {
                absent.push(name);
            }
        });
    });
    return `Absent - ${absent.join(', ')}`;
};

const getReportRows = () => [
    ['Date', formatDate(state.date)],
    ['Topic', displayValue(state.topic)],
    ['Type', displayValue(state.type)],
    ['Presenter', displayValue(state.presenter)],
    ['Senior Resident', displayValue(state.seniorResident)],
    ['Moderator', displayValue(state.moderator)],
    ['Resident Present', getResidentsPresentText()]
];

const getReportCardClass = (label) => {
    const wideClass = label === 'Topic' || label === 'Resident Present' ? ' wide-card' : '';
    return `report-card ${label.toLowerCase().replace(/\s+/g, '-')}-card${wideClass}`;
};

const initializeReportDOM = () => {
    liveReport.innerHTML = `
        <div class="report-block">
            ${getReportRows().map(([label, value]) => `
                <div id="card-${label.toLowerCase().replace(/\s+/g, '-')}" class="${getReportCardClass(label)}">
                    <p class="report-label">${escapeHtml(label)}</p>
                    <p class="report-value">${escapeHtml(value)}</p>
                </div>
            `).join('')}
        </div>
    `;
};

const renderReport = () => {
    if (!liveReport.querySelector('.report-block')) {
        initializeReportDOM();
        return;
    }

    const rows = getReportRows();
    rows.forEach(([label, value]) => {
        const cardId = `card-${label.toLowerCase().replace(/\s+/g, '-')}`;
        const card = document.getElementById(cardId);
        if (card) {
            const valueEl = card.querySelector('.report-value');
            if (valueEl) {
                if (valueEl.textContent !== value) {
                    valueEl.textContent = value;
                    
                    card.classList.remove('flash');
                    void card.offsetWidth; // Force reflow
                    card.classList.add('flash');
                }
            }
        }
    });
};

const updatePickerButtons = () => {
    typePickerValue.textContent = state.type || '';
    typePickerButton.classList.toggle('empty-picker', !state.type);

    const isPractical = state.type === 'Practical';
    presenterPickerButton.disabled = isPractical;
    if (isPractical) {
        presenterPickerValue.textContent = '';
        presenterPickerButton.classList.remove('empty-picker');
        presenterPickerButton.classList.add('disabled-picker');
    } else {
        presenterPickerValue.textContent = state.presenter || '';
        presenterPickerButton.classList.remove('disabled-picker');
        presenterPickerButton.classList.toggle('empty-picker', !state.presenter);
    }

    seniorPickerValue.textContent = state.seniorResident || '';
    seniorPickerButton.classList.toggle('empty-picker', !state.seniorResident);

    moderatorPickerValue.textContent = state.moderator || '';
    moderatorPickerButton.classList.toggle('empty-picker', !state.moderator);

    const selectedCount = getSelectedResidents().length;
    residentAttendanceCount.textContent = String(selectedCount);
    residentAttendanceButton.querySelector('span').textContent = selectedCount
        ? `${selectedCount} resident${selectedCount === 1 ? '' : 's'} selected`
        : '';
    residentAttendanceButton.classList.toggle('empty-picker', selectedCount === 0);

    datePillButtons.forEach((button) => {
        const date = new Date();
        date.setDate(date.getDate() + Number(button.dataset.dateOffset || 0));
        button.classList.toggle('active', state.date === toLocalISODate(date));
    });
};

const buildGoogleDocText = () => getReportRows()
    .filter(([label]) => !(state.type === 'Practical' && label === 'Presenter'))
    .map(([label, value]) => {
        if (label === 'Resident Present') {
            return `${label}:\n${value}\n${getResidentsAbsentText()}`;
        }
        return `${label}: ${value}`;
    }).join('\n');

const buildGoogleDocHtml = () => getReportRows()
    .filter(([label]) => !(state.type === 'Practical' && label === 'Presenter'))
    .map(([label, value]) => {
        const escapedLabel = escapeHtml(label);
        const escapedValue = escapeHtml(value).replace(/\n/g, '<br>');
        
        if (label === 'Date') {
            return `<div style="margin: 0; line-height: 1.15; font-weight: bold;">${escapedLabel}: ${escapedValue}</div>`;
        }
        if (label === 'Resident Present') {
            const escapedAbsent = escapeHtml(getResidentsAbsentText());
            return `<div style="margin: 0; line-height: 1.15; font-weight: normal;">${escapedLabel}:<br>${escapedValue}<br>${escapedAbsent}</div>`;
        }
        return `<div style="margin: 0; line-height: 1.15; font-weight: normal;">${escapedLabel}: ${escapedValue}</div>`;
    }).join('');

const copyText = async (plainText, htmlText) => {
    if (navigator.clipboard && window.ClipboardItem) {
        try {
            const plainBlob = new Blob([plainText], { type: 'text/plain' });
            const htmlBlob = new Blob([htmlText], { type: 'text/html' });
            const item = new ClipboardItem({
                'text/plain': plainBlob,
                'text/html': htmlBlob
            });
            await navigator.clipboard.write([item]);
            return;
        } catch (err) {
            console.warn('ClipboardItem copy failed, falling back to writeText:', err);
        }
    }

    if (navigator.clipboard) {
        await navigator.clipboard.writeText(plainText);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = plainText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    try {
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
    } finally {
        document.body.removeChild(textArea);
    }
};

const syncInputs = () => {
    Object.entries(fields).forEach(([key, input]) => {
        input.value = state[key] || '';
    });
    if (flatpickrInstance) {
        flatpickrInstance.setDate(state.date, false);
    }
};

const setState = (patch) => {
    let nextState = { ...state, ...patch };
    if (nextState.type === 'Practical') {
        nextState.presenter = '';
    }

    // Auto-Select Presenter Attendance
    if (patch.hasOwnProperty('presenter') && patch.presenter) {
        const presenter = patch.presenter;
        const residentsPresent = Array.isArray(nextState.residentsPresent) ? [...nextState.residentsPresent] : [];
        if (!residentsPresent.includes(presenter)) {
            residentsPresent.push(presenter);
            nextState.residentsPresent = residentsPresent;
        }
    }

    state = nextState;
    saveState();
    updatePickerButtons();
    renderReport();
};

const renderResidentChecklist = () => {
    const selectedSet = new Set(getSelectedResidents());
    residentChecklist.innerHTML = RESIDENT_GROUPS.map((group, groupIndex) => {
        const allSelected = group.names.every(name => selectedSet.has(name));
        return `
        <section class="resident-group">
            <div class="resident-group-header">
                <h3 class="resident-group-title">${escapeHtml(group.level)}</h3>
                <label class="group-select-all" aria-label="Select all ${escapeHtml(group.level)}">
                    <input type="checkbox" class="group-checkbox" data-group-index="${groupIndex}" ${allSelected ? 'checked' : ''}>
                    <span>All</span>
                </label>
            </div>
            ${group.names.map((name) => `
                <label class="resident-option">
                    <input type="checkbox" class="resident-checkbox" value="${escapeHtml(name)}" ${selectedSet.has(name) ? 'checked' : ''}>
                    <span>${escapeHtml(name)}</span>
                </label>
            `).join('')}
        </section>
        `;
    }).join('');
    residentSelectAll.checked = getSelectedResidents().length === ALL_RESIDENTS.length;
};

const openResidentModal = () => {
    renderResidentChecklist();
    residentModal.classList.remove('hidden');
    const firstCheckbox = residentChecklist.querySelector('input[type="checkbox"]');
    if (firstCheckbox) firstCheckbox.focus();
};

const closeResidentModal = () => {
    residentModal.classList.add('hidden');
    residentAttendanceButton.focus();
};

const openPickerModal = (config) => {
    activePicker = config;
    pickerModalTitle.textContent = config.title;
    const selectedValue = String(state[config.stateKey] || '');
    pickerChecklist.classList.toggle('grouped-checklist', Boolean(config.groups));
    pickerChecklist.innerHTML = config.groups
        ? config.groups.map((group) => `
            <section class="resident-group">
                <h3 class="resident-group-title">${escapeHtml(group.level)}</h3>
                ${group.names.map((name) => `
                    <label class="resident-option">
                        <input type="checkbox" value="${escapeHtml(name)}" ${selectedValue === name ? 'checked' : ''}>
                        <span>${escapeHtml(name)}</span>
                    </label>
                `).join('')}
            </section>
        `).join('')
        : config.options.map((name) => `
            <label class="resident-option">
                <input type="checkbox" value="${escapeHtml(name)}" ${selectedValue === name ? 'checked' : ''}>
                <span>${escapeHtml(name)}</span>
            </label>
        `).join('');
    pickerModal.classList.remove('hidden');
    const firstCheckbox = pickerChecklist.querySelector('input[type="checkbox"]');
    if (firstCheckbox) firstCheckbox.focus();
};

const closePickerModal = () => {
    pickerModal.classList.add('hidden');
    if (activePicker && activePicker.returnButton) activePicker.returnButton.focus();
    activePicker = null;
};

Object.entries(fields).forEach(([key, input]) => {
    input.addEventListener('input', () => setState({ [key]: input.value }));
    input.addEventListener('change', () => setState({ [key]: input.value }));
});

fields.date.addEventListener('click', () => {
    if (flatpickrInstance) {
        flatpickrInstance.open();
    } else {
        ensureFlatpickrLoaded()
            .then(() => {
                if (flatpickrInstance) flatpickrInstance.open();
            })
            .catch(() => {
                try {
                    fields.date.showPicker();
                } catch (error) {
                    console.warn('showPicker is not supported or failed:', error);
                }
            });
    }
});

datePillButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        const date = new Date();
        date.setDate(date.getDate() + Number(button.dataset.dateOffset || 0));
        const nextDate = toLocalISODate(date);
        fields.date.value = nextDate;
        if (flatpickrInstance) {
            flatpickrInstance.setDate(nextDate, false);
        }
        setState({ date: nextDate });
    });

    button.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const nextIndex = (index + direction + datePillButtons.length) % datePillButtons.length;
            datePillButtons[nextIndex].focus();
            datePillButtons[nextIndex].click();
        }
    });
});

residentAttendanceButton.addEventListener('click', openResidentModal);
residentDoneButton.addEventListener('click', closeResidentModal);
residentClearButton.addEventListener('click', () => {
    setState({ residentsPresent: [] });
    renderResidentChecklist();
});

residentChecklist.addEventListener('change', (e) => {
    if (e.target.classList.contains('group-checkbox')) {
        const groupIndex = e.target.dataset.groupIndex;
        const group = RESIDENT_GROUPS[groupIndex];
        const isChecked = e.target.checked;
        
        let selectedSet = new Set(getSelectedResidents());
        group.names.forEach(name => {
            if (isChecked) selectedSet.add(name);
            else selectedSet.delete(name);
        });
        
        setState({ residentsPresent: Array.from(selectedSet) });
        renderResidentChecklist();
        return;
    }

    const selected = Array.from(residentChecklist.querySelectorAll('.resident-checkbox:checked')).map((input) => input.value);
    setState({ residentsPresent: selected });
    residentSelectAll.checked = selected.length === ALL_RESIDENTS.length;
    renderResidentChecklist();
});

residentSelectAll.addEventListener('change', () => {
    const next = residentSelectAll.checked ? [...ALL_RESIDENTS] : [];
    setState({ residentsPresent: next });
    renderResidentChecklist();
});

residentModal.addEventListener('click', (event) => {
    if (event.target === residentModal) closeResidentModal();
});

typePickerButton.addEventListener('click', () => {
    openPickerModal({
        title: 'Select Type',
        stateKey: 'type',
        options: TYPE_OPTIONS,
        returnButton: typePickerButton
    });
});

presenterPickerButton.addEventListener('click', () => {
    openPickerModal({
        title: 'Select Presenter',
        stateKey: 'presenter',
        options: PRESENTER_OPTIONS,
        groups: RESIDENT_GROUPS,
        returnButton: presenterPickerButton
    });
});

seniorPickerButton.addEventListener('click', () => {
    openPickerModal({
        title: 'Select Senior Resident',
        stateKey: 'seniorResident',
        options: SENIOR_OPTIONS,
        returnButton: seniorPickerButton
    });
});

moderatorPickerButton.addEventListener('click', () => {
    openPickerModal({
        title: 'Select Moderator',
        stateKey: 'moderator',
        options: MODERATOR_OPTIONS,
        returnButton: moderatorPickerButton
    });
});

pickerChecklist.addEventListener('change', (event) => {
    if (!activePicker) return;
    const target = event.target;
    if (!target || target.type !== 'checkbox') return;
    const checkboxes = Array.from(pickerChecklist.querySelectorAll('input[type="checkbox"]'));
    checkboxes.forEach((input) => {
        if (input !== target) input.checked = false;
    });
    setState({ [activePicker.stateKey]: target.checked ? target.value : '' });
    // Auto-close single-select picker after a brief moment so the selection is visible
    if (target.checked) {
        setTimeout(closePickerModal, 120);
    }
});

pickerModalClose.addEventListener('click', closePickerModal);
pickerDoneButton.addEventListener('click', closePickerModal);
pickerClearButton.addEventListener('click', () => {
    if (!activePicker) return;
    setState({ [activePicker.stateKey]: '' });
    pickerChecklist.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = false;
    });
});

pickerModal.addEventListener('click', (event) => {
    if (event.target === pickerModal) closePickerModal();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (!pickerModal.classList.contains('hidden')) {
            closePickerModal();
            return;
        }
        if (!residentModal.classList.contains('hidden')) {
            closeResidentModal();
            return;
        }

    }

    // Alt+T — jump to Topic input
    if (event.altKey && (event.key === 't' || event.key === 'T')) {
        event.preventDefault();
        fields.topic.focus();
        fields.topic.select();
        return;
    }

    if (event.ctrlKey && event.altKey && (event.key === 'c' || event.key === 'C')) {
        event.preventDefault();
        copyDocButton.click();
    }

    if (event.ctrlKey && event.key === 'Backspace') {
        event.preventDefault();
        clearButton.click();
    }
});

copyDocButton.addEventListener('click', async () => {
    try {
        await copyText(buildGoogleDocText(), buildGoogleDocHtml());
        showToast('Copied G-Doc data');
        
        copyDocButton.classList.add('success');
        copyDocIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
        
        setTimeout(() => {
            copyDocButton.classList.remove('success');
            copyDocIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14"></path>';
        }, 2000);
    } catch (_) {
        showToast('Copy failed');
    }
});

clearButton.addEventListener('click', () => {
    state = getInitialState();
    saveState(true);
    syncInputs();
    updatePickerButtons();
    renderReport();
    showToast('Form cleared');
});

mobileCopyButton?.addEventListener('click', async () => {
    try {
        await copyText('8890259964');
        showToast('Copied Mobile Number');
    } catch (_) {}
});

upiCopyButton?.addEventListener('click', async () => {
    try {
        await copyText('vaibhav.ganesh51@okaxis');
        showToast('Copied UPI ID');
    } catch (_) {}
});

syncInputs();
updatePickerButtons();
renderReport();

// Defer Flatpickr loading until window load and browser idle
window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => ensureFlatpickrLoaded().catch(() => {}));
    } else {
        setTimeout(() => ensureFlatpickrLoaded().catch(() => {}), 1000);
    }
});
