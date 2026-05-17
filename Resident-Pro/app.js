const STORAGE_KEY = 'residentProData';

const fields = {
    date: document.getElementById('dateInput'),
    topic: document.getElementById('topicInput'),
    type: document.getElementById('typeInput'),
    presenter: document.getElementById('presenterInput'),
    seniorResident: document.getElementById('seniorResidentInput'),
    moderator: document.getElementById('moderatorInput')
};

const RESIDENT_GROUPS = [
    {
        level: 'JR1',
        names: ['Dr. Prabhav', 'Dr. Muskan', 'Dr. Jyotsna', 'Dr. Mukesh']
    },
    {
        level: 'JR2',
        names: ['Dr. Naresh', 'Dr. Vaibhav', 'Dr. Shivangi', 'Dr. Zahid']
    },
    {
        level: 'JR3',
        names: ['Dr. Saumya', 'Dr. Malhar', 'Dr. Anurag', 'Dr. Danish', 'Dr. Snigdha']
    }
];

const liveReport = document.getElementById('liveReport');
const copyDocButton = document.getElementById('copyDocButton');
const copyDocLabel = document.getElementById('copyDocLabel');
const copyDocIcon = document.getElementById('copyDocIcon');
const clearButton = document.getElementById('clearButton');
const residentAttendanceButton = document.getElementById('residentAttendanceButton');
const residentAttendanceCount = document.getElementById('residentAttendanceCount');
const selectedResidentChips = document.getElementById('selectedResidentChips');
const residentModal = document.getElementById('residentModal');
const residentChecklist = document.getElementById('residentChecklist');
const residentModalClose = document.getElementById('residentModalClose');
const residentClearButton = document.getElementById('residentClearButton');
const residentDoneButton = document.getElementById('residentDoneButton');
const datePillButtons = Array.from(document.querySelectorAll('[data-date-offset]'));
const toast = document.getElementById('toast');
const savedIndicator = document.getElementById('savedIndicator');

let toastTimer = null;
let savedTimer = null;
let copyLabelTimer = null;

const todayISO = () => new Date().toISOString().slice(0, 10);

if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    applySystemTheme(mediaQuery.matches);

    const handleThemeChange = (event) => applySystemTheme(event.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleThemeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleThemeChange);
    }
}

const getInitialState = () => ({
    date: todayISO(),
    topic: '',
    type: 'Group discussion',
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
    }, 2200);
};

const loadState = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return { ...getInitialState(), ...(saved || {}) };
    } catch (_) {
        return getInitialState();
    }
};

let state = loadState();

const saveState = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        savedIndicator.classList.add('show');
        if (savedTimer) clearTimeout(savedTimer);
        savedTimer = setTimeout(() => {
            savedIndicator.classList.remove('show');
            savedTimer = null;
        }, 1200);
    } catch (_) {
        // The live report still works if storage is unavailable.
    }
};

const getReportRows = () => [
    ['Date', formatDate(state.date)],
    ['Topic', state.topic || '-'],
    ['Type', state.type || '-'],
    ['Presenter Name', state.presenter || '-'],
    ['Senior Resident Name', state.seniorResident || '-'],
    ['Moderator Name', state.moderator || '-'],
    ['Resident Present', getResidentsPresentText()]
];

const getGoogleDocLines = () => getReportRows().map(([label, value]) => `${label}: ${value}`);

const getSelectedResidents = () => Array.isArray(state.residentsPresent) ? state.residentsPresent : [];

function getResidentsPresentText() {
    const selected = getSelectedResidents();
    return selected.length ? selected.join(', ') : '-';
}

const updateResidentAttendanceButton = () => {
    const selectedCount = getSelectedResidents().length;
    residentAttendanceCount.textContent = String(selectedCount);
    residentAttendanceButton.querySelector('span').textContent = selectedCount
        ? `${selectedCount} resident${selectedCount === 1 ? '' : 's'} selected`
        : 'Select residents';
};

