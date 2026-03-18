(function attachAttendanceLogic(globalScope) {
    const groupNumbersIntoRanges = (numbers) => {
        if (!numbers || numbers.length === 0) return [];
        const ranges = [];
        let start = numbers[0];
        let end = numbers[0];
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] === end + 1) {
                end = numbers[i];
            } else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                start = numbers[i];
                end = numbers[i];
            }
        }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        return ranges;
    };

    const createAttendanceEngine = (getRollRanges) => {
        let validationCacheKey = '';
        let validationCacheValue = null;
        let statsCacheInputRef = null;
        let statsCacheMode = '';
        let statsCacheMin = NaN;
        let statsCacheMax = NaN;
        let statsCacheResult = null;
        let allNumbersCacheMin = NaN;
        let allNumbersCacheMax = NaN;
        let allNumbersCache = [];

        const validateRollNumbers = (input) => {
            const rawTokens = input.trim().split(/[,\s\n]+/).filter(Boolean);
            if (rawTokens.length === 0) {
                return { valid: true, numbers: [], duplicates: [], errors: { nonNumeric: [], outOfRange: [], invalidRange: [] } };
            }
            const seen = new Map();
            const numbers = [];
            const duplicates = [];
            const nonNumeric = [];
            const outOfRange = [];
            const invalidRange = [];
            const rollRange = getRollRanges();
            const min = rollRange[0];
            const max = rollRange[1];

            rawTokens.forEach((token) => {
                if (token.includes('-')) {
                    const bounds = token.split('-');
                    const start = Number(bounds[0].trim());
                    const end = Number(bounds[1].trim());
                    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
                        invalidRange.push(token);
                        return;
                    }
                    for (let i = start; i <= end; i++) {
                        if (seen.has(i)) duplicates.push(i);
                        seen.set(i, (seen.get(i) || 0) + 1);
                        if (i >= min && i <= max) numbers.push(i);
                        else outOfRange.push(i);
                    }
                } else {
                    const num = Number(token);
                    if (Number.isNaN(num)) {
                        nonNumeric.push(token);
                        return;
                    }
                    if (seen.has(num)) duplicates.push(num);
                    seen.set(num, (seen.get(num) || 0) + 1);
                    if (num < min || num > max) outOfRange.push(num);
                    else numbers.push(num);
                }
            });

            const uniqueDuplicates = [...new Set(duplicates)];

            return {
                valid: nonNumeric.length === 0 && outOfRange.length === 0 && invalidRange.length === 0 && uniqueDuplicates.length === 0,
                numbers: [...new Set(numbers)].sort((a, b) => a - b),
                duplicates: uniqueDuplicates,
                errors: { nonNumeric, outOfRange, invalidRange }
            };
        };

        const getValidationResult = (inputText) => {
            const input = String(inputText || '');
            const rollRange = getRollRanges();
            const min = rollRange[0];
            const max = rollRange[1];
            const cacheKey = `${min}|${max}|${input}`;
            if (validationCacheKey === cacheKey && validationCacheValue) return validationCacheValue;
            const result = validateRollNumbers(input);
            validationCacheKey = cacheKey;
            validationCacheValue = result;
            return result;
        };

        const buildValidationErrorMessage = (validation) => {
            if (!validation || validation.valid) return '';
            const summarize = (label, values) => {
                const list = Array.isArray(values) ? values : [];
                const deduped = [...new Set(list.map((item) => String(item).trim()).filter(Boolean))];
                if (deduped.length === 0) return '';
                const previewLimit = 12;
                const preview = deduped.slice(0, previewLimit).join(', ');
                const extra = deduped.length > previewLimit ? `, +${deduped.length - previewLimit} more` : '';
                return `${label} (${deduped.length}): ${preview}${extra}`;
            };

            const parts = [
                summarize('Duplicates', validation.duplicates),
                summarize('Non-numeric', validation.errors?.nonNumeric),
                summarize('Out of range', validation.errors?.outOfRange),
                summarize('Invalid ranges', validation.errors?.invalidRange)
            ].filter(Boolean);

            return parts.join(' | ');
        };

        const getAttendanceStats = (inputNumbers, inputMode) => {
            const rollRange = getRollRanges();
            const min = rollRange[0];
            const max = rollRange[1];

            if (
                statsCacheInputRef === inputNumbers &&
                statsCacheMode === inputMode &&
                statsCacheMin === min &&
                statsCacheMax === max &&
                statsCacheResult
            ) {
                return statsCacheResult;
            }

            if (Number.isNaN(min) || Number.isNaN(max) || min > max) return { presentNumbers: [], absentNumbers: [], allNumbers: [] };
            if (allNumbersCacheMin !== min || allNumbersCacheMax !== max) {
                allNumbersCache = Array.from({ length: max - min + 1 }, (_, i) => i + min);
                allNumbersCacheMin = min;
                allNumbersCacheMax = max;
            }
            const allNumbers = allNumbersCache;
            let presentNumbers;
            let absentNumbers;

            if (inputNumbers.length === 0) {
                if (inputMode === 'absent') {
                    absentNumbers = inputNumbers;
                    presentNumbers = allNumbers;
                } else {
                    presentNumbers = inputNumbers;
                    absentNumbers = allNumbers;
                }
            } else if (inputNumbers.length === allNumbers.length) {
                if (inputMode === 'absent') {
                    absentNumbers = inputNumbers;
                    presentNumbers = [];
                } else {
                    presentNumbers = inputNumbers;
                    absentNumbers = [];
                }
            } else {
                const inputNumbersSet = new Set(inputNumbers);
                const complement = [];
                for (let i = 0; i < allNumbers.length; i++) {
                    const roll = allNumbers[i];
                    if (!inputNumbersSet.has(roll)) complement.push(roll);
                }

                if (inputMode === 'absent') {
                    absentNumbers = inputNumbers;
                    presentNumbers = complement;
                } else {
                    presentNumbers = inputNumbers;
                    absentNumbers = complement;
                }
            }
            const result = { presentNumbers, absentNumbers, allNumbers };
            statsCacheInputRef = inputNumbers;
            statsCacheMode = inputMode;
            statsCacheMin = min;
            statsCacheMax = max;
            statsCacheResult = result;
            return result;
        };

        return {
            getValidationResult,
            buildValidationErrorMessage,
            getAttendanceStats
        };
    };

    globalScope.AttendanceLogic = {
        groupNumbersIntoRanges,
        createAttendanceEngine
    };
})(window);
