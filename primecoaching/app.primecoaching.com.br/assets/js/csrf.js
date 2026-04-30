(function() {
    'use strict';

    var FIELD_NAME = '_csrf_token';
    var HEADER_NAME = 'X-CSRF-Token';

    function currentToken() {
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    }

    if (!currentToken()) {
        return;
    }

    window.CSRF = {
        token: currentToken,
        fieldName: FIELD_NAME,
        headerName: HEADER_NAME,
    };

    function isSameOrigin(url) {
        try {
            var parsed = new URL(url, window.location.href);
            return parsed.origin === window.location.origin;
        } catch (e) {
            return true;
        }
    }

    function isUnsafeMethod(method) {
        if (!method) return false;
        var m = String(method).toUpperCase();
        return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
    }

    function updateMetaToken(response) {
        try {
            var fresh = response && response.headers && response.headers.get && response.headers.get(HEADER_NAME);
            if (fresh) {
                var meta = document.querySelector('meta[name="csrf-token"]');
                if (meta) meta.setAttribute('content', fresh);
            }
        } catch (e) {
            // ignore
        }
    }

    function attachToken(init, input) {
        var headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        var t = currentToken();
        if (t) {
            headers.set(HEADER_NAME, t);
        }
        init.headers = headers;
        return init;
    }

    var originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
        window.fetch = function(input, init) {
            init = init || {};
            var method = init.method || (input instanceof Request ? input.method : 'GET');
            var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input);
            var sameOrigin = isSameOrigin(url);
            var unsafe = isUnsafeMethod(method);
            var self = this;

            if (unsafe && sameOrigin) {
                attachToken(init, input);
            }

            var promise = originalFetch.call(self, input, init);
            if (!sameOrigin) {
                return promise;
            }

            return promise.then(function(response) {
                updateMetaToken(response);
                if (response.status === 419 && unsafe && !init.__csrfRetried) {
                    init.__csrfRetried = true;
                    attachToken(init, input);
                    return originalFetch.call(self, input, init).then(function(retry) {
                        updateMetaToken(retry);
                        return retry;
                    });
                }
                return response;
            });
        };
    }

    var OriginalXHR = window.XMLHttpRequest;
    if (typeof OriginalXHR === 'function') {
        var open = OriginalXHR.prototype.open;
        var send = OriginalXHR.prototype.send;

        OriginalXHR.prototype.open = function(method, url) {
            this.__csrfMethod = method;
            this.__csrfUrl = url;
            return open.apply(this, arguments);
        };

        OriginalXHR.prototype.send = function() {
            if (isUnsafeMethod(this.__csrfMethod) && isSameOrigin(this.__csrfUrl)) {
                var t = currentToken();
                if (t) {
                    try {
                        this.setRequestHeader(HEADER_NAME, t);
                    } catch (e) {
                        // setRequestHeader throws if the header was already set; ignore.
                    }
                }
            }
            return send.apply(this, arguments);
        };
    }

    function injectFormToken(form) {
        if (!(form instanceof HTMLFormElement)) return;

        var method = (form.getAttribute('method') || 'GET').toUpperCase();
        if (!isUnsafeMethod(method)) return;

        var action = form.getAttribute('action') || window.location.href;
        if (!isSameOrigin(action)) return;

        var t = currentToken();
        if (!t) return;

        var existing = form.querySelector('input[name="' + FIELD_NAME + '"]');
        if (existing) {
            existing.value = t;
            return;
        }

        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = FIELD_NAME;
        input.value = t;
        form.appendChild(input);
    }

    document.addEventListener('submit', function(event) {
        injectFormToken(event.target);
    }, true);

    var originalFormSubmit = HTMLFormElement.prototype.submit;
    if (typeof originalFormSubmit === 'function') {
        HTMLFormElement.prototype.submit = function() {
            injectFormToken(this);
            return originalFormSubmit.apply(this, arguments);
        };
    }
})();