const renderResidentChips = () => {
    const selected = getSelectedResidents();
    selectedResidentChips.innerHTML = selected.length
        ? selected.map((name) => `<span class="resident-chip">${escapeHtml(name)}</span>`).join('')
        : '<span class="resident-chip empty">No residents selected</span>';
};

const renderReport = () => {
    updateResidentAttendanceButton();
    renderResidentChips();
    liveReport.innerHTML = `
        <div class="doc-preview">
            ${getReportRows().map(([label, value]) => `
                <p class="doc-line${label === 'Topic' ? ' topic-line' : ''}">
                    <span class="doc-label">${escapeHtml(label)}:</span>
                    <span class="doc-value">${escapeHtml(value)}</span>
                </p>
            `).join('')}
        </div>
    `;
};

const buildGoogleDocText = () => {
    return getGoogleDocLines().join('\n');
};

const copyText = async (text) => {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
};

const syncInputs = () => {
    Object.entries(fields).forEach(([key, input]) => {
        input.value = state[key] || '';
    });
};

const renderResidentChecklist = () => {
    const selected = new Set(getSelectedResidents());
    residentChecklist.innerHTML = RESIDENT_GROUPS.map((group) => `
        <section class="resident-group">
            <h3 class="resident-group-title">${escapeHtml(group.level)}</h3>
            ${group.names.map((name) => `
                <label class="resident-option">
                    <input type="checkbox" value="${escapeHtml(name)}" ${selected.has(name) ? 'checked' : ''}>
                    <span>${escapeHtml(name)}</span>
                </label>
            `).join('')}
        </section>
    `).join('');
};

const setResidentsPresent = (residentsPresent) => {
    setState({ residentsPresent });
    renderResidentChecklist();
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

const setState = (patch) => {
    state = { ...state, ...patch };
    saveState();
    renderReport();
};

Object.entries(fields).forEach(([key, input]) => {
    input.addEventListener('input', () => setState({ [key]: input.value }));
    input.addEventListener('change', () => setState({ [key]: input.value }));
});

datePillButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const date = new Date();
        date.setDate(date.getDate() + Number(button.dataset.dateOffset || 0));
        const nextDate = date.toISOString().slice(0, 10);
        fields.date.value = nextDate;
        setState({ date: nextDate });
    });
});

residentAttendanceButton.addEventListener('click', openResidentModal);
residentModalClose.addEventListener('click', closeResidentModal);
residentDoneButton.addEventListener('click', closeResidentModal);
residentClearButton.addEventListener('click', () => setResidentsPresent([]));

residentChecklist.addEventListener('change', () => {
    const selected = Array.from(residentChecklist.querySelectorAll('input[type="checkbox"]:checked'))
        .map((input) => input.value);
    setState({ residentsPresent: selected });
});

residentModal.addEventListener('click', (event) => {
    if (event.target === residentModal) closeResidentModal();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !residentModal.classList.contains('hidden')) {
        closeResidentModal();
    }
});

copyDocButton.addEventListener('click', async () => {
    try {
        await copyText(buildGoogleDocText());
        copyDocButton.classList.add('copied');
        copyDocLabel.textContent = 'Copied';
        copyDocIcon.classList.add('hidden');
        if (copyLabelTimer) clearTimeout(copyLabelTimer);
        copyLabelTimer = setTimeout(() => {
            copyDocButton.classList.remove('copied');
            copyDocLabel.textContent = 'Copy';
            copyDocIcon.classList.remove('hidden');
            copyLabelTimer = null;
        }, 1200);
        showToast('Copied G-Doc data');
    } catch (_) {
        showToast('Copy failed');
    }
});

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && event.key === 'Enter') {
        event.preventDefault();
        copyDocButton.click();
    }
});

clearButton.addEventListener('click', () => {
    state = getInitialState();
    saveState();
    syncInputs();
    renderReport();
    showToast('Form cleared');
});

syncInputs();
renderReport();
