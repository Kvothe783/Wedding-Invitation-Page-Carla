(() => {
  'use strict';

  // Paste your Google Apps Script Web App URL here (see README.md) to send
  // RSVP responses to a Google Sheet. Leave empty to keep responses local
  // to each visitor's browser only.
  const CONFIG = {
    sheetUrl: 'https://script.google.com/macros/s/AKfycbwoW0GjkOf0kDXL9NfRsgOGE1e4X28nOosOXRH3tdJpw7W6aWmblIO5v69yKzdOopfNxA/exec'
  };

  const STORE_KEY = 'faire-part-hugo-carla-rsvp';

  const scroller = document.getElementById('scroller');

  // ---------- Reveal-on-scroll ----------

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.getAttribute('data-delay') || '0', 10);
        setTimeout(() => entry.target.classList.add('is-in'), delay);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  // ---------- Hero scroll indicator ----------

  document.getElementById('scrollNext').addEventListener('click', () => {
    scroller.scrollBy({ top: scroller.clientHeight, behavior: 'smooth' });
  });

  // ---------- RSVP form ----------

  const form = document.getElementById('rsvpForm');
  const sentView = document.getElementById('rsvpSent');
  const confirmationEl = document.getElementById('rsvpConfirmation');
  const editButton = document.getElementById('rsvpEdit');

  const lastNameInput = document.getElementById('lastName');
  const firstNameInput = document.getElementById('firstName');
  const emailInput = document.getElementById('email');
  const pickYesBtn = document.getElementById('pickYes');
  const pickNoBtn = document.getElementById('pickNo');
  const countWrap = document.getElementById('countWrap');
  const countValueEl = document.getElementById('countValue');
  const countDecBtn = document.getElementById('countDec');
  const countIncBtn = document.getElementById('countInc');
  const submitBtn = document.getElementById('rsvpSubmit');
  const errorEl = document.getElementById('rsvpError');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const state = {
    lastName: '',
    firstName: '',
    email: '',
    attending: null, // true | false | null
    count: 2,
    sending: false,
    saved: null
  };

  function setError(message) {
    errorEl.textContent = message || '';
    errorEl.classList.toggle('is-visible', Boolean(message));
  }

  function renderAttendance() {
    pickYesBtn.classList.toggle('is-active', state.attending === true);
    pickNoBtn.classList.toggle('is-active', state.attending === false);
    countWrap.classList.toggle('is-visible', state.attending === true);
  }

  function renderCount() {
    countValueEl.textContent = String(state.count);
  }

  function renderSubmit() {
    submitBtn.textContent = state.sending ? 'Envoi…' : 'Envoyer';
    submitBtn.disabled = state.sending;
  }

  function confirmationText(saved) {
    if (!saved) return '';
    const emailNote = saved.email ? ' Un email de confirmation vous a été envoyé à ' + saved.email + ' (pensez à vérifier vos spams si vous ne le voyez pas).' : '';
    if (saved.presence === 'oui') {
      return 'Nous avons bien noté votre présence' +
        (saved.nombre > 1 ? ' à ' + saved.nombre + '. À très bientôt !' : '. À très bientôt !') + emailNote;
    }
    return 'Nous avons bien reçu votre réponse. Vous nous manquerez.' + emailNote;
  }

  function showSent(saved) {
    confirmationEl.textContent = confirmationText(saved);
    sentView.hidden = false;
    form.hidden = true;
  }

  function showForm() {
    sentView.hidden = true;
    form.hidden = false;
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  async function sendToSheet(payload) {
    const url = CONFIG.sheetUrl.trim();
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  }

  lastNameInput.addEventListener('input', (e) => {
    state.lastName = e.target.value;
    setError('');
  });

  firstNameInput.addEventListener('input', (e) => {
    state.firstName = e.target.value;
    setError('');
  });

  emailInput.addEventListener('input', (e) => {
    state.email = e.target.value;
    setError('');
  });

  pickYesBtn.addEventListener('click', () => {
    state.attending = true;
    setError('');
    renderAttendance();
  });

  pickNoBtn.addEventListener('click', () => {
    state.attending = false;
    setError('');
    renderAttendance();
  });

  countDecBtn.addEventListener('click', () => {
    state.count = Math.max(1, state.count - 1);
    renderCount();
  });

  countIncBtn.addEventListener('click', () => {
    state.count = Math.min(10, state.count + 1);
    renderCount();
  });

  editButton.addEventListener('click', () => {
    const saved = state.saved;
    if (saved) {
      state.lastName = saved.nom;
      state.firstName = saved.prenom;
      state.email = saved.email || state.email;
      state.attending = saved.presence === 'oui';
      state.count = saved.nombre || state.count;
      lastNameInput.value = state.lastName;
      firstNameInput.value = state.firstName;
      emailInput.value = state.email;
      renderAttendance();
      renderCount();
    }
    setError('');
    showForm();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.lastName.trim() || !state.firstName.trim()) {
      setError('Merci d’indiquer votre nom et votre prénom.');
      return;
    }
    if (!EMAIL_RE.test(state.email.trim())) {
      setError('Merci d’indiquer une adresse email valide.');
      return;
    }
    if (state.attending === null) {
      setError('Merci de nous dire si vous serez présent·e.');
      return;
    }

    const payload = {
      nom: state.lastName.trim(),
      prenom: state.firstName.trim(),
      email: state.email.trim(),
      presence: state.attending ? 'oui' : 'non',
      nombre: state.attending ? state.count : 0,
      date: new Date().toISOString()
    };

    state.sending = true;
    setError('');
    renderSubmit();

    try {
      await sendToSheet(payload);
    } catch (e) {
      // Keep the local save even if the remote write fails.
    }

    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch (e) {}

    state.sending = false;
    state.saved = payload;
    renderSubmit();
    showSent(payload);
  });

  // ---------- Init ----------

  const saved = loadSaved();
  if (saved) {
    state.saved = saved;
    showSent(saved);
  } else {
    showForm();
  }
  renderAttendance();
  renderCount();
  renderSubmit();
})();
