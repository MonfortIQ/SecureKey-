/** Shared HTML5 validation and honest feedback for the template's frontend-only forms. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const demoMessages = {
    loginForm: 'Your details passed validation. This is a login UI demo; no sign-in has taken place.',
    registerForm: 'Your details passed validation. This is a registration UI demo; no account has been created.',
    forgotPasswordForm: 'Your email passed validation. Password recovery requires an authentication service; no email was sent.',
  };
  const phoneCharacters = /^[0-9+().\s-]+$/;

  function isValidPhone(value, required) {
    const trimmed = value.trim();
    if (!trimmed) return !required;
    const digits = trimmed.replace(/\D/g, '');
    return phoneCharacters.test(trimmed) && digits.length >= 7 && digits.length <= 15;
  }

  document.querySelectorAll('.needs-validation').forEach(form => {
    const phoneInputs = [...form.querySelectorAll('input[type="tel"]')];

    phoneInputs.forEach(input => {
      // A tel input is not automatically numeric; reject letters as they are entered.
      input.addEventListener('beforeinput', event => {
        if (event.data && /[^0-9+().\s-]/.test(event.data)) event.preventDefault();
      });
      input.addEventListener('input', () => {
        const cleaned = input.value.replace(/[^0-9+().\s-]/g, '');
        if (cleaned !== input.value) input.value = cleaned;
      });
    });

    function validateFields() {
      const password = form.querySelector('input[name="password"]');
      const confirmation = form.querySelector('input[name="confirm_password"]');
      if (password && confirmation) {
        confirmation.setCustomValidity(password.value === confirmation.value ? '' : 'Passwords must match.');
      }

      form.querySelectorAll('input[required][type="text"], textarea[required]').forEach(input => {
        input.setCustomValidity(input.value.trim() ? '' : 'Please complete this field.');
      });

      phoneInputs.forEach(input => {
        input.setCustomValidity(isValidPhone(input.value, input.required) ? '' : 'Please enter a valid phone number using digits only plus phone punctuation.');
      });
    }

    form.addEventListener('input', validateFields);
    form.addEventListener('change', validateFields);
    form.addEventListener('submit', event => {
      validateFields();
      form.classList.add('was-validated');
      if (!form.checkValidity()) {
        event.preventDefault();
        form.querySelector('input:invalid, select:invalid, textarea:invalid')?.focus();
        return;
      }
      const message = demoMessages[form.id] || null;
      if (!message) return;
      event.preventDefault();
      let feedback = form.querySelector('.form-alert');
      if (!feedback) {
        feedback = document.createElement('p');
        feedback.className = 'alert alert-info form-alert mt-3 mb-0';
        feedback.setAttribute('role', 'status');
        form.append(feedback);
      }
      feedback.textContent = message;
    });
  });
});
