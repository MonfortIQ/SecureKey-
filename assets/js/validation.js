/** HTML5 validation and honest feedback for the template's frontend-only forms. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const demoMessages = {
    loginForm: 'Your details passed validation. This is a login UI demo; no sign-in has taken place.',
    registerForm: 'Your details passed validation. This is a registration UI demo; no account has been created.',
    forgotPasswordForm: 'Your email passed validation. Password recovery requires an authentication service; no email was sent.',
    notificationForm: 'Your email passed validation. Connect an email service to enable launch notifications.',
    newsletterForm: 'Your email passed validation. Connect an email service to enable subscriptions.'
  };
  document.querySelectorAll('.needs-validation').forEach(form => {
    if (form.id === 'contactForm') return; // Scheduling and endpoint validation are handled in contact.js.
    function validateFields() {
      const password = form.querySelector('input[name="password"]');
      const confirmation = form.querySelector('input[name="confirm_password"]');
      if (password && confirmation) confirmation.setCustomValidity(password.value === confirmation.value ? '' : 'Passwords must match.');
      form.querySelectorAll('input[required][type="text"], textarea[required]').forEach(input => input.setCustomValidity(input.value.trim() ? '' : 'Please complete this field.'));
      form.querySelectorAll('input[type="tel"]').forEach(input => input.setCustomValidity(!input.required && !input.value || input.value.replace(/\D/g, '').length >= 7 ? '' : 'Please enter a valid phone number.'));
    }
    form.addEventListener('input', validateFields);
    form.addEventListener('submit', event => {
      validateFields();
      form.classList.add('was-validated');
      if (!form.checkValidity()) {
        event.preventDefault();
        form.querySelector('input:invalid, select:invalid, textarea:invalid')?.focus();
        return;
      }
      const message = demoMessages[form.id] || (form.classList.contains('newsletter-form') ? demoMessages.newsletterForm : null);
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
