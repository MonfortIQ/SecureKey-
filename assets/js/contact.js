/** Contact-only scheduling, booking feedback, and layout direction. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const form = document.getElementById('contactForm');
  const date = document.getElementById('preferredDate');
  const time = document.getElementById('preferredTime');
  const note = document.getElementById('urgencyNote');
  const emergencyNote = note.innerHTML;
  const feedback = document.getElementById('bookingFeedback');
  const today = new Date();
  date.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  document.getElementById('copyrightYear').textContent = today.getFullYear();

  function updateScheduling() {
    const scheduled = document.getElementById('urgencyStandard').checked;
    form.classList.toggle('scheduled', scheduled);
    date.required = scheduled;
    time.required = scheduled;
    date.disabled = !scheduled;
    time.disabled = !scheduled;
    time.options[0].disabled = scheduled;
    if (scheduled && time.selectedIndex === 0) time.selectedIndex = 1;
    if (!scheduled) time.selectedIndex = 0;
    document.querySelectorAll('.schedule-field').forEach(field => { field.hidden = !scheduled; });
    if (scheduled) note.textContent = "Choose your preferred date and time below. We'll confirm availability with you.";
    else note.innerHTML = emergencyNote;
  }
  form.querySelectorAll('input[name="Service Priority"]').forEach(input => input.addEventListener('change', updateScheduling));
  updateScheduling();

  const textFields = ['fullName', 'addressArea', 'serviceDetails'];
  function validateText(input) {
    input.setCustomValidity(input.value.trim() ? '' : 'Please complete this field.');
  }
  textFields.forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => validateText(input));
  });
  const phone = document.getElementById('phoneNumber');
  function validatePhone() {
    phone.setCustomValidity(phone.value.replace(/\D/g, '').length >= 7 ? '' : 'Please enter a valid phone number.');
  }
  phone.addEventListener('input', validatePhone);
  form.addEventListener('submit', event => {
    textFields.forEach(id => validateText(document.getElementById(id)));
    validatePhone();
    if (!form.checkValidity()) {
      event.preventDefault();
      form.classList.add('was-validated');
      form.querySelector('input:invalid, select:invalid, textarea:invalid')?.focus();
      return;
    }
    // FormSubmit receives the valid form through a normal browser POST.
    // On a deployed site, use the current origin for the absolute thank-you URL.
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      const next = form.querySelector('input[name="_next"]');
      if (next) next.value = new URL('thank-you.html', window.location.href).href;
    }
  });

});
