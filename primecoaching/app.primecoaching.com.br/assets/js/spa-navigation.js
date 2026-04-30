class SPANavigator {
    constructor() {
        this.contentContainer = document.querySelector('#main-content');
        this.progressBar = this.createProgressBar();
        this.layoutUpdateInterval = null;
        this.currentLink = null;
        this.loadedScripts = new Set();
        this.initialized = false;

        this.cleanupCallbacks = [];
        this.trackedIntervals = [];
        this.trackedTimeouts = [];
        this.pageAbortController = new AbortController();
        window.spaSignal = this.pageAbortController.signal;

        // Idle / visibility tracking
        this.FETCH_TIMEOUT = 15000; // 15s timeout for navigation fetches
        this.IDLE_THRESHOLD = 60000; // 1 min — consider connection potentially stale
        this.lastActivityTime = Date.now();
        this.isPageVisible = !document.hidden;
        this.isNavigating = false;
        this.connectionWarmedUp = true;

        this._origSetInterval = window.setInterval.bind(window);
        this._origClearInterval = window.clearInterval.bind(window);
        this._origSetTimeout = window.setTimeout.bind(window);
        this._origClearTimeout = window.clearTimeout.bind(window);
        this.overrideTimers();

        document.querySelectorAll('script[src]').forEach(script => {
            if (script.src) {
                this.loadedScripts.add(script.src);
                try {
                    this.loadedScripts.add(new URL(script.src, window.location.origin).href);
                } catch (e) {}
            }
        });

        this.init();
    }

    init() {
        if (this.initialized) return;
        this.interceptLinks();
        this.interceptOnclickElements();
        this.interceptForms();
        this.handlePopState();
        this.handleVisibilityChange();
        this.trackActivity();
        this.startLayoutPolling();
        this.initialized = true;
    }

    /**
     * Fetch with timeout via AbortController.
     * Prevents requests from hanging indefinitely when connection is stale.
     */
    fetchWithTimeout(url, options = {}, timeout = this.FETCH_TIMEOUT) {
        const controller = new AbortController();
        const signal = controller.signal;

        // If caller already provided a signal, listen to it too
        if (options.signal) {
            options.signal.addEventListener('abort', () => controller.abort());
        }

        const timeoutId = this._origSetTimeout(() => controller.abort(), timeout);

        return fetch(url, { ...options,
            signal
        }).finally(() => {
            this._origClearTimeout(timeoutId);
        });
    }

    /**
     * Pause polling when page is hidden, resume + warm-up when visible again.
     * Warm-up is non-blocking — it runs in the background so the user is not stuck waiting.
     */
    handleVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isPageVisible = false;
                this.pauseLayoutPolling();
            } else {
                this.isPageVisible = true;
                const idleTime = Date.now() - this.lastActivityTime;
                if (idleTime > this.IDLE_THRESHOLD) {
                    // Fire-and-forget warm-up: does NOT block navigation
                    this.warmUpConnection();
                }
                this.resumeLayoutPolling();
            }
        });
    }

    /**
     * Track user activity to know how long the page has been idle.
     * Throttled to fire at most once every 5 seconds to avoid performance overhead.
     */
    trackActivity() {
        let throttleTimer = null;
        const updateActivity = () => {
            if (throttleTimer) return;
            this.lastActivityTime = Date.now();
            this.connectionWarmedUp = true;
            throttleTimer = this._origSetTimeout(() => {
                throttleTimer = null;
            }, 5000);
        };
        document.addEventListener('click', updateActivity, {
            passive: true
        });
        document.addEventListener('keydown', updateActivity, {
            passive: true
        });
        document.addEventListener('touchstart', updateActivity, {
            passive: true
        });
        // mousemove and scroll are too frequent — skip them, click/key/touch is enough
    }

    /**
     * Fire-and-forget: send a lightweight request to wake up the TCP connection.
     * This runs in the background and never blocks navigation.
     * Session validation is handled inside navigate() itself.
     */
    warmUpConnection() {
        this.fetchWithTimeout('/api/layout-data', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        }, 5000).then(res => {
            this.connectionWarmedUp = true;
            if (res.ok) {
                res.json().then(result => {
                    if (result.success && result.data) this.applyLayoutUpdates(result.data);
                }).catch(() => {});
            }
        }).catch(() => {
            // Warm-up failed, that's fine — navigate() has its own timeout
            this.connectionWarmedUp = true;
        });
    }

    pauseLayoutPolling() {
        if (this.layoutUpdateInterval) {
            this._origClearInterval(this.layoutUpdateInterval);
            this.layoutUpdateInterval = null;
        }
    }

    resumeLayoutPolling() {
        if (!this.layoutUpdateInterval) {
            // Small random delay (0-3s) to avoid thundering herd when multiple tabs resume
            const jitter = Math.floor(Math.random() * 3000);
            this._origSetTimeout(() => {
                this.updateLayoutData();
                if (!this.layoutUpdateInterval) {
                    this.layoutUpdateInterval = this._origSetInterval(() => this.updateLayoutData(), 30000);
                }
            }, jitter);
        }
    }

    /**
     * SPA Filter Forms — Generic handler
     * 
     * Any <form data-spa-form> will be submitted via fetch instead of full reload.
     * The results area must be wrapped in a <div data-spa-results>.
     * Pagination links inside [data-spa-results] are also intercepted.
     * 
     * Usage in views:
     *   <form data-spa-form action="/my-page" method="GET">...</form>
     *   <div data-spa-results>
     *     ... results + pagination ...
     *   </div>
     */
    interceptForms() {
        // Delegate: listen on contentContainer for submit events on [data-spa-form]
        this.contentContainer.addEventListener('submit', (e) => {
            const form = e.target.closest('[data-spa-form]');
            if (!form) return;
            e.preventDefault();
            this.submitSpaForm(form);
        });

        // Delegate: intercept pagination link clicks inside [data-spa-results]
        this.contentContainer.addEventListener('click', (e) => {
            const link = e.target.closest('[data-spa-results] a[href]');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || link.target === '_blank') return;

            // Only intercept pagination links (same base path)
            const form = this.contentContainer.querySelector('[data-spa-form]');
            if (!form) return;
            const formAction = form.getAttribute('action') || '';
            if (!href.includes(formAction)) return;

            e.preventDefault();
            e.stopPropagation();
            this.loadSpaResults(href, form);
        }, true);
    }

    submitSpaForm(form) {
        const formData = new FormData(form);
        const params = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            if (value !== '') params.append(key, value);
        }
        const action = form.getAttribute('action') || window.location.pathname;
        const queryString = params.toString();
        const url = action + (queryString ? '?' + queryString : '');
        this.persistFiltersFromForm(form, url);
        this.loadSpaResults(url, form);
    }

    /**
     * Filter persistence (opt-in via [data-spa-persist-filters] on the form).
     * Saves the latest filtered URL in sessionStorage keyed by the form's action path,
     * so an internal "back to listing" link marked [data-spa-restore-filters] can
     * reapply the user's filters within the TTL window.
     */
    persistFiltersStorageKey(path) {
        return 'spa-filters:' + path;
    }

    persistFiltersFromForm(form, url) {
        if (!form.hasAttribute('data-spa-persist-filters')) return;
        const action = form.getAttribute('action') || window.location.pathname;
        const ttlSeconds = parseInt(form.getAttribute('data-spa-persist-ttl') || '600', 10);
        try {
            sessionStorage.setItem(this.persistFiltersStorageKey(action), JSON.stringify({
                url,
                expires: Date.now() + ttlSeconds * 1000,
            }));
        } catch (e) {}
    }

    readPersistedFilters(path) {
        try {
            const raw = sessionStorage.getItem(this.persistFiltersStorageKey(path));
            if (!raw) return null;
            const entry = JSON.parse(raw);
            if (!entry || !entry.url || !entry.expires || Date.now() > entry.expires) {
                sessionStorage.removeItem(this.persistFiltersStorageKey(path));
                return null;
            }
            return entry.url;
        } catch (e) {
            return null;
        }
    }

    async loadSpaResults(url, form) {
        const resultsEl = this.contentContainer.querySelector('[data-spa-results]');
        if (!resultsEl) {
            // Fallback: navigate normally if no results wrapper found
            window.location.href = url;
            return;
        }

        // Loading state
        resultsEl.style.opacity = '0.5';
        resultsEl.style.pointerEvents = 'none';
        this.showLoading();

        try {
            const response = await this.fetchWithTimeout(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            // Session expired — redirect to login
            if (response.redirected && response.url.includes('/login')) {
                window.location.href = '/login';
                return;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Replace results
            const newResults = doc.querySelector('[data-spa-results]');
            if (newResults) {
                resultsEl.innerHTML = newResults.innerHTML;
                // Execute inline scripts that innerHTML doesn't run
                this.executeResultsScripts(resultsEl);
            }

            // Update URL
            window.history.pushState({
                url
            }, '', url);

            // Refresh persisted filters TTL on pagination/reload of the same form
            if (form) this.persistFiltersFromForm(form, url);

            // Scroll to results
            resultsEl.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });

            // Re-init any Flowbite/tooltips/etc inside the new content
            this._origSetTimeout(() => this.reinitializeScripts(), 50);
        } catch (e) {
            if (e.name === 'AbortError') {
                console.warn('SPA form request timed out, falling back to full reload');
            } else {
                console.error('SPA form error:', e);
            }
            window.location.href = url;
        } finally {
            resultsEl.style.opacity = '1';
            resultsEl.style.pointerEvents = 'auto';
            this.hideLoading();
        }
    }

    executeResultsScripts(container) {
        container.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                let code = oldScript.textContent
                    .replace(/^(\s*)(const|let)\s+/gm, '$1var ')
                    .replace(/([;{},(])\s*(const|let)\s+/g, '$1 var ');
                const funcs = [...code.matchAll(/\bfunction\s+([a-zA-Z_$][\w$]*)\s*\(/g)].map(m => m[1]);
                const vars = [...code.matchAll(/\bvar\s+([a-zA-Z_$][\w$]*)/g)].map(m => m[1]);
                const exports = [...new Set([...funcs, ...vars])];
                const exportBlock = exports.length ? '\n' + exports.map(n => `try{window['${n}']=${n}}catch(_){}`).join(';') + ';' : '';
                newScript.textContent = `(function(){${code}${exportBlock}})();`;
            }
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    interceptOnclickElements() {
        new MutationObserver(() => this.patchOnclickElements())
            .observe(document.body, {
                childList: true,
                subtree: true
            });
        this.patchOnclickElements();
    }

    patchOnclickElements() {
        document.querySelectorAll('[onclick]').forEach(element => {
            if (element.dataset.spaPatched) return;
            if (element.hasAttribute('data-no-spa') || element.closest('[data-no-spa]')) return;
            const onclickAttr = element.getAttribute('onclick');
            const match = onclickAttr.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"`]([^'"`]+)['"`]/);
            if (match) {
                const url = match[1];
                element.removeAttribute('onclick');
                element.addEventListener('click', (e) => {
                    let target = url;
                    if (element.hasAttribute('data-spa-restore-filters')) {
                        const restored = this.readPersistedFilters(url.split('?')[0]);
                        if (restored) target = restored;
                    }
                    if (this.shouldUseSPA(target)) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.navigate(target, null);
                    } else {
                        window.location.href = target;
                    }
                });
                element.dataset.spaPatched = 'true';
            }
        });
    }

    shouldUseSPA(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.startsWith('http') && !url.startsWith(window.location.origin)) return false;
        const clean = url.replace(window.location.origin, '');
        return !(clean.startsWith('#') || clean.startsWith('mailto:') || clean.startsWith('tel:') ||
            clean.includes('logout') || clean.includes('/api/') || clean.includes('/webhook/'));
    }

    createProgressBar() {
        const bar = document.createElement('div');
        bar.id = 'spa-progress-bar';
        bar.style.cssText = `
            position: fixed; top: 0; left: 0; width: 0%; height: 2px;
            background: linear-gradient(90deg, #3D96FF, #60A5FA);
            z-index: 99999; transition: width 0.3s ease-out, opacity 0.3s ease-out;
            opacity: 0; box-shadow: 0 0 8px rgba(61, 150, 255, 0.6); pointer-events: none;
        `;
        document.body.appendChild(bar);
        return bar;
    }

    showLoading() {
        this.progressBar.style.opacity = '1';
        this.progressBar.style.width = '0%';
        setTimeout(() => {
            this.progressBar.style.width = '60%';
        }, 10);
    }

    hideLoading() {
        this.progressBar.style.width = '100%';
        this.currentLink = null;
        setTimeout(() => {
            this.progressBar.style.opacity = '0';
            setTimeout(() => {
                this.progressBar.style.width = '0%';
            }, 300);
        }, 400);
    }

    interceptLinks() {
        document.addEventListener('click', this.handleLinkClick.bind(this), true);
    }

    handleLinkClick(e) {
        const link = e.target.closest('a[href]');
        if (!link) return;
        if (link.hasAttribute('data-no-spa') || link.closest('[data-no-spa]')) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#') ||
            href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') ||
            href.includes('logout') || link.hasAttribute('download') ||
            link.target === '_blank' || href.includes('/api/') || href.includes('/webhook/') ||
            href.includes('/subscription/') || href.includes('/promo-offer') || href.includes('/onboarding/payment')) return;

        let target = href;
        if (link.hasAttribute('data-spa-restore-filters')) {
            const restored = this.readPersistedFilters(href.split('?')[0]);
            if (restored) target = restored;
        }

        e.preventDefault();
        e.stopPropagation();
        this.navigate(target, link);
    }

    async navigate(url, link = null) {
        if (this.isNavigating) return;
        this.isNavigating = true;

        // Safety: auto-reset isNavigating after 20s to prevent permanent lock
        const safetyTimer = this._origSetTimeout(() => {
            this.isNavigating = false;
        }, 20000);

        this.showLoading();
        this.closeMobileSidebar();
        try {
            const response = await this.fetchWithTimeout(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            // Session expired — check redirect
            if (response.redirected && response.url.includes('/login')) {
                window.location.href = '/login';
                return;
            }
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
                return;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();

            // Detect login page in response body — only match the unique login form ID
            // (avoids false positives from pages that might have generic "login" text)
            if (!html.includes('id="main-content"') && html.includes('id="login-form"')) {
                window.location.href = '/login';
                return;
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const newContent = doc.querySelector('#main-content');

            if (!newContent) {
                window.location.href = url;
                return;
            }

            this.collectExtraScripts(doc, newContent);
            this.collectExtraStyles(doc, newContent);
            this.runCleanup();
            this.contentContainer.innerHTML = newContent.innerHTML;

            const newTitle = doc.querySelector('title');
            if (newTitle) document.title = newTitle.textContent;
            window.history.pushState({
                url
            }, '', url);

            const navCount = document.getElementById('spa-nav-count');
            if (navCount) navCount.textContent = (parseInt(navCount.textContent) || 0) + 1;
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            await this.executeInlineScripts(newContent);
            setTimeout(() => {
                this.reinitializeScripts();
                this.updateLayoutData();
            }, 50);
        } catch (e) {
            if (e.name === 'AbortError') {
                console.warn('SPA navigation timed out, falling back to full reload');
            }
            window.location.href = url;
        } finally {
            this._origClearTimeout(safetyTimer);
            this.isNavigating = false;
            this.hideLoading();
        }
    }

    closeMobileSidebar() {
        const sidebar = document.querySelector('.side-bar');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }

    collectExtraScripts(doc, newContent) {
        const existing = new Set(Array.from(newContent.querySelectorAll('script')));
        const mainEl = doc.querySelector('#main-content');
        const ignoreSrc = ['spa-navigation', 'flowbite', 'jquery', 'sweetalert', 'onesignal', 'OneSignal', 'sentry', 'pusher', 'stripe'];
        const ignoreContent = ['OneSignalDeferred', 'loadOneSignal', 'Sentry.init', 'initFlowbite'];

        doc.querySelectorAll('script').forEach(script => {
            if (existing.has(script)) return;
            const src = script.src || '';
            const text = script.textContent || '';
            if (ignoreSrc.some(p => src.includes(p))) return;
            if (ignoreContent.some(p => text.includes(p))) return;
            if (mainEl && script.compareDocumentPosition &&
                (mainEl.compareDocumentPosition(script) & Node.DOCUMENT_POSITION_PRECEDING)) return;
            if (text.trim() || src) newContent.appendChild(script.cloneNode(true));
        });
    }

    collectExtraStyles(doc, newContent) {
        const existing = new Set(Array.from(newContent.querySelectorAll('style')));
        const mainEl = doc.querySelector('#main-content');

        doc.querySelectorAll('style').forEach(style => {
            if (existing.has(style)) return;
            if (mainEl && style.compareDocumentPosition &&
                (mainEl.compareDocumentPosition(style) & Node.DOCUMENT_POSITION_PRECEDING)) return;
            if (style.textContent.trim()) newContent.appendChild(style.cloneNode(true));
        });
    }

    handlePopState() {
        window.addEventListener('popstate', (e) => {
            if (e.state ? .url) this.navigate(e.state.url, null);
        });
    }

    destroyExistingCharts(canvasElements = []) {
        if (typeof Chart === 'undefined') return;
        try {
            canvasElements.forEach(canvas => {
                try {
                    const c = Chart.getChart(canvas);
                    if (c) c.destroy();
                } catch (e) {}
            });

            ['weightChart', 'fatChart', 'exerciseChart', 'dietChart', 'dietLogChart',
                'waterChart', 'caloriesChart', 'myChart', 'historyChart', 'areaChart',
                'revenueChart', 'exerciseProgressChart'
            ].forEach(name => {
                if (window[name]) {
                    try {
                        if (typeof window[name].destroy === 'function') window[name].destroy();
                    } catch (e) {}
                    window[name] = null;
                }
            });

            if (Chart.instances) {
                Object.keys(Chart.instances).forEach(key => {
                    try {
                        Chart.instances[key] ? .destroy();
                        delete Chart.instances[key];
                    } catch (e) {}
                });
                Chart.instances = {};
            }
        } catch (e) {}
    }

    async executeInlineScripts(content) {
        document.querySelectorAll('#main-content script').forEach(s => s.remove());
        document.querySelectorAll('#main-content style').forEach(s => s.remove());

        const styles = content.querySelectorAll('style');
        styles.forEach(oldStyle => {
            const newStyle = document.createElement('style');
            Array.from(oldStyle.attributes).forEach(a => newStyle.setAttribute(a.name, a.value));
            newStyle.textContent = oldStyle.textContent;
            document.querySelector('#main-content').appendChild(newStyle);
        });

        const scripts = content.querySelectorAll('script');

        const dclCallbacks = [];
        const origAddEventListener = document.addEventListener.bind(document);

        document.addEventListener = function(type, cb, opts) {
            if (type === 'DOMContentLoaded') {
                dclCallbacks.push(cb);
                return;
            }
            return origAddEventListener(type, cb, opts);
        };

        for (const oldScript of scripts) {
            try {
                if (oldScript.src) {
                    const scriptUrl = new URL(oldScript.src, window.location.origin).href;
                    const scriptBase = scriptUrl.split('?')[0];

                    const isLoaded = this.loadedScripts.has(oldScript.src) ||
                        this.loadedScripts.has(scriptUrl) || [...this.loadedScripts].some(s => s.split('?')[0] === scriptBase) ||
                        document.querySelector(`script[src="${oldScript.getAttribute('src')}"]`) ||
                        document.querySelector(`script[src="${scriptUrl}"]`);

                    this.loadedScripts.add(oldScript.src);
                    this.loadedScripts.add(scriptUrl);

                    if (isLoaded) continue;

                    // Load external script and wait for it before continuing
                    await new Promise((resolve) => {
                        const newScript = document.createElement('script');
                        Array.from(oldScript.attributes).forEach(a => newScript.setAttribute(a.name, a.value));
                        newScript.src = oldScript.src;
                        newScript.onload = resolve;
                        newScript.onerror = () => {
                            this.loadedScripts.delete(oldScript.src);
                            this.loadedScripts.delete(scriptUrl);
                            resolve();
                        };
                        document.querySelector('#main-content').appendChild(newScript);
                    });
                } else if (oldScript.textContent.trim()) {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(a => newScript.setAttribute(a.name, a.value));
                    let code = oldScript.textContent
                        .replace(/^(\s*)(const|let)\s+/gm, '$1var ')
                        .replace(/([;{},(])\s*(const|let)\s+/g, '$1 var ');
                    const funcs = [...code.matchAll(/\bfunction\s+([a-zA-Z_$][\w$]*)\s*\(/g)].map(m => m[1]);
                    const vars = [...code.matchAll(/\bvar\s+([a-zA-Z_$][\w$]*)/g)].map(m => m[1]);
                    const exports = [...new Set([...funcs, ...vars])];
                    const exportBlock = exports.length ? '\n' + exports.map(n => `try{window['${n}']=${n}}catch(_){}`).join(';') + ';' : '';
                    newScript.textContent = `(function(){${code}${exportBlock}})();`;
                    document.querySelector('#main-content').appendChild(newScript);
                }
            } catch (e) {}
        }

        document.addEventListener = origAddEventListener;
        dclCallbacks.forEach(cb => {
            try {
                cb();
            } catch (e) {}
        });
    }

    reinitializeScripts() {
        this.reinitializeFlowbiteComponents();
        if (window.initializeTooltips) window.initializeTooltips();
        if (window.initializePopovers) window.initializePopovers();
        this.patchOnclickElements();
        this.updateSidebarActiveState();
        document.dispatchEvent(new CustomEvent('spa:contentLoaded'));
    }

    reinitializeFlowbiteComponents() {
        try {
            // Reinitialize accordions
            if (typeof initAccordions === 'function') {
                initAccordions();
            } else if (typeof window.initAccordions === 'function') {
                window.initAccordions();
            }

            document.querySelectorAll('[modal-backdrop]').forEach(b => b.remove());

            if (typeof Modal !== 'undefined') {
                document.querySelectorAll('[data-modal-toggle], [data-modal-target], [data-modal-show], [data-modal-hide]').forEach(trigger => {
                    if (trigger.dataset.flowbiteProcessed === 'true') return;
                    const targetId = trigger.getAttribute('data-modal-toggle') || trigger.getAttribute('data-modal-target') ||
                        trigger.getAttribute('data-modal-show') || trigger.getAttribute('data-modal-hide');
                    if (!targetId) return;
                    const targetEl = document.getElementById(targetId);
                    if (!targetEl) return;
                    if (targetEl._modalInstance) {
                        try {
                            targetEl._modalInstance.hide();
                            targetEl._modalInstance.destroy();
                        } catch (e) {}
                        delete targetEl._modalInstance;
                    }
                    const modal = new Modal(targetEl);
                    targetEl._modalInstance = modal;
                    trigger.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (trigger.hasAttribute('data-modal-toggle') || trigger.hasAttribute('data-modal-show')) {
                            modal.show();
                            setTimeout(() => {
                                targetEl.dispatchEvent(new CustomEvent('flowbite:modal:show', {
                                    detail: {
                                        modalId: targetId
                                    },
                                    bubbles: true
                                }));
                                document.dispatchEvent(new CustomEvent('spa:modal:opened', {
                                    detail: {
                                        modalId: targetId,
                                        modalElement: targetEl
                                    },
                                    bubbles: true
                                }));
                            }, 50);
                        } else if (trigger.hasAttribute('data-modal-hide')) {
                            modal.hide();
                        }
                    });
                    trigger.dataset.flowbiteProcessed = 'true';
                });
            }

            if (typeof Dropdown !== 'undefined') {
                document.querySelectorAll('[data-dropdown-toggle]').forEach(trigger => {
                    if (trigger.dataset.dropdownProcessed === 'true') return;
                    const targetEl = document.getElementById(trigger.getAttribute('data-dropdown-toggle'));
                    if (!targetEl) return;
                    if (targetEl._dropdownInstance) {
                        try {
                            targetEl._dropdownInstance.destroy();
                        } catch (e) {}
                    }
                    targetEl._dropdownInstance = new Dropdown(targetEl, trigger);
                    trigger.dataset.dropdownProcessed = 'true';
                });
            }

            if (typeof Tooltip !== 'undefined') {
                document.querySelectorAll('[data-tooltip-target]').forEach(trigger => {
                    if (trigger.dataset.tooltipProcessed === 'true') return;
                    const targetEl = document.getElementById(trigger.getAttribute('data-tooltip-target'));
                    if (!targetEl) return;
                    if (targetEl._tooltipInstance) {
                        try {
                            targetEl._tooltipInstance.destroy();
                        } catch (e) {}
                    }
                    targetEl._tooltipInstance = new Tooltip(targetEl, trigger);
                    trigger.dataset.tooltipProcessed = 'true';
                });
            }

            if (typeof Popover !== 'undefined') {
                document.querySelectorAll('[data-popover-target]').forEach(trigger => {
                    if (trigger.dataset.popoverProcessed === 'true') return;
                    const targetEl = document.getElementById(trigger.getAttribute('data-popover-target'));
                    if (!targetEl) return;
                    if (targetEl._popoverInstance) {
                        try {
                            targetEl._popoverInstance.destroy();
                        } catch (e) {}
                    }
                    targetEl._popoverInstance = new Popover(targetEl, trigger);
                    trigger.dataset.popoverProcessed = 'true';
                });
            }

            if (typeof Drawer !== 'undefined') {
                document.querySelectorAll('[data-drawer-show]').forEach(trigger => {
                    if (trigger.dataset.drawerProcessed === 'true') return;
                    const targetId = trigger.getAttribute('data-drawer-target') || trigger.getAttribute('data-drawer-show');
                    if (!targetId) return;
                    const targetEl = document.getElementById(targetId);
                    if (!targetEl) return;
                    const placement = trigger.getAttribute('data-drawer-placement') || 'left';
                    const bodyScrolling = trigger.getAttribute('data-drawer-body-scrolling') === 'true';
                    const backdrop = trigger.getAttribute('data-drawer-backdrop') !== 'false';
                    if (targetEl._drawerInstance) {
                        try {
                            targetEl._drawerInstance.hide();
                        } catch (e) {}
                    }
                    const drawer = new Drawer(targetEl, {
                        placement,
                        bodyScrolling,
                        backdrop
                    });
                    targetEl._drawerInstance = drawer;
                    trigger.addEventListener('click', (e) => {
                        e.preventDefault();
                        drawer.show();
                    });
                    trigger.dataset.drawerProcessed = 'true';
                });
                document.querySelectorAll('[data-drawer-hide]').forEach(trigger => {
                    if (trigger.dataset.drawerHideProcessed === 'true') return;
                    const targetId = trigger.getAttribute('data-drawer-hide');
                    if (!targetId) return;
                    const targetEl = document.getElementById(targetId);
                    if (!targetEl) return;
                    trigger.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (targetEl._drawerInstance) targetEl._drawerInstance.hide();
                    });
                    trigger.dataset.drawerHideProcessed = 'true';
                });
            }
        } catch (e) {}
    }

    updateSidebarActiveState() {
        const currentPath = window.location.pathname;
        const sidebar = document.querySelector('.side-bar .menu');
        if (!sidebar) return;

        sidebar.querySelectorAll('.item').forEach(i => i.classList.remove('active'));
        sidebar.querySelectorAll('a, .sub-btn').forEach(l => l.classList.remove('active', 'open'));
        sidebar.querySelectorAll('.sub-menu').forEach(s => s.style.display = 'none');
        sidebar.querySelectorAll('.dropdown').forEach(d => d.classList.remove('rotate'));

        let matchedLink = null,
            matchLength = 0;
        sidebar.querySelectorAll('a[href]').forEach(link => {
            const cleanHref = (link.getAttribute('href') || '').split('?')[0];
            const cleanPath = currentPath.split('?')[0];
            if ((cleanPath === cleanHref || cleanPath.startsWith(cleanHref + '/')) && cleanHref.length > matchLength) {
                matchedLink = link;
                matchLength = cleanHref.length;
            }
        });

        if (matchedLink) {
            matchedLink.classList.add('active');
            const parentItem = matchedLink.closest('.item');
            if (parentItem) {
                parentItem.classList.add('active');
                if (matchedLink.classList.contains('sub-item')) {
                    const subMenu = matchedLink.closest('.sub-menu');
                    if (subMenu) {
                        subMenu.style.display = 'block';
                        const subBtn = subMenu.previousElementSibling;
                        if (subBtn ? .classList.contains('sub-btn')) {
                            subBtn.classList.add('active', 'open');
                            const dropdown = subBtn.querySelector('.dropdown');
                            if (dropdown) dropdown.classList.add('rotate');
                        }
                    }
                }
            }
        } else {
            // Fallback: match by main section (e.g. /customers/birthdays -> /customers)
            const mainSection = '/' + currentPath.split('/').filter(Boolean)[0];
            if (mainSection && mainSection !== '/') {
                let sectionLink = null;
                sidebar.querySelectorAll('.sub-menu a[href]').forEach(link => {
                    const href = (link.getAttribute('href') || '').split('?')[0];
                    if (href.startsWith(mainSection)) {
                        sectionLink = link;
                    }
                });
                if (sectionLink) {
                    const parentItem = sectionLink.closest('.item');
                    if (parentItem) {
                        parentItem.classList.add('active');
                        const subMenu = sectionLink.closest('.sub-menu');
                        if (subMenu) {
                            subMenu.style.display = 'block';
                            const subBtn = subMenu.previousElementSibling;
                            if (subBtn ? .classList.contains('sub-btn')) {
                                subBtn.classList.add('active', 'open');
                                const dropdown = subBtn.querySelector('.dropdown');
                                if (dropdown) dropdown.classList.add('rotate');
                            }
                        }
                    }
                }
            }
        }
    }

    async updateLayoutData() {
        // Skip polling when page is not visible
        if (document.hidden) return;
        try {
            const res = await this.fetchWithTimeout('/api/layout-data', {}, 10000);
            if (res.redirected && res.url.includes('/login')) {
                window.location.href = '/login';
                return;
            }
            if (!res.ok) return;
            const result = await res.json();
            if (result.success && result.data) this.applyLayoutUpdates(result.data);
        } catch (e) {}
    }

    applyLayoutUpdates(data) {
        if (data.notifications) {
            this.updateBadge('feedbacks-badge', data.notifications.hasPendingFeedbacks);
            this.updateBadge('chats-badge', data.notifications.hasPendingChats);
            this.updateBadge('consultancy-badge', data.notifications.hasPendingConsultancy);
        }
        if (data.financial) {
            const el = document.querySelector('.user-balance');
            if (el) el.textContent = data.financial.balance;
            const bar = document.querySelector('.financial-progress-bar');
            if (bar) bar.style.width = data.financial.percentage + '%';
        }
        if (data.limits) {
            const el = document.querySelector('.customer-limits');
            if (el) el.textContent = `${data.limits.activeCustomers}/${data.limits.maxAllowed}`;
        }
    }

    updateBadge(id, show) {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'inline-block' : 'none';
    }

    onCleanup(callback) {
        if (typeof callback === 'function') {
            this.cleanupCallbacks.push(callback);
        }
    }

    overrideTimers() {
        const self = this;

        window.setInterval = function(fn, delay, ...args) {
            const id = self._origSetInterval(fn, delay, ...args);
            self.trackedIntervals.push(id);
            return id;
        };

        window.clearInterval = function(id) {
            self.trackedIntervals = self.trackedIntervals.filter(i => i !== id);
            return self._origClearInterval(id);
        };

        window.setTimeout = function(fn, delay, ...args) {
            const id = self._origSetTimeout(fn, delay, ...args);
            if (delay > 500) self.trackedTimeouts.push(id);
            return id;
        };

        window.clearTimeout = function(id) {
            self.trackedTimeouts = self.trackedTimeouts.filter(i => i !== id);
            return self._origClearTimeout(id);
        };
    }

    runCleanup() {
        this.cleanupCallbacks.forEach(cb => {
            try {
                cb();
            } catch (e) {}
        });
        this.cleanupCallbacks = [];

        this.trackedIntervals.forEach(id => {
            try {
                this._origClearInterval(id);
            } catch (e) {}
        });
        this.trackedIntervals = [];

        this.trackedTimeouts.forEach(id => {
            try {
                this._origClearTimeout(id);
            } catch (e) {}
        });
        this.trackedTimeouts = [];

        if (this.pageAbortController) {
            this.pageAbortController.abort();
        }
        this.pageAbortController = new AbortController();
        window.spaSignal = this.pageAbortController.signal;

        this.destroyExistingCharts(Array.from(this.contentContainer.querySelectorAll('canvas')));
        this.destroyGlobalChartRefs();
        this.destroyJQueryPlugins();
        this.closeSweetAlert();
        this.destroyAlpineComponents();
        this.cleanOrphanedElements();
    }

    destroyGlobalChartRefs() {
        if (typeof Chart === 'undefined') return;
        try {
            Object.keys(window).forEach(key => {
                try {
                    if (window[key] && typeof window[key].destroy === 'function' &&
                        window[key].canvas && window[key].config) {
                        window[key].destroy();
                        window[key] = null;
                    }
                } catch (e) {}
            });
        } catch (e) {}
    }

    destroyJQueryPlugins() {
        const jq = window.$ || window.jQuery;
        if (!jq) return;

        try {
            if (jq.fn.DataTable) {
                this.contentContainer.querySelectorAll('.dataTable, table[id]').forEach(table => {
                    try {
                        if (jq.fn.DataTable.isDataTable(table)) jq(table).DataTable().destroy(true);
                    } catch (e) {}
                });
            }

            if (jq.fn.select2) {
                this.contentContainer.querySelectorAll('.select2-hidden-accessible').forEach(el => {
                    try {
                        jq(el).select2('destroy');
                    } catch (e) {}
                });
            }

            if (jq.fn.datepicker) {
                this.contentContainer.querySelectorAll('[data-datepicker], .datepicker').forEach(el => {
                    try {
                        jq(el).datepicker('destroy');
                    } catch (e) {}
                });
            }

            if (jq.fn.unmask) {
                this.contentContainer.querySelectorAll('[data-mask]').forEach(el => {
                    try {
                        jq(el).unmask();
                    } catch (e) {}
                });
            }
        } catch (e) {}
    }

    closeSweetAlert() {
        try {
            if (typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible()) {
                Swal.close();
            }
        } catch (e) {}
    }

    destroyAlpineComponents() {
        try {
            if (typeof Alpine === 'undefined') return;
            this.contentContainer.querySelectorAll('[x-data]').forEach(el => {
                try {
                    if (el._x_dataStack && Alpine.destroyTree) Alpine.destroyTree(el);
                } catch (e) {}
            });
        } catch (e) {}
    }

    cleanOrphanedElements() {
        document.querySelectorAll('[role="tooltip"]').forEach(el => {
            if (!this.contentContainer.contains(el) && document.body.contains(el) && el.id) {
                try {
                    el.remove();
                } catch (e) {}
            }
        });

        document.querySelectorAll('[modal-backdrop], .modal-backdrop').forEach(el => {
            try {
                el.remove();
            } catch (e) {}
        });

        document.body.classList.remove('overflow-hidden', 'modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    startLayoutPolling() {
        this.layoutUpdateInterval = this._origSetInterval(() => this.updateLayoutData(), 30000);
    }

    destroy() {
        this.runCleanup();
        if (this.layoutUpdateInterval) this._origClearInterval(this.layoutUpdateInterval);
        if (this.progressBar && this.progressBar.parentNode) {
            this.progressBar.parentNode.removeChild(this.progressBar);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.spaNavigator) window.spaNavigator = new SPANavigator();
    });
} else {
    if (!window.spaNavigator) window.spaNavigator = new SPANavigator();
}