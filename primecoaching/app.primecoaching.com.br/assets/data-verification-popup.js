function initDataVerificationPopup() {
    const popup = document.getElementById('data-verification-popup');
    if (!popup) return;

    const form = document.getElementById('data-verification-form');
    const documentTypeSelect = document.getElementById('document-type-input');
    const cpfInput = document.getElementById('cpf-input');
    const instagramInput = document.getElementById('instagram-input');
    const emergencyNameInput = document.getElementById('emergency-name-input');
    const emergencyPhoneInput = document.getElementById('emergency-phone-input');

    const translations = {
        successTitle: popup.dataset.successTitle || 'Success!',
        successMessage: popup.dataset.successMessage || 'Your data has been verified and saved successfully.',
        successButton: popup.dataset.successButton || 'Ok',
        errorTitle: popup.dataset.errorTitle || 'Error',
        errorMessage: popup.dataset.errorMessage || 'Error saving data',
        errorServer: popup.dataset.errorServer || 'Error communicating with server',
        errorButton: popup.dataset.errorButton || 'Ok'
    };

    let iti = null;

    if (emergencyPhoneInput && typeof intlTelInput !== 'undefined') {
        iti = intlTelInput(emergencyPhoneInput, {
            preferredCountries: ['br', 'us', 'pt', 'es'],
            separateDialCode: true,
            autoPlaceholder: 'aggressive',
            initialCountry: 'br',
            utilsScript: '/assets/intl-tel-input/utils.js'
        });
    }

    // Document type placeholders - get from data attribute or use defaults
    let documentPlaceholders = {
        'cpf': '000.000.000-00',
        'passport': 'Enter your passport number',
        'dni': '00.000.000',
        'nie': 'X0000000X',
        'rut': '00.000.000-0',
        'curp': 'XXXX000000XXXXXX00',
        'cc': '0000000000',
        'rg': '00.000.000-0',
        'other': 'Enter your document number'
    };

    // Override with translated placeholders if available
    if (popup.dataset.placeholders) {
        try {
            const translatedPlaceholders = JSON.parse(popup.dataset.placeholders);
            documentPlaceholders = { ...documentPlaceholders,
                ...translatedPlaceholders
            };
        } catch (e) {
            console.warn('Failed to parse document placeholders');
        }
    }

    const documentMaxLengths = {
        'cpf': 14,
        'passport': 20,
        'dni': 12,
        'nie': 11,
        'rut': 12,
        'curp': 18,
        'cc': 15,
        'rg': 12,
        'other': 30
    };

    function formatCPF(value) {
        value = value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        return value;
    }

    // Track current document type for input masking
    let currentDocumentType = documentTypeSelect ? documentTypeSelect.value : 'cpf';

    function applyDocumentMask(docType) {
        if (!cpfInput) return;

        currentDocumentType = docType;
        cpfInput.placeholder = documentPlaceholders[docType] || documentPlaceholders['other'];
        cpfInput.maxLength = documentMaxLengths[docType] || 30;

        // Format existing value if CPF
        if (docType === 'cpf' && cpfInput.value) {
            cpfInput.value = formatCPF(cpfInput.value);
        }
    }

    // Initialize document type handling
    if (documentTypeSelect) {
        applyDocumentMask(documentTypeSelect.value);

        documentTypeSelect.addEventListener('change', function(e) {
            cpfInput.value = '';
            applyDocumentMask(e.target.value);
            hideError('cpf-input');
        });
    }

    // Initial format for CPF if selected
    if (cpfInput && cpfInput.value && currentDocumentType === 'cpf') {
        cpfInput.value = formatCPF(cpfInput.value);
    }

    function formatInstagram(value) {
        if (value && !value.startsWith('@')) {
            value = '@' + value;
        }
        value = value.replace(/[^@a-zA-Z0-9._]/g, '');
        return value;
    }

    if (instagramInput && instagramInput.value) {
        instagramInput.value = formatInstagram(instagramInput.value);
    }

    function validateCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');

        if (cpf.length !== 11) {
            return false;
        }

        if (/^(\d)\1+$/.test(cpf)) {
            return false;
        }

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf[i]) * (10 - i);
        }
        let remainder = sum % 11;
        let digit1 = (remainder < 2) ? 0 : 11 - remainder;

        if (parseInt(cpf[9]) !== digit1) {
            return false;
        }

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf[i]) * (11 - i);
        }
        remainder = sum % 11;
        let digit2 = (remainder < 2) ? 0 : 11 - remainder;

        if (parseInt(cpf[10]) !== digit2) {
            return false;
        }

        return true;
    }

    function validateInstagram(instagram) {
        instagram = instagram.replace('@', '');

        if (instagram.length < 1 || instagram.length > 30) {
            return false;
        }

        if (!/^[a-zA-Z0-9._]+$/.test(instagram)) {
            return false;
        }

        if (instagram[0] === '.') {
            return false;
        }

        return true;
    }

    function validatePhone() {
        if (iti) {
            return iti.isValidNumber();
        }

        const phone = emergencyPhoneInput.value.replace(/[^\d+]/g, '');
        return phone.length >= 10 && phone.length <= 20;
    }

    function getFullPhoneNumber() {
        if (iti) {
            return iti.getNumber();
        }
        return emergencyPhoneInput.value;
    }

    function showError(inputId, message) {
        const errorSpan = document.getElementById(inputId + '-error');
        const input = document.getElementById(inputId);

        if (errorSpan) {
            const span = errorSpan.querySelector('span');
            if (span) {
                span.textContent = message;
            }
            errorSpan.classList.remove('hidden');
        }

        if (input) {
            input.classList.remove('border-gray-300', 'focus:ring-primary-500');
            input.classList.add('border-red-500', 'focus:ring-red-500');
        }
    }

    function hideError(inputId) {
        const errorSpan = document.getElementById(inputId + '-error');
        const input = document.getElementById(inputId);

        if (errorSpan) {
            errorSpan.classList.add('hidden');
        }

        if (input) {
            input.classList.remove('border-red-500', 'focus:ring-red-500');
            input.classList.add('border-gray-300', 'focus:ring-primary-500');
        }
    }

    cpfInput.addEventListener('input', function(e) {
        // Apply CPF mask only if document type is CPF
        if (currentDocumentType === 'cpf') {
            e.target.value = formatCPF(e.target.value);
        }
        hideError('cpf-input');
    });

    instagramInput.addEventListener('input', function(e) {
        e.target.value = formatInstagram(e.target.value);
        hideError('instagram-input');
    });

    if (emergencyPhoneInput) {
        emergencyPhoneInput.addEventListener('input', function() {
            hideError('emergency-phone-input');
        });

        emergencyPhoneInput.addEventListener('countrychange', function() {
            hideError('emergency-phone-input');
        });
    }

    emergencyNameInput.addEventListener('input', function() {
        hideError('emergency-name-input');
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        let hasError = false;
        const documentType = documentTypeSelect ? documentTypeSelect.value : 'cpf';

        const cpfValue = cpfInput.value;
        if (!cpfValue) {
            showError('cpf-input', 'Documento é obrigatório');
            hasError = true;
        } else if (documentType === 'cpf' && !validateCPF(cpfValue)) {
            showError('cpf-input', 'CPF inválido');
            hasError = true;
        }

        const instagramValue = instagramInput.value;
        if (!instagramValue) {
            showError('instagram-input', 'Instagram é obrigatório');
            hasError = true;
        } else if (!validateInstagram(instagramValue)) {
            showError('instagram-input', 'Instagram inválido. Use o formato @seu_instagram');
            hasError = true;
        }

        const emergencyNameValue = emergencyNameInput.value.trim();
        if (!emergencyNameValue) {
            showError('emergency-name-input', 'Nome do contato é obrigatório');
            hasError = true;
        }

        if (!emergencyPhoneInput.value) {
            showError('emergency-phone-input', 'Telefone é obrigatório');
            hasError = true;
        } else if (!validatePhone()) {
            showError('emergency-phone-input', 'Telefone inválido');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        const fullPhoneNumber = getFullPhoneNumber();

        const submitBtn = document.getElementById('verify-data-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';

        try {
            const response = await fetch('/verify-user-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    document_type: documentType,
                    cpf: documentType === 'cpf' ? cpfValue.replace(/\D/g, '') : cpfValue,
                    instagram: instagramValue,
                    emergency_contact_name: emergencyNameValue,
                    emergency_contact_number: fullPhoneNumber
                })
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: translations.successTitle,
                    text: translations.successMessage,
                    confirmButtonText: translations.successButton
                }).then(() => {
                    popup.remove();
                });
            } else {
                if (data.errors) {
                    Object.keys(data.errors).forEach(key => {
                        const inputId = key.replace('_', '-') + '-input';
                        showError(inputId, data.errors[key]);
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: translations.errorTitle,
                        text: data.message || translations.errorMessage,
                        confirmButtonText: translations.errorButton
                    });
                }
            }
        } catch (error) {
            console.error('Erro:', error);
            Swal.fire({
                icon: 'error',
                title: translations.errorTitle,
                text: translations.errorServer,
                confirmButtonText: translations.errorButton
            });
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = translations.successButton;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDataVerificationPopup);
} else {
    initDataVerificationPopup();
}