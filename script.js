(() => {
    'use strict';

    // ==================== DOM ELEMENTS ====================
    const $ = id => document.getElementById(id);
    const slider = $('length-slider');
    const lengthInput = $('length-input');
    const passwordOut = $('password-output');
    const passwordCard = $('password-card');
    const btnGenerate = $('btn-generate');
    const btnCopy = $('btn-copy');
    const iconCopy = $('icon-copy');
    const iconCheck = $('icon-check');
    const strengthBar = $('strength-bar');
    const strengthLabel = $('strength-label');
    const crackTime = $('crack-time');
    const toast = $('toast');

    const optLower = $('opt-lower');
    const optUpper = $('opt-upper');
    const optNumbers = $('opt-numbers');
    const optSymbols = $('opt-symbols');
    const optExclude = $('opt-exclude');
    const excludeInputWrap = $('exclude-input-wrap');
    const excludeInput = $('exclude-input');

    const allTypeCheckboxes = [optLower, optUpper, optNumbers, optSymbols];

    // ==================== CHARACTER SETS ====================
    const CHARS = {
        lower:   'abcdefghijklmnopqrstuvwxyz',
        upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    const DEFAULT_AMBIGUOUS = 'oOlI10|{}[]();:\'"`,./\\';

    function getExcludeChars() {
        if (!optExclude.checked) return '';
        const custom = excludeInput.value.trim();
        return custom.length > 0 ? custom : DEFAULT_AMBIGUOUS;
    }

    function filterChars(str, excludeSet) {
        if (!excludeSet) return str;
        return str.split('').filter(c => !excludeSet.includes(c)).join('');
    }

    // ==================== SLIDER SYNC ====================
    function updateSlider() {
        const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty('--pct', pct + '%');
        lengthInput.value = slider.value;
    }
    slider.addEventListener('input', updateSlider);
    updateSlider();

    // Editable length input — syncs slider
    lengthInput.addEventListener('change', () => {
        let val = parseInt(lengthInput.value, 10);
        if (isNaN(val)) val = 16;
        val = Math.max(4, Math.min(32, val));
        lengthInput.value = val;
        slider.value = val;
        updateSlider();
    });
    lengthInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            lengthInput.blur();
            btnGenerate.click();
        }
    });

    // Toggle exclude input visibility
    optExclude.addEventListener('change', () => {
        excludeInputWrap.classList.toggle('visible', optExclude.checked);
    });

    // Ensure at least one character type is always selected
    allTypeCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const anyChecked = allTypeCheckboxes.some(c => c.checked);
            if (!anyChecked) {
                cb.checked = true; // revert the uncheck
            }
        });
    });

    // ==================== PASSWORD GENERATION ====================
    function getCharPool() {
        const excludeSet = getExcludeChars();
        let lower = filterChars(CHARS.lower, excludeSet);
        let upper = filterChars(CHARS.upper, excludeSet);
        let numbers = filterChars(CHARS.numbers, excludeSet);
        let symbols = filterChars(CHARS.symbols, excludeSet);

        let pool = '';
        const guaranteed = [];
        if (optLower.checked && lower.length) {
            pool += lower;
            guaranteed.push(lower[Math.floor(Math.random() * lower.length)]);
        }
        if (optUpper.checked && upper.length) {
            pool += upper;
            guaranteed.push(upper[Math.floor(Math.random() * upper.length)]);
        }
        if (optNumbers.checked && numbers.length) {
            pool += numbers;
            guaranteed.push(numbers[Math.floor(Math.random() * numbers.length)]);
        }
        if (optSymbols.checked && symbols.length) {
            pool += symbols;
            guaranteed.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
        return { pool, guaranteed, poolSize: pool.length };
    }

    function generatePassword() {
        const length = parseInt(slider.value, 10);
        const { pool, guaranteed } = getCharPool();

        const remaining = [];
        const arr = new Uint32Array(length);
        crypto.getRandomValues(arr);

        for (let i = 0; i < length - guaranteed.length; i++) {
            remaining.push(pool[arr[i] % pool.length]);
        }

        const combined = [...guaranteed, ...remaining];
        for (let i = combined.length - 1; i > 0; i--) {
            const j = arr[i] % (i + 1);
            [combined[i], combined[j]] = [combined[j], combined[i]];
        }

        return combined.join('');
    }

    // ==================== SCRAMBLE ANIMATION ====================
    const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const SCRAMBLE_DURATION = 600; // ms
    const SCRAMBLE_INTERVAL = 30;  // ms per frame
    let scrambleTimer = null;

    function scrambleReveal(finalPassword) {
        if (scrambleTimer) clearInterval(scrambleTimer);

        const len = finalPassword.length;
        const totalFrames = Math.floor(SCRAMBLE_DURATION / SCRAMBLE_INTERVAL);
        let frame = 0;

        scrambleTimer = setInterval(() => {
            frame++;
            const revealCount = Math.floor((frame / totalFrames) * len);

            passwordOut.innerHTML = '';
            for (let i = 0; i < len; i++) {
                const span = document.createElement('span');
                if (i < revealCount) {
                    // Revealed — final character with color
                    span.textContent = finalPassword[i];
                    const ch = finalPassword[i];
                    if (/[A-Z]/.test(ch)) span.className = 'char-upper';
                    else if (/[0-9]/.test(ch)) span.className = 'char-number';
                    else if (/[^a-zA-Z0-9]/.test(ch)) span.className = 'char-symbol';
                } else {
                    // Still scrambling — random character
                    span.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                    span.className = 'char-scramble';
                }
                passwordOut.appendChild(span);
            }

            if (frame >= totalFrames) {
                clearInterval(scrambleTimer);
                scrambleTimer = null;
                // Render the final clean version
                renderPassword(finalPassword);
            }
        }, SCRAMBLE_INTERVAL);
    }

    // ==================== DISPLAY PASSWORD ====================
    function renderPassword(pw) {
        passwordOut.innerHTML = '';
        for (const ch of pw) {
            const span = document.createElement('span');
            span.textContent = ch;
            if (/[A-Z]/.test(ch)) span.className = 'char-upper';
            else if (/[0-9]/.test(ch)) span.className = 'char-number';
            else if (/[^a-zA-Z0-9]/.test(ch)) span.className = 'char-symbol';
            passwordOut.appendChild(span);
        }
        passwordOut.dataset.password = pw;
    }

    // ==================== CRACK TIME ESTIMATOR ====================
    function calcEntropy(pw) {
        const { poolSize } = getCharPool();
        return pw.length * Math.log2(poolSize || 26);
    }

    function calcCrackSeconds(entropy) {
        const guessesPerSec = 1e10; // 10 billion guesses/sec
        return Math.pow(2, entropy) / guessesPerSec;
    }

    function pluralize(n, unit) {
        return `${n} ${unit}${n === 1 ? '' : 's'}`;
    }

    function estimateCrackTime(pw) {
        const entropy = calcEntropy(pw);
        const seconds = calcCrackSeconds(entropy);

        if (seconds < 1) return 'Instantly';
        if (seconds < 60) return pluralize(Math.round(seconds), 'second');
        if (seconds < 3600) return pluralize(Math.round(seconds / 60), 'minute');
        if (seconds < 86400) return pluralize(Math.round(seconds / 3600), 'hour');
        if (seconds < 86400 * 365) return pluralize(Math.round(seconds / 86400), 'day');
        if (seconds < 86400 * 365 * 1e3) return pluralize(Math.round(seconds / (86400 * 365)), 'year');
        if (seconds < 86400 * 365 * 1e6) return `${formatBig(seconds / (86400 * 365 * 1e3))} thousand years`;
        if (seconds < 86400 * 365 * 1e9) return `${formatBig(seconds / (86400 * 365 * 1e6))} million years`;
        if (seconds < 86400 * 365 * 1e12) return `${formatBig(seconds / (86400 * 365 * 1e9))} billion years`;
        return `${formatBig(seconds / (86400 * 365 * 1e12))} trillion+ years`;
    }

    function formatBig(n) {
        if (n >= 100) return Math.round(n).toLocaleString();
        if (n >= 10) return Math.round(n);
        return n.toFixed(1);
    }

    // ==================== STRENGTH METER ====================
    function evaluateStrength(pw) {
        // Use entropy-based scoring so strength aligns with crack time
        const entropy = calcEntropy(pw);
        const seconds = calcCrackSeconds(entropy);

        let level;
        if (seconds < 1) {
            level = { label: 'Weak',     color: 'var(--red)',    pct: 10 };
        } else if (seconds < 60) {
            level = { label: 'Weak',     color: 'var(--red)',    pct: 20 };
        } else if (seconds < 86400) {
            level = { label: 'Fair',     color: 'var(--orange)', pct: 40 };
        } else if (seconds < 86400 * 365 * 100) {
            level = { label: 'Good',     color: 'var(--yellow)', pct: 60 };
        } else if (seconds < 86400 * 365 * 1e9) {
            level = { label: 'Strong',   color: 'var(--green)',  pct: 80 };
        } else {
            level = { label: 'Fortress', color: 'var(--green)',  pct: 100 };
        }

        strengthBar.style.width = level.pct + '%';
        strengthBar.style.background = level.color;
        strengthLabel.textContent = level.label;
        strengthLabel.style.color = level.color;

        // Crack time
        const timeStr = estimateCrackTime(pw);
        crackTime.textContent = timeStr === 'Instantly' ? '⏱ Cracked instantly' : `⏱ ${timeStr} to crack`;
        crackTime.style.color = level.color;
    }

    // ==================== GENERATE HANDLER ====================
    btnGenerate.addEventListener('click', () => {
        const pw = generatePassword();
        passwordOut.dataset.password = pw;

        // Scramble animation then reveal
        scrambleReveal(pw);
        evaluateStrength(pw);

        // Pulse animation
        passwordCard.classList.remove('generated');
        void passwordCard.offsetWidth;
        passwordCard.classList.add('generated');

        // Reset copy state
        resetCopyBtn();
    });

    // ==================== COPY HANDLER ====================
    let copyTimeout;
    function resetCopyBtn() {
        clearTimeout(copyTimeout);
        iconCopy.classList.remove('hidden');
        iconCheck.classList.add('hidden');
        btnCopy.classList.remove('copied');
    }

    btnCopy.addEventListener('click', async () => {
        const pw = passwordOut.dataset?.password;
        if (!pw) return;

        try {
            await navigator.clipboard.writeText(pw);
            iconCopy.classList.add('hidden');
            iconCheck.classList.remove('hidden');
            btnCopy.classList.add('copied');

            toast.classList.add('show');
            copyTimeout = setTimeout(() => {
                toast.classList.remove('show');
                resetCopyBtn();
            }, 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = pw;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    });

    // ==================== KEYBOARD SHORTCUTS ====================
    document.addEventListener('keydown', (e) => {
        // Don't trigger when typing in an input field
        const tag = e.target.tagName;
        const type = e.target.type;
        if (tag === 'INPUT' && type !== 'range' && type !== 'checkbox') return;

        if (e.code === 'Space' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            btnGenerate.click();
        }

        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
            // Only intercept if nothing is selected (no text highlighted)
            const selection = window.getSelection();
            if (!selection || selection.toString().length === 0) {
                e.preventDefault();
                btnCopy.click();
            }
        }
    });

    // ==================== AUTO-GENERATE ON LOAD ====================
    btnGenerate.click();
})();
