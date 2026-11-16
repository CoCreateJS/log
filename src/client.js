/********************************************************************************
 * Copyright (C) 2026 CoCreate and Contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 ********************************************************************************/

const defaultOptions = {
    includeModules: [],
    maxBatchSize: 20,
    maxQueueSize: 1000,
    flushIntervalMs: 1500
};

/**
 * Creates an opt-in browser logger. No listeners or console patches are
 * installed until start() is called, and entries are accepted only when their
 * stack matches one of the configured module strings.
 *
 * @param {Object} options
 * @param {string[]} options.includeModules Module path fragments to capture.
 * @param {Function} options.sendLogs Receives a batch of log entries.
 * @param {number} [options.maxBatchSize]
 * @param {number} [options.flushIntervalMs]
 * @returns {Object} Logger controls: start, stop, capture, flush, and queue.
 * @public
 * @environment client
 */
export function init(options = {}) {
    const config = { ...defaultOptions, ...options };
    const queue = [];
    let timer = null;
    let started = false;
    let originalConsoleError = null;
    let patchedConsoleError = null;
    let isFlushing = false;

    function matches(entry) {
        const stack = entry.stack || '';
        return config.includeModules.some(modulePath =>
            typeof modulePath === 'string' && modulePath && stack.includes(modulePath)
        );
    }

    function capture(error, metadata = {}) {
        const normalized = error instanceof Error
            ? error
            : new Error(typeof error === 'string' ? error : String(error));
        const entry = {
            timestamp: Date.now(),
            level: 'error',
            message: normalized.message,
            stack: normalized.stack || '',
            ...(metadata && typeof metadata === 'object' ? { metadata } : {})
        };

        if (!matches(entry)) return false;
        queue.push(entry);
        if (queue.length > config.maxQueueSize) queue.shift();
        if (queue.length >= config.maxBatchSize) flush();
        return true;
    }

    async function flush() {
        if (isFlushing || !queue.length || typeof config.sendLogs !== 'function') return;
        isFlushing = true;
        const batch = queue.splice(0, config.maxBatchSize);
        try {
            await config.sendLogs(batch);
        } catch {
            queue.unshift(...batch);
        } finally {
            isFlushing = false;
        }
    }

    function onError(event) {
        if (event.error instanceof Error) capture(event.error, { type: 'error' });
    }

    function onUnhandledRejection(event) {
        capture(event.reason, { type: 'unhandledrejection' });
    }

    function start() {
        if (started || typeof window === 'undefined') return;
        started = true;
        originalConsoleError = console.error;
        patchedConsoleError = function (...args) {
            originalConsoleError.apply(console, args);
            const error = args.find(value => value instanceof Error);
            capture(error || args.map(String).join(' '), { type: 'console.error' });
        };
        console.error = patchedConsoleError;
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);
        timer = setInterval(flush, config.flushIntervalMs);
    }

    async function stop() {
        if (!started) return;
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onUnhandledRejection);
        if (console.error === patchedConsoleError) console.error = originalConsoleError;
        clearInterval(timer);
        timer = null;
        started = false;
        patchedConsoleError = null;
        await flush();
    }

    return { start, stop, capture, flush, queue };
}

export default { init };
