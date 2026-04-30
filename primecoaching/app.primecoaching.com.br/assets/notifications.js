$(function() {
    // Objeto para armazenar os tipos de notificações e suas traduções
    let notificationTypes = {};

    // Mapa type -> URL builder (usa target_id). Types sem entrada caem no fallback.
    const notificationLinkBuilders = {
        'webhook_failed': (id) => `/apps/webhooks/${id}/logs`,
    };

    function buildNotificationLink(n) {
        const builder = notificationLinkBuilders[n.type];
        if (builder && n.target_id) {
            return builder(n.target_id);
        }
        if (n.consultoria_id) {
            return `/customers/actives/${n.consultoria_id}/progress`;
        }
        return '#';
    }

    // Função helper para obter o texto traduzido do tipo de notificação
    function getNotificationType(type) {
        return notificationTypes[type] || type.replace(/_/g, ' ');
    }

    function fetchNotifications() {
        // Usa endpoint otimizado que retorna notificações + tipos em uma única requisição
        $.get('/notifications/dropdown?limit=5', function(data) {
            let notifications = data.notifications || [];

            // Atualiza tipos de notificação se retornados
            if (data.types) {
                notificationTypes = data.types;
            }

            // Atualiza o contador de notificações não lidas
            if (data.has_unread) {
                $('#notification-badge').removeClass('hidden');
            } else {
                $('#notification-badge').addClass('hidden').text('');
            }

            let html = '';
            if (notifications.length === 0) {
                html = '<li class="p-4 text-gray-500 text-center">Sem notificações.</li>';
            } else {
                notifications.forEach(function(n) {
                    const typeText = getNotificationType(n.type);

                    // Cálculo do tempo relativo
                    const date = new Date(n.created_at);
                    const now = new Date();
                    const diffMs = now - date;
                    const diffMins = Math.round(diffMs / 60000);
                    const diffHours = Math.round(diffMs / 3600000);
                    const diffDays = Math.round(diffMs / 86400000);

                    let timeText;
                    if (diffMins < 1) {
                        timeText = 'agora mesmo';
                    } else if (diffMins < 60) {
                        timeText = `há ${diffMins} min`;
                    } else if (diffHours < 24) {
                        timeText = `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                    } else if (diffDays < 7) {
                        timeText = `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
                    } else {
                        timeText = date.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                    }

                    const readMarker = n.is_read ? '' : '<span class="inline-block flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mr-2"></span>';

                    html += `<li class="p-4 border-b last:border-0 hover:bg-primary-50 hover:text-primary-700 cursor-pointer notification-item ${!n.is_read ? 'bg-blue-50' : ''}" data-id="${n.id}" data-link="${buildNotificationLink(n)}">
                        <div class="flex items-center">
                            ${readMarker}<span class="font-medium">${n.message}</span>
                        </div>
                        <div class="flex justify-between text-xs text-gray-400">
                            <span>${typeText}</span>
                            <span>${timeText}</span>
                        </div>
                    </li>`;
                });
            }
            $('#notification-list').html(html);
        });
    }

    // Exibe/oculta dropdown
    $('#notification-bell').on('click', function(e) {
        e.stopPropagation();
        $('#notification-dropdown').toggleClass('hidden');
    });

    // Fecha dropdown ao clicar fora
    $(document).on('click', function() {
        $('#notification-dropdown').addClass('hidden');
    });

    // Marcar como lida e redirecionar ao clicar na notificação
    $('#notification-list').on('click', '.notification-item', function(e) {
        e.preventDefault();
        const id = $(this).data('id');
        const link = $(this).data('link');

        // Fecha o dropdown
        $('#notification-dropdown').addClass('hidden');

        $.post(`/notifications/${id}/read`, function() {
            // Usa o navegador SPA se disponível
            if (window.spaNavigator && typeof window.spaNavigator.navigate === 'function') {
                window.spaNavigator.navigate(link);
            } else {
                window.location.href = link;
            }
        });
    });

    // Inicialização - única chamada ao invés de duas
    fetchNotifications();

    // Configurar atualização periódica (120s, pausa em tabs inativas)
    setInterval(function() {
        if (!document.hidden) {
            fetchNotifications();
        }
    }, 120000);
});