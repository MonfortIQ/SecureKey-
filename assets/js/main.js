/** Shared frontend interactions. Account forms are demos; FormSubmit handles configured mailing forms. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  // Submit FormSubmit forms into a hidden frame so the visitor stays on the
  // current page and receives an in-page success message. A normal top-level
  // POST would navigate to FormSubmit's hosted confirmation page.
  const formSubmitForms = [...document.querySelectorAll('form[action^="https://formsubmit.co/"]')];
  function getFormFeedback(form) {
    if (form.id === 'contactForm') return document.getElementById('bookingFeedback');
    let feedback = form.querySelector('.form-alert');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.className = 'alert alert-info form-alert mt-3 mb-0';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      form.append(feedback);
    }
    return feedback;
  }
  function showFormFeedback(form, message, type = 'info') {
    const feedback = getFormFeedback(form);
    if (!feedback) return;
    feedback.hidden = false;
    feedback.className = form.id === 'contactForm'
      ? 'booking-feedback alert-' + type
      : `alert alert-${type} form-alert mt-3 mb-0`;
    feedback.textContent = message;
  }
  formSubmitForms.forEach((form, index) => {
    if (window.location.protocol === 'file:') {
      form.addEventListener('submit', event => {
        if (!form.checkValidity()) return;
        event.preventDefault();
        showFormFeedback(form, 'Preview mode: open this site through a local web server or deployed URL to send this form.');
      });
      return;
    }
    const frame = document.createElement('iframe');
    frame.name = `formsubmit-response-${index}`;
    frame.title = 'Form submission response';
    frame.hidden = true;
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    document.body.append(frame);
    form.target = frame.name;
    let submitted = false;
    let fallbackTimer;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonMarkup = submitButton?.innerHTML;
    function completeSubmission() {
      if (!submitted) return;
      submitted = false;
      clearTimeout(fallbackTimer);
      form.reset();
      if (form.id === 'contactForm') {
        form.querySelector('#urgencyEmergency')?.dispatchEvent(new Event('change', {bubbles: true}));
      }
      form.classList.remove('was-validated');
      form.querySelectorAll('.is-valid, .is-invalid').forEach(control => {
        control.classList.remove('is-valid', 'is-invalid');
      });
      showFormFeedback(form, 'Thanks! Your form was submitted successfully.', 'success');
      if (submitButton) {
        submitButton.disabled = false;
        if (originalButtonMarkup !== undefined) submitButton.innerHTML = originalButtonMarkup;
      }
    }
    frame.addEventListener('load', completeSubmission);
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) return;
      if (submitted) {
        event.preventDefault();
        return;
      }
      submitted = true;
      showFormFeedback(form, 'Sending your form…');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending…';
      }
      // Some browsers suppress iframe load events for cross-origin responses;
      // provide a conservative fallback while preserving the real POST.
      fallbackTimer = setTimeout(completeSubmission, 4000);
    });
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    backToTop.setAttribute('aria-label', 'Back to top');
    const update = () => backToTop.classList.toggle('active', window.scrollY > 350);
    window.addEventListener('scroll', update, {passive:true});
    update();
    backToTop.addEventListener('click', () => window.scrollTo({top:0,behavior:reducedMotion?'instant':'smooth'}));
  }
  document.querySelectorAll('.counter-val').forEach(counter => {
    const value = Number(counter.dataset.count);
    if (!Number.isFinite(value)) return;
    if (reducedMotion || !('IntersectionObserver' in window)) { counter.textContent = value.toLocaleString(); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      let start;
      function frame(now) {
        start ??= now;
        const progress = Math.min((now - start) / 900, 1);
        counter.textContent = Math.round(value * progress).toLocaleString();
        if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }, {threshold:.2});
    observer.observe(counter);
  });

  const search = document.getElementById('blogSearchInput');
  const posts = [...document.querySelectorAll('.blog-article-item')];
  const filters = [...document.querySelectorAll('.blog-category-filter')];
  const noResults = document.getElementById('blogNoResults');
  if (posts.length) {
    const params = new URLSearchParams(location.search);
    if (search) search.value = params.get('q') || '';
    let category = params.get('category') || 'all';
    if (!filters.some(button => button.dataset.category === category)) category = 'all';
    function filterPosts() {
      const query = search?.value.trim().toLowerCase() || '';
      let visible = 0;
      posts.forEach(post => {
        const match = (!query || (post.dataset.title || '').toLowerCase().includes(query)) && (category === 'all' || post.dataset.category === category);
        post.hidden = !match;
        if (match) visible++;
      });
      filters.forEach(button => {
        const selected = button.dataset.category === category;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      if (noResults) { noResults.hidden = visible > 0; noResults.style.display = visible ? 'none' : 'block'; }
      const count = document.getElementById('blogResultsCount');
      if (count) count.textContent = `${visible} ${visible === 1 ? 'article' : 'articles'}`;
      const next = new URL(location.href);
      search?.value.trim() ? next.searchParams.set('q', search.value.trim()) : next.searchParams.delete('q');
      category !== 'all' ? next.searchParams.set('category', category) : next.searchParams.delete('category');
      history.replaceState(null, '', next);
    }
    search?.addEventListener('input', filterPosts);
    filters.forEach(button => button.addEventListener('click', event => { event.preventDefault(); category = button.dataset.category; filterPosts(); }));
    filterPosts();
  }
  // The sharing links use the currently viewed article, never a fixed demo URL.
  const shareURL = encodeURIComponent(location.href);
  const title = encodeURIComponent(document.title);
  document.querySelectorAll('a[aria-label^="Share on"]').forEach(link => {
    const network = link.getAttribute('aria-label');
    if (network.includes('Facebook')) link.href = `https://www.facebook.com/sharer/sharer.php?u=${shareURL}`;
    if (network.includes('Twitter')) link.href = `https://twitter.com/intent/tweet?url=${shareURL}&text=${title}`;
    if (network.includes('LinkedIn')) link.href = `https://www.linkedin.com/sharing/share-offsite/?url=${shareURL}`;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
  });
  document.querySelectorAll('[data-copy-link]').forEach(button => button.addEventListener('click', async () => {
    const status = document.querySelector('[data-share-status]');
    try { await navigator.clipboard.writeText(location.href); status.textContent = 'Article link copied.'; }
    catch { status.textContent = 'Copy the article URL from your browser address bar.'; }
  }));
  document.querySelectorAll('.compare-toggle-btn').forEach(button => button.addEventListener('click', () => {
    const smart = button.dataset.mode === 'smart';
    document.querySelectorAll('.compare-toggle-btn').forEach(item => { const selected = item === button; item.classList.toggle('active', selected); item.setAttribute('aria-pressed', String(selected)); });
    document.getElementById('viewTraditional')?.classList.toggle('d-none', smart);
    document.getElementById('viewSmart')?.classList.toggle('d-none', !smart);
  }));
  const countdown = document.getElementById('countdownTimer');
  if (countdown) {
    const target = Date.parse(countdown.dataset.launchDate);
    function updateCountdown() {
      if (!Number.isFinite(target)) return;
      const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const values = [Math.floor(seconds/86400), Math.floor(seconds/3600)%24, Math.floor(seconds/60)%60, seconds%60];
      ['countDays','countHours','countMins','countSecs'].forEach((id,index) => { document.getElementById(id).textContent = String(values[index]).padStart(2,'0'); });
    }
    updateCountdown();
    const timer = setInterval(updateCountdown,1000);
    window.addEventListener('pagehide', () => clearInterval(timer), {once:true});
  }
  const copyright = document.getElementById('copyrightYear');
  if (copyright) copyright.textContent = new Date().getFullYear();
  document.querySelectorAll('[data-testimonial-slider]').forEach(slider => {
    const track = slider.querySelector('.testimonial-track');
    const slides = [...slider.querySelectorAll('.testimonial-slide')];
    const status = slider.querySelector('.slider-status');
    let index = 0;
    function show(next) {
      index = (next + slides.length) % slides.length;
      const rtl = document.documentElement.dir === 'rtl';
      track.scrollTo({left:(rtl ? -1 : 1) * index * track.clientWidth,behavior:reducedMotion?'instant':'smooth'});
      status.textContent = `Story ${index + 1} of ${slides.length}`;
    }
    slider.querySelector('[data-slide-next]').addEventListener('click', () => show(index + 1));
    slider.querySelector('[data-slide-prev]').addEventListener('click', () => show(index - 1));
    window.addEventListener('resize', () => show(index));
    new MutationObserver(() => show(index)).observe(document.documentElement,{attributes:true,attributeFilter:['dir']});
  });
});
