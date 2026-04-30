$(document).ready(function() {
    $('.sub-btn').click(function() {
        const sidebar = document.getElementById('main-sidebar');

        // Se a sidebar está colapsada, expandir primeiro
        if (sidebar && sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
            localStorage.setItem('sidebar_collapsed', 'false');

            // Forçar reflow para garantir que o Safari aplica a nova largura
            void sidebar.offsetWidth;

            // Dispara evento para notificar outras partes do sistema
            window.dispatchEvent(new CustomEvent('sidebarToggled', {
                detail: {
                    collapsed: false
                }
            }));

            // Aguardar a transição terminar antes de abrir o submenu
            setTimeout(() => {
                $(this).next('.sub-menu').slideDown();
                $(this).find('.dropdown').addClass('rotate');
            }, 350);
        } else {
            // Comportamento normal - toggle do submenu
            $(this).next('.sub-menu').slideToggle();
            $(this).find('.dropdown').toggleClass('rotate');
        }
    });

    function shouldUseMobileBehavior() {
        return window.innerWidth <= 1024;
    }

    function setupSidebarEvents() {
        $(document).off('click', '#mobile-sidebar-btn');
        $('.menu-btn').off('click');
        $('#sidebar-close-btn-mobile, #sidebar-close-btn-desktop').off('click');
        $(document).off('click.sidebar');

        if (shouldUseMobileBehavior()) {
            $(document).on('click', '#mobile-sidebar-btn', function() {
                $('.side-bar').addClass('active');
            });

            $('#sidebar-close-btn-mobile, #sidebar-close-btn-desktop').click(function() {
                $('.side-bar').removeClass('active');
            });

            $(document).on('click.sidebar', function(e) {
                if (!$(e.target).closest('.side-bar').length &&
                    !$(e.target).closest('#mobile-sidebar-btn').length &&
                    $('.side-bar').hasClass('active')) {
                    $('.side-bar').removeClass('active');
                }
            });
        } else {
            $('.menu-btn').click(function() {
                $('.side-bar').addClass('active');
                $('.menu-btn').css("visibility", "hidden");
            });

            $('#sidebar-close-btn-desktop').click(function() {
                $('.side-bar').removeClass('active');
                $('.menu-btn').css("visibility", "visible");
            });
        }
    }

    setupSidebarEvents();

    $(window).resize(function() {
        setupSidebarEvents();
    });

    $(document).on('click', '#mobile-search-close', function() {
        $('#mobile-search-modal').addClass('hidden');
    });

    $(document).on('click', '#mobile-search-modal', function(e) {
        if (e.target === this) {
            $(this).addClass('hidden');
        }
    });

    $(document).keydown(function(e) {
        if (e.key === 'Escape') {
            $('#mobile-search-modal').addClass('hidden');
        }
    });

    $(document).on('input', '#mobile-search-input', function() {
        const query = $(this).val().trim();
        const resultsContainer = $('#mobile-search-results');

        if (query.length === 0) {
            showQuickSuggestions();
            return;
        }

        if (query.length < 2) {
            resultsContainer.html('<p class="text-gray-500 text-center py-8">Digite pelo menos 2 caracteres para buscar</p>');
            return;
        }

        resultsContainer.html('<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-blue-500 text-xl"></i><p class="text-gray-500 mt-2">Buscando...</p></div>');

        performSearch(query);
    });

    setTimeout(function() {
        const resultsContainer = $('#mobile-search-results');
        if (resultsContainer.length && resultsContainer.html().trim() === '') {
            resultsContainer.html('<div class="text-gray-500 text-center py-8"><i class="fas fa-search text-4xl mb-4 opacity-50"></i><p>Digite pelo menos 2 caracteres para buscar</p></div>');
        }
    }, 500);
});

$(document).on('click', '#mobile-search-close', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeSearchModal();
});

$(document).on('click', '#mobile-search-modal', function(e) {
    if (e.target.id === 'mobile-search-modal') {
        e.preventDefault();
        closeSearchModal();
    }
});

$(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSearchModal();
    }
});

$(document).on('focus', '#mobile-search-input', function() {
    if ($(this).val().trim() === '') {
        showQuickSuggestions();
    }
});

let searchTimeout;

$(document).on('input', '#mobile-search-input', function() {
    const query = $(this).val().trim();
    const resultsContainer = $('#mobile-search-results');

    clearTimeout(searchTimeout);

    if (query.length === 0) {
        showQuickSuggestions();
        return;
    }

    if (query.length < 2) {
        resultsContainer.html('<p>Digite pelo menos 2 caracteres para buscar</p>');
        return;
    }

    searchTimeout = setTimeout(function() {
        showSearchLoading();
        performSearch(query);
    }, 300);
});

