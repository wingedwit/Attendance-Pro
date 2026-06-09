(function attachAttendanceUIUtils(globalScope) {
    const createToast = (toastElement, duration = 3000) => {
        let timer = null;

        return (message, isError = false) => {
            if (!toastElement) return;
            toastElement.textContent = message;
            toastElement.classList.toggle('error', isError);
            toastElement.classList.add('show');
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                toastElement.classList.remove('show');
            }, duration);
        };
    };

    const createClipboard = (showToast) => {
        const copyText = (text, successMessage, copiedLabel = '') => {
            const toastMessage = copiedLabel ? `${successMessage} (${copiedLabel})` : successMessage;
            if (!navigator.clipboard) {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    showToast(toastMessage);
                    return Promise.resolve(true);
                } catch (_) {
                    showToast('Copy failed', true);
                    return Promise.resolve(false);
                } finally {
                    document.body.removeChild(textArea);
                }
            }

            return navigator.clipboard.writeText(text)
                .then(() => {
                    showToast(toastMessage);
                    return true;
                })
                .catch(() => {
                    showToast('Copy failed', true);
                    return false;
                });
        };

        const copyRichText = (html, plain, successMessage, copiedLabel = '') => {
            const toastMessage = copiedLabel ? `${successMessage} (${copiedLabel})` : successMessage;
            if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
                return copyText(plain, successMessage, copiedLabel);
            }

            const item = new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([plain], { type: 'text/plain' })
            });

            return navigator.clipboard.write([item])
                .then(() => {
                    showToast(toastMessage);
                    return true;
                })
                .catch(() => copyText(plain, successMessage, copiedLabel));
        };

        return { copyText, copyRichText };
    };

    const createCopyFeedback = ({
        defaultPath = 'M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14',
        successPath = 'M5 13l4 4L19 7',
        duration = 2000
    } = {}) => {
        let timer = null;

        return (button) => {
            if (!button) return;
            const pathNode = button.querySelector('path');
            button.classList.add('success');
            if (pathNode) pathNode.setAttribute('d', successPath);
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                button.classList.remove('success');
                if (pathNode) pathNode.setAttribute('d', defaultPath);
            }, duration);
        };
    };

    globalScope.AttendanceUIUtils = {
        createToast,
        createClipboard,
        createCopyFeedback
    };
})(window);
