(function attachDateUtils(globalScope) {
    const parseDDMMYYYY = (rawValue) => {
        const value = String(rawValue || '').trim();
        const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (!match) return null;
        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);
        const parsed = new Date(year, month - 1, day);
        if (Number.isNaN(parsed.getTime())) return null;
        if (
            parsed.getDate() !== day ||
            parsed.getMonth() !== month - 1 ||
            parsed.getFullYear() !== year
        ) {
            return null;
        }
        return parsed;
    };

    const normalizeTimeTo24h = (rawValue) => {
        const value = String(rawValue || '').trim();
        if (!value) return '';

        const match24h = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
        if (match24h) {
            return `${String(Number(match24h[1])).padStart(2, '0')}:${match24h[2]}`;
        }

        const match12h = value.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
        if (!match12h) return '';

        let hours = Number(match12h[1]);
        const minutes = match12h[2];
        const period = match12h[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${minutes}`;
    };

    const formatTimeForReport = (rawValue) => {
        const value = String(rawValue || '').trim();
        if (!value) return '';

        const match24h = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
        if (match24h) {
            const hours24 = Number(match24h[1]);
            const minutes = match24h[2];
            const period = hours24 >= 12 ? 'PM' : 'AM';
            const hours12 = hours24 % 12 || 12;
            return `${hours12}:${minutes} ${period}`;
        }

        const match12h = value.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
        if (match12h) {
            return `${Number(match12h[1])}:${match12h[2]} ${match12h[3].toUpperCase()}`;
        }

        return value;
    };

    const getFormattedDateWithDay = (dateString) => {
        if (!dateString || typeof dateString !== 'string') return 'N/A';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        try {
            const dateObj = new Date(Date.UTC(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
            if (Number.isNaN(dateObj.getTime())) return dateString;
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
            return `${dateString} (${dayName})`;
        } catch (e) {
            return dateString;
        }
    };

    const getDurationInHours = (startTime, endTime) => {
        if (!startTime || !endTime || !startTime.includes(':') || !endTime.includes(':')) return 0;
        try {
            const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
            const startMatch = startTime.match(timePattern);
            const endMatch = endTime.match(timePattern);
            if (!startMatch || !endMatch) return 0;
            let h1 = parseInt(startMatch[1], 10);
            let m1 = parseInt(startMatch[2], 10);
            let p1 = startMatch[3] ? startMatch[3].toUpperCase() : '';
            let h2 = parseInt(endMatch[1], 10);
            let m2 = parseInt(endMatch[2], 10);
            let p2 = endMatch[3] ? endMatch[3].toUpperCase() : '';
            if (p1 === 'PM' && h1 !== 12) h1 += 12;
            else if (p1 === 'AM' && h1 === 12) h1 = 0;
            if (p2 === 'PM' && h2 !== 12) h2 += 12;
            else if (p2 === 'AM' && h2 === 12) h2 = 0;
            const t1 = new Date(0, 0, 0, h1, m1);
            const t2 = new Date(0, 0, 0, h2, m2);
            return t2 <= t1 ? 0 : (t2 - t1) / 36e5;
        } catch (e) {
            return 0;
        }
    };

    const getDurationString = (startTime, endTime) => {
        const totalHours = getDurationInHours(startTime, endTime);
        if (totalHours === 0) return '';
        const h = Math.floor(totalHours);
        const m = Math.round((totalHours - h) * 60);
        return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
    };

    globalScope.AttendanceDateUtils = {
        parseDDMMYYYY,
        normalizeTimeTo24h,
        formatTimeForReport,
        getFormattedDateWithDay,
        getDurationInHours,
        getDurationString
    };
})(window);
