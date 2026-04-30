/**
 * Copy to Clipboard Component
 * Sistema reutilizável para copiar texto para o clipboard com feedback visual
 */

class CopyToClipboard {
    constructor() {
        this.translations = {
            success: 'Copiado para a área de transferência!',
            error: 'Erro ao copiar texto'
        };
        this.init();
    }

    init() {
        // Aguarda o DOM estar carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
    }

    bindEvents() {
        // Delega eventos para todos os botões de copy
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.copy-to-clipboard-btn');
            if (btn) {
                e.preventDefault();
                this.copyText(btn);
            }
        });
    }

    async copyText(button) {
        const text = button.getAttribute('data-copy-text');
        const id = button.getAttribute('data-copy-id');

        if (!text) {
            console.warn('Texto para copiar não encontrado');
            return;
        }

        // Fecha o dropdown após o clique (para dropdowns de ações)
        this.closeDropdown(button);

        try {
            // Tenta usar a API moderna do clipboard
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback para navegadores mais antigos
                this.fallbackCopyText(text);
            }

            this.showSuccess(button);

            // Verifica se há mensagem customizada no botão
            const successMessage = button.getAttribute('data-success-message') || this.translations.success;
            this.showToast(successMessage, 'success');
        } catch (err) {
            console.error('Erro ao copiar texto:', err);

            // Verifica se há mensagem customizada de erro no botão
            const errorMessage = button.getAttribute('data-error-message') || this.translations.error;
            this.showToast(errorMessage, 'error');
        }
    }

    closeDropdown(button) {
        // Fecha o dropdown se o botão estiver dentro de um
        const dropdownMenu = button.closest('.more_actions_dropdown');
        if (dropdownMenu) {
            // Adiciona a classe hidden para esconder o dropdown
            dropdownMenu.classList.add('hidden');

            // Se Flowbite estiver disponível, usa a API para esconder o dropdown
            if (typeof Dropdown !== 'undefined') {
                const dropdownId = dropdownMenu.id;
                const triggerButton = document.querySelector(`[data-dropdown-toggle="${dropdownId}"]`);
                if (triggerButton) {
                    const dropdown = new Dropdown(dropdownMenu, triggerButton);
                    dropdown.hide();
                }
            }
        }
    }

    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
        } catch (err) {
            throw new Error('Fallback copy failed');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    showSuccess(button) {
        // Feedback visual no botão
        const originalClass = button.className;
        button.classList.add('text-primary-700');
        button.classList.remove('text-gray-500');

        // Volta ao estado original após 2 segundos
        setTimeout(() => {
            button.className = originalClass;
        }, 2000);
    }

    showToast(message, type = 'success') {
        // Se SweetAlert2 estiver disponível, usa o toast do SweetAlert
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });

            Toast.fire({
                icon: type,
                title: message
            });
        } else {
            // Fallback para toast simples
            this.showSimpleToast(message, type);
        }
    }

    showSimpleToast(message, type) {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

        toast.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-0`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Animação de entrada
        setTimeout(() => {
            toast.classList.add('opacity-100');
        }, 10);

        // Remove após 2 segundos
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }
}

// Inicializa o componente automaticamente
new CopyToClipboard();