$(document).on('click', '.search-result-item', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const url = $(this).data('url');
    if (url) {
        closeSearchModal();
        if (window.spaNavigator && window.spaNavigator.shouldUseSPA(url)) {
            window.spaNavigator.navigate(url);
        } else {
            window.location.href = url;
        }
    }
});

function showQuickSuggestions() {
    $.get('/api/search/suggestions')
        .done(function(response) {
            if (response.success && response.data) {
                renderSearchResults(response.data, true);
            }
        })
        .fail(function() {
            $('#mobile-search-results').html('<p class="text-gray-500 text-center py-8">Erro ao carregar sugestões</p>');
        });
}

function performSearch(query) {
    $.get('/api/search', {
            q: query,
            limit: 10
        })
        .done(function(response) {
            if (response.success) {
                if (response.data && response.data.length > 0) {
                    renderSearchResults(response.data, false);
                } else {
                    $('#mobile-search-results').html('<p class="text-gray-500 text-center py-8">Nenhum resultado encontrado</p>');
                }
            } else {
                $('#mobile-search-results').html('<p class="text-red-500 text-center py-8">' + (response.message || 'Erro na busca') + '</p>');
            }
        })
        .fail(function() {
            $('#mobile-search-results').html('<p class="text-red-500 text-center py-8">Erro na busca. Tente novamente.</p>');
        });
}

function renderSearchResults(results, isQuickSuggestion = false) {
    const resultsContainer = $('#mobile-search-results');
    let html = '';

    if (results.length === 0) {
        html = '<p>Nenhum resultado encontrado</p>';
        resultsContainer.html(html);
        return;
    }

    if (results.length === 0) {
        html += '<div class="search-results-section">';
        html += '<div class="search-results-title">Acesso Rápido</div>';
    }

    results.forEach(function(result) {
        const isCustomer = result.type === 'customer';

        html += '<div class="search-result-item" data-url="' + result.url + '">';

        if (isCustomer && result.avatar) {
            html += '<img src="' + result.avatar + '" class="search-result-avatar" alt="Avatar">';
        } else {
            const iconClass = result.icon || 'fas fa-link';
            html += '<div class="search-result-icon">';
            html += '<i class="' + iconClass + '"></i>';
            html += '</div>';
        }

        html += '<div class="search-result-content">';
        html += '<div class="search-result-title">' + result.title + '</div>';

        if (result.description) {
            html += '<div class="search-result-description">' + result.description + '</div>';
        }

        if (result.category) {
            html += '<div class="search-result-meta">';
            html += '<span class="search-result-category">' + result.category + '</span>';
            html += '</div>';
        }

        html += '</div>';

        html += '<i class="fas fa-chevron-right search-result-arrow"></i>';
        html += '</div>';
    });

    if (isQuickSuggestion) {
        html += '</div>';
    }

    resultsContainer.html(html);
}

function showSearchLoading() {
    const resultsContainer = $('#mobile-search-results');
    const html = '<div class="search-loading">' +
        '<i class="fas fa-spinner"></i>' +
        '<p>Buscando...</p>' +
        '</div>';
    resultsContainer.html(html);
}

$(document).on('click', '#mobile-search-btn', function(e) {
    e.preventDefault();
    openSearchModal();
});

$(document).on('click', '#desktop-search-btn', function(e) {
    e.preventDefault();
    openSearchModal();
});

function openSearchModal() {
    const modal = $('#mobile-search-modal');
    const input = $('#mobile-search-input');

    if (modal.length && input.length) {
        modal.removeClass('hidden').show();
        setTimeout(() => {
            input.focus();
            if (input.val().trim() === '') {
                showQuickSuggestions();
            }
        }, 100);
    }
}

function closeSearchModal() {
    const modal = $('#mobile-search-modal');
    const input = $('#mobile-search-input');
    const resultsContainer = $('#mobile-search-results');

    if (modal.length) {
        modal.addClass('hidden');
        if (input.length) {
            input.val('').blur();
        }
        if (resultsContainer.length) {
            resultsContainer.html('<div class="text-gray-500 text-center py-8"><i class="fas fa-search text-4xl mb-4 opacity-50"></i><p>Digite pelo menos 2 caracteres para buscar</p></div>');
        }
    }
}