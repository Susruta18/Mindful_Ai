/* =============================================
   MindfulAI – app.js
   Real-Time Emotion Detection, Panic Mode, Music, Student Hub
   ============================================= */

'use strict';

/* ─────────────────────────────────────────────
   1.  UTILITIES & UI
───────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const todayStr = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const getLocalDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

window.showToast = function (msgOrOpts, typeParam = 'info', durationParam = 2500) {
  let opts = {};
  if (typeof msgOrOpts === 'string') {
    opts = { msg: msgOrOpts, type: typeParam, duration: durationParam };
  } else {
    opts = msgOrOpts || {};
  }
  const { title = '', msg = '', type = 'info', duration = 2500 } = opts;

  const ICON = { success: '✅', error: '❌', info: '💙', warn: '⚠️' };
  const container = document.getElementById('toastContainer');

  if (!container) {
    // Minimal fallback
    let t = document.querySelector('.toast-fallback');
    if (!t) { t = document.createElement('div'); t.className = 'toast-fallback toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), duration);
    return;
  }

  // Enforce max 4 toasts visible
  const existing = container.querySelectorAll('.toast:not(.hide)');
  if (existing.length >= 4) {
    if (typeof dismissToast === 'function') dismissToast(existing[0]);
  }

  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <div class="toast-icon-badge">${ICON[type] || 'ℹ️'}</div>
    <div class="toast-content-area">
      <div class="toast-header">
        <span class="toast-title">${title || _toastDefaultTitle(type)}</span>
        <button class="toast-close" onclick="dismissToast(this.closest('.toast'))" aria-label="Close">✕</button>
      </div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    </div>
  `;
  container.appendChild(t);
  // Animate in on next frame
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  // Set progress bar duration via CSS variable
  const progress = t.querySelector('.toast-progress');
  if (progress) progress.style.setProperty('--dur', duration + 'ms');
  setTimeout(() => { if (typeof dismissToast === 'function') dismissToast(t); }, duration);
};

function dismissToast(el) {
  if (!el) return;
  el.classList.add('hide');
  setTimeout(() => el.remove(), 500);
}

function _toastDefaultTitle(type) {
  return { success: 'Done!', error: 'Oops!', info: 'Info', warn: 'Heads up' }[type] || 'Notice';
}

// Expose alias if any code calls showToast without window prefix
const showToast = window.showToast;

/* ─────────────────────────────────────────────
   SIDE POP-UP NOTIFICATION ENGINE
───────────────────────────────────────────── */
const SideNotif = (() => {
  let queue = [];
  let isShowing = false;
  const container = () => document.getElementById('sideNotifContainer');

  const MESSAGES = {
    chat: [
      { icon: '🧠', title: 'AI is listening', msg: 'Express yourself freely — no judgement here.', color: '' },
      { icon: '💬', title: 'You\'re not alone', msg: 'Every word you share helps MindfulAI understand you better.', color: '' },
      { icon: '✨', title: 'Safe space activated', msg: 'This conversation is private and just for you.', color: '' },
    ],
    mood: [
      { icon: '🌡️', title: 'Mood Check-In', msg: 'Tracking your mood daily improves emotional awareness by 40%.', color: 'accent' },
      { icon: '📊', title: 'Mood Analytics', msg: 'Your patterns are being recorded for your weekly mood report.', color: 'accent' },
      { icon: '💡', title: 'Did you know?', msg: 'Naming your emotions reduces their intensity. Keep going!', color: 'accent' },
    ],
    journal: [
      { icon: '📓', title: 'Journaling detected', msg: 'Writing improves mental clarity. You\'re doing great!', color: 'pink' },
      { icon: '🖊️', title: 'Express freely', msg: 'Your entries are private and synced securely to the cloud.', color: 'pink' },
      { icon: '🌙', title: 'Evening reflection?', msg: 'Journaling before bed improves sleep quality.', color: 'pink' },
    ],
    breathe: [
      { icon: '🌬️', title: 'Breathe with me', msg: 'Deep breathing activates your parasympathetic nervous system.', color: 'accent' },
      { icon: '🧘', title: 'Stress relief', msg: 'Just 2 minutes of box breathing can reduce cortisol levels.', color: 'accent' },
    ],
    music: [
      { icon: '🎵', title: 'Music Therapy', msg: 'The right music can shift your mood in under 60 seconds.', color: '' },
      { icon: '🎧', title: 'Focus mode', msg: 'Lo-fi beats can improve focus by reducing mind-wandering.', color: '' },
    ],
    student: [
      { icon: '📚', title: 'Student mode', msg: 'Use the Pomodoro timer for maximum study efficiency!', color: 'warn' },
      { icon: '🧠', title: 'Brain break tip', msg: 'Take a 5-min break every 25 min to keep your brain sharp.', color: 'warn' },
    ],
    search: [
      { icon: '🔍', title: 'Searching...', msg: 'Find your thoughts, moods, and entries all in one place.', color: '' },
      { icon: '🗂️', title: 'Filter applied', msg: 'Narrow down your entries to find exactly what you need.', color: '' },
    ],
    login: [
      { icon: '🔐', title: 'Secure session', msg: 'Your data is encrypted and synced to MongoDB Atlas.', color: '' },
      { icon: '👤', title: 'Welcome back!', msg: 'Your personal wellness data has been loaded from the cloud.', color: 'accent' },
    ],
    logout: [
      { icon: '👋', title: 'Take care!', msg: 'Your session has been safely closed. Come back soon!', color: '' },
    ],
    panic: [
      { icon: '🆘', title: 'Help is near', msg: 'Breathe. You are safe. Crisis resources are loading now.', color: 'warn' },
    ],
    generic: [
      { icon: '✨', title: 'Tip of the moment', msg: 'Consistency is the key to lasting mental wellness.', color: '' },
      { icon: '🌟', title: 'Keep going!', msg: 'Small daily actions create massive long-term change.', color: '' },
      { icon: '💚', title: 'You matter', msg: 'Taking care of your mental health is an act of courage.', color: 'accent' },
      { icon: '🌊', title: 'Flow state', msg: 'MindfulAI adapts to your emotional state in real time.', color: '' },
    ],
  };

  function pick(category) {
    const pool = MESSAGES[category] || MESSAGES.generic;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function show(category) {
    const data = pick(category);
    const c = container();
    if (!c) return;

    const el = document.createElement('div');
    el.className = `side-notif ${data.color || ''}`;
    el.innerHTML = `
      <span class="notif-icon">${data.icon}</span>
      <div class="notif-title">${data.title}</div>
      <div class="notif-msg">${data.msg}</div>
      <div class="notif-progress"></div>
    `;
    c.appendChild(el);
    c.style.right = '20px';

    requestAnimationFrame(() => { el.classList.add('show'); });

    setTimeout(() => {
      el.classList.add('hide');
      el.classList.remove('show');
      setTimeout(() => {
        el.remove();
        if (c.children.length === 0) c.style.right = '-360px';
      }, 450);
    }, 2500);
  }

  return { show };
})();

// ── Hook all interactive events to show side pop-ups ──
document.addEventListener('DOMContentLoaded', () => {
  // Nav link clicks
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const clickedLink = e.currentTarget;
      if (clickedLink.closest('.nav-links')) {
        document.querySelectorAll('.nav-links .nav-link').forEach(l => l.classList.remove('active'));
        clickedLink.classList.add('active');
      }

      const href = clickedLink.getAttribute('href') || '';
      if (href.includes('chat')) SideNotif.show('chat');
      else if (href.includes('mood')) SideNotif.show('mood');
      else if (href.includes('journal')) SideNotif.show('journal');
      else if (href.includes('breathe')) SideNotif.show('breathe');
      else if (href.includes('music')) SideNotif.show('music');
      else if (href.includes('student')) SideNotif.show('student');
      else SideNotif.show('generic');
    });
  });

  // Search/filter inputs
  document.querySelectorAll('input[type="text"], input[type="search"]').forEach(inp => {
    let debounce;
    inp.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => SideNotif.show('search'), 600);
    });
  });

  // Journal input focus
  const journalInput = document.getElementById('journalInput');
  if (journalInput) {
    journalInput.addEventListener('focus', () => SideNotif.show('journal'));
  }

  // Chat input focus
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('focus', () => SideNotif.show('chat'));
  }

  // Mood emoji buttons
  document.querySelectorAll('.mood-emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => SideNotif.show('mood'));
  });

  // Breathe section buttons
  document.querySelectorAll('#breathe button, .breathe-btn, .technique-btn').forEach(btn => {
    btn.addEventListener('click', () => SideNotif.show('breathe'));
  });

  // Music section buttons
  document.querySelectorAll('#music button, .music-btn, .track-card').forEach(btn => {
    btn.addEventListener('click', () => SideNotif.show('music'));
  });

  // Panic button
  const panicBtn = document.getElementById('panicNavBtn');
  if (panicBtn) panicBtn.addEventListener('click', () => SideNotif.show('panic'));
});

// Expose SideNotif globally for use in auth / logout
window.SideNotif = SideNotif;

window.scrollToSection = function (id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// --- Authentication Engine ---
let currentUserEmail = null;
let isAuthModeLogin = true;

window.toggleAuthMode = function () {
  isAuthModeLogin = !isAuthModeLogin;
  $('authTitle').innerText = isAuthModeLogin ? "Welcome Back" : "Create Account";
  $('authSubtitle').innerText = isAuthModeLogin ? "Your safe space awaits" : "Start your mindfulness journey";
  $('authSubmitBtn').innerText = isAuthModeLogin ? "Sign In" : "Sign Up";
  $('authSwitchText').innerHTML = isAuthModeLogin ?
    `Don't have an account? <a href="#" onclick="toggleAuthMode(); return false;">Sign up here</a>` :
    `Already have an account? <a href="#" onclick="toggleAuthMode(); return false;">Sign in here</a>`;
  $('pwdHelp').style.display = isAuthModeLogin ? 'none' : 'block';

  // Reset form
  $('email').value = '';
  $('password').value = '';
};

window.handleAuth = async function (event) {
  event.preventDefault();
  const email = $('email').value.trim();
  const pwd = $('password').value;

  if (!email || !pwd) {
    showToast("Please fill in all fields", "warn");
    return;
  }

  if (!isAuthModeLogin) {
    // Password validation for signup
    const pwdRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\\/?]).{8,}$/;
    if (!pwdRegex.test(pwd)) {
      showToast("Password must be 8+ chars with uppercase, lowercase, number, and special character", "warn");
      return;
    }
  }

  try {
    $('authSubmitBtn').disabled = true;
    $('authSubmitBtn').innerHTML = isAuthModeLogin ? '<span>Signing in...</span>' : '<span>Creating account...</span>';

    const endpoint = isAuthModeLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = { email, password: pwd };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    $('authSubmitBtn').disabled = false;
    $('authSubmitBtn').innerHTML = isAuthModeLogin ? 'Sign In' : 'Sign Up';

    if (!response.ok) {
      showToast(data.error || "Authentication failed", "error");
      return;
    }

    if (data.token) localStorage.setItem('mindful_jwt', data.token);

    showToast(isAuthModeLogin ? "Welcome back! 👋" : "Account created successfully! 🎉", "success");
    SideNotif.show('login');

    // Login successful
    currentUserEmail = email;
    updateNavbarUser(email);
    $('appLoginOverlay').classList.add('hidden');
    $('emergencyContactOverlay').classList.remove('hidden');

    // Pull full state from Database
    await window.pullStateFromAtlas();

  } catch (err) {
    $('authSubmitBtn').disabled = false;
    $('authSubmitBtn').innerHTML = isAuthModeLogin ? 'Sign In' : 'Sign Up';
    showToast("Connection error. Check if server is running.", "error");
    console.error(err);
  }
};

    // Google Sign-In SDK Callback
    window.googleSignInCallback = async function (response) {
      try {
        showToast("Authenticating with Google OAuth...", "info");

        // Pass the real Google ID token to backend for verification and user sync
        const res = await fetch('/api/auth/google-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ googleToken: response.credential })
        });

        const data = await res.json();

        if (res.ok && data.token) {
          showToast(`Welcome! 👋`, "success");

          // Store the real JWT from the backend
          localStorage.setItem('mindful_jwt', data.token);
          window.currentUserEmail = data.user.email;

          if (typeof updateNavbarUser === 'function') updateNavbarUser(data.user.email);

          const appOverlay = document.getElementById('appLoginOverlay');
          const ecOverlay = document.getElementById('emergencyContactOverlay');

          if (appOverlay) appOverlay.classList.add('hidden');
          if (ecOverlay) ecOverlay.classList.remove('hidden');

          if (typeof window.pullStateFromAtlas === 'function') {
            await window.pullStateFromAtlas();
          }
        } else {
          throw new Error(data.error || "Google Sign-In failed on server");
        }
      } catch (err) {
        console.error('Google Sign-In error:', err);
        showToast("Google Sign-In failed. Please try again.", "error");
      }
    };

    // Apple Sign-In Handler
    window.handleAppleSignIn = function () {
      showToast("Apple Sign-In coming soon! Use email/password for now.", "info");
    };

    // --- Navbar User Profile Chip ---
    window.updateNavbarUser = function (email) {
      const chip = document.getElementById('userProfileChip');
      const avatar = document.getElementById('userAvatar');
      const name = document.getElementById('userDisplayName');
      const signInLink = document.getElementById('signInNavLink');

      // Mobile elements
      const mobChip = document.getElementById('mobileUserProfile');
      const mobAvatar = document.getElementById('mobileUserAvatar');
      const mobName = document.getElementById('mobileUserDisplayName');
      const mobSignInLink = document.getElementById('mobileSignInLink');

      if (!chip && !mobChip) return;

      // Derive initials from email
      const initials = email.split('@')[0].slice(0, 2).toUpperCase();
      const displayName = email.split('@')[0];

      if (avatar) avatar.textContent = initials;
      if (name) name.textContent = displayName;

      if (mobAvatar) mobAvatar.textContent = initials;
      if (mobName) mobName.textContent = displayName;

      if (chip) chip.style.display = 'flex';
      if (signInLink) signInLink.style.display = 'none';

      if (mobChip) mobChip.style.display = 'flex';
      if (mobSignInLink) mobSignInLink.style.display = 'none';
    };

    window.logoutUser = function () {
      currentUserEmail = null;
      localStorage.removeItem('mindful_jwt');

      const chip = document.getElementById('userProfileChip');
      const signInLink = document.getElementById('signInNavLink');
      const mobChip = document.getElementById('mobileUserProfile');
      const mobSignInLink = document.getElementById('mobileSignInLink');

      if (chip) chip.style.display = 'none';
      if (signInLink) signInLink.style.display = '';
      if (mobChip) mobChip.style.display = 'none';
      if (mobSignInLink) mobSignInLink.style.display = 'inline-block';

      // Reset state
      conversationHistory = [
        { role: "system", content: "You are MindfulAI, an empathetic, brief, and supportive AI mental health companion. You must talk and respond fluidly in ANY language the user speaks. Keep responses conversational, warm, and personalized." }
      ];
      moodLogs = [];
      journalEntries = [];

      if (typeof renderMoodAnalytics === 'function') renderMoodAnalytics();
      if (typeof renderJournalEntries === 'function') renderJournalEntries();

      SideNotif.show('logout');
      showToast({ title: 'Signed out', msg: 'Your session has been safely closed. See you soon! 👋', type: 'info', duration: 3500 });

      // Close mobile menu if open
      const mobileMenu = document.getElementById('mobileMenu');
      if (mobileMenu && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
      }

      // Show login overlay again
      document.getElementById('appLoginOverlay')?.classList.remove('hidden');
    };

    window.pullStateFromAtlas = async function () {
      try {
        const token = localStorage.getItem('mindful_jwt');
        const response = await fetch('/api/user/data', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Could not fetch user data");
        const user = await response.json();

        conversationHistory = user.chatHistory && user.chatHistory.length > 0 ? user.chatHistory : [
          { role: "system", content: "You are MindfulAI, an empathetic, brief, and supportive AI mental health companion. You must talk and respond fluidly in ANY language the user speaks, prioritizing Indian languages like Hindi, Bengali, Tamil, Telugu, Marathi, etc. Match the user's language and script. Keep responses conversational, warm, and personalized. Notice emotions and guide gently. Never output markdown, just plain text." }
        ];
        currentMood = user.currentMood || 'neutral';
        moodLogs = user.moodLogs || [];
        journalEntries = user.journalEntries || [];

        // Update UI with cloud data
        $('chatMessages').innerHTML = '';
        if (conversationHistory.length > 1) {
          conversationHistory.forEach(msg => {
            if (msg.role !== 'system') addMsg(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
          });
        }
        if (typeof renderMoodAnalytics === 'function') renderMoodAnalytics();
        if (typeof renderJournalEntries === 'function') renderJournalEntries();
      } catch (err) {
        console.error(err);
        showToast("Failed to load cloud profile.", "warn");
      }
    };

    window.syncStateToAtlas = async function () {
      if (!currentUserEmail) return;

      const token = localStorage.getItem('mindful_jwt');
      // Sync to server silently
      fetch('/api/user/sync', {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          chatHistory: conversationHistory,
          moodLogs: moodLogs,
          journalEntries: journalEntries,
          currentMood: currentMood
        })
      }).catch(console.error);
    };

    function updateNavbarUser(email) {
      // Extract display name from email e.g. susrutachatterjee1@gmail.com → Susruta
      const namePart = email.split('@')[0].replace(/[^a-zA-Z]/g, '').replace(/\d+/g, '');
      const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
      const initial = displayName.charAt(0).toUpperCase();

      $('userAvatar').innerText = initial;
      $('userDisplayName').innerText = displayName;
      $('userProfileChip').style.display = 'flex';
      $('signInNavLink').style.display = 'none';

      if ($('mobileUserAvatar')) $('mobileUserAvatar').innerText = initial;
      if ($('mobileUserDisplayName')) $('mobileUserDisplayName').innerText = displayName;
      if ($('mobileUserProfile')) $('mobileUserProfile').style.display = 'flex';
      if ($('mobileSignInLink')) $('mobileSignInLink').style.display = 'none';
    }

    window.logoutUser = function () {
      if (!confirm('Are you sure you want to log out?')) return;

      // Clear runtime state
      currentUserEmail = null;
      conversationHistory = [];
      moodLogs = [];
      journalEntries = [];
      currentMood = 'neutral';

      // Clear UI
      if ($('chatMessages')) $('chatMessages').innerHTML = '';
      if ($('moodHistoryList')) $('moodHistoryList').innerHTML = '';

      // Reset navbar
      $('userProfileChip').style.display = 'none';
      $('signInNavLink').style.display = '';
      $('userAvatar').innerText = '';
      $('userDisplayName').innerText = '';

      if ($('mobileUserProfile')) $('mobileUserProfile').style.display = 'none';
      if ($('mobileSignInLink')) $('mobileSignInLink').style.display = 'block';
      if ($('mobileUserAvatar')) $('mobileUserAvatar').innerText = '';
      if ($('mobileUserDisplayName')) $('mobileUserDisplayName').innerText = '';

      // Reset auth form to Login mode
      isAuthModeLogin = true;
      $('authTitle').innerText = 'Welcome Back';
      $('authSubtitle').innerText = 'Your safe space awaits';
      $('authSubmitBtn').innerText = 'Sign In';
      $('authSwitchText').innerHTML = `Don't have an account? <a href="#" onclick="toggleAuthMode()">Sign up here</a>`;
      $('pwdHelp').style.display = 'none';
      if ($('email')) $('email').value = '';
      if ($('password')) $('password').value = '';

      // Show login overlay
      $('appLoginOverlay').classList.remove('hidden');
      SideNotif.show('logout');
      showToast('Logged out successfully. See you soon! 👋', 'info');
    };
    // Particles
    (function initParticles() {
      const container = $('particles');
      if (!container) return;
      for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 3 + 1;
        p.style.cssText = `
      left:${Math.random() * 100}%;top:${Math.random() * 100}%;
      width:${size}px;height:${size}px;
      animation-duration:${10 + Math.random() * 20}s;
      animation-delay:${-Math.random() * 20}s;
      opacity:${0.2 + Math.random() * 0.5};
    `;
        container.appendChild(p);
      }
    })();

    // Navbar
    window.addEventListener('scroll', () => {
      $('navbar').classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
    window.toggleMobile = () => $('mobileMenu').classList.toggle('open');

    // Theme Manager
    window.toggleTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('mindful_theme', newTheme);
      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.textContent = newTheme === 'light' ? '🌙' : '☀️';
    };
    document.addEventListener('DOMContentLoaded', () => {
      const saved = localStorage.getItem('mindful_theme');
      if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        const btn = document.getElementById('themeToggleBtn');
        if (btn) btn.textContent = saved === 'light' ? '🌙' : '☀️';
      }
    });

    // Scroll Spy for Nav Links
    document.addEventListener('DOMContentLoaded', () => {
      const sections = document.querySelectorAll('section');
      const navLinks = document.querySelectorAll('.nav-links .nav-link');

      const observerOptions = {
        root: null,
        rootMargin: '-30% 0px -70% 0px',
        threshold: 0
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            if (id) {
              navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                  link.classList.add('active');
                }
              });
            }
          }
        });
      }, observerOptions);

      sections.forEach(section => {
        observer.observe(section);
      });
    });

    /* ─────────────────────────────────────────────
       2.  REAL-TIME EMOTION ENGINE
    ───────────────────────────────────────────── */
    const EmotionEngine = (() => {
      const EMOTIONS = {
        stressed: { keywords: ['stress', 'pressure', 'tense', 'deadline', 'hectic', 'overload'], emoji: '😤', color: '#fb923c' },
        anxious: { keywords: ['anxi', 'panic', 'worry', 'nervous', 'fear', 'scared', 'overthink'], emoji: '😰', color: '#7eb8ff' },
        sad: { keywords: ['sad', 'depress', 'cry', 'hopeless', 'down', 'grief', 'empty'], emoji: '😢', color: '#60a5fa' },
        angry: { keywords: ['angry', 'anger', 'furious', 'annoy', 'mad', 'rage', 'hate', 'irritat'], emoji: '😡', color: '#f87171' },
        burnout: { keywords: ['burnout', 'exhausted', 'tired', 'no energy', 'giving up', 'quit'], emoji: '🔥', color: '#f43f5e' },
        calm: { keywords: ['calm', 'relax', 'peace', 'breathe', 'okay', 'fine'], emoji: '😌', color: '#34d399' }
      };

      function analyse(text) {
        const t = text.toLowerCase();
        const scores = {};
        for (const [em, cfg] of Object.entries(EMOTIONS)) {
          let score = 0;
          cfg.keywords.forEach(kw => { if (t.includes(kw)) score += 2; });
          if (score > 0) scores[em] = score;
        }
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        if (!sorted.length) return { primary: 'neutral', icon: '😐', color: '#94a3b8' };
        const primary = sorted[0][0];
        return { primary, icon: EMOTIONS[primary].emoji, color: EMOTIONS[primary].color };
      }
      return { analyse };
    })();

    /* ─────────────────────────────────────────────
       3.  TYPING STRESS DETECTOR
    ───────────────────────────────────────────── */
    const StressDetector = (() => {
      let keyTimes = [];
      function onType() {
        const now = Date.now();
        keyTimes.push(now);
        if (keyTimes.length > 30) keyTimes.shift();
      }
      function checkStress() {
        if (keyTimes.length < 15) return false;
        const duration = keyTimes[keyTimes.length - 1] - keyTimes[0];
        const wpm = (keyTimes.length / 5) / (duration / 60000);
        // If typing faster than ~80 WPM (erratic) with short duration, indicates stress
        return wpm > 85;
      }
      return { onType, checkStress };
    })();

    /* ─────────────────────────────────────────────
       4.  MUSIC THERAPY MATCHING
    ───────────────────────────────────────────── */
    const MusicTherapy = (() => {
      const library = [
        // 🎧 FOCUS (For Stress/Study)
        { title: "Bollywood Lo-Fi Beats", cat: "focus", mood: "stressed", embed: "508FujAJBn0V3NypawFM8p", emoji: "🎯" },
        { title: "Deep Focus Lofi (International)", cat: "focus", mood: "stressed", embed: "37i9dQZF1DWWQRwui0ExPn", emoji: "😤" },

        // 😌 CALMING (For Anxiety/Panic)
        { title: "Peaceful Piano / Acoustic", cat: "calming", mood: "anxious", embed: "37i9dQZF1DX4sWSpwq3LiO", emoji: "🎹" },
        { title: "Soft Pop Hits", cat: "calming", mood: "anxious", embed: "37i9dQZF1DWTwnEm1IYyoj", emoji: "🕊️" },

        // 🌟 UPLIFTING (For Sadness/Depression)
        { title: "Mood Booster Dance", cat: "uplifting", mood: "sad", embed: "37i9dQZF1DX3rxVfibe1L0", emoji: "✨" },
        { title: "Happy Hits!", cat: "uplifting", mood: "sad", embed: "37i9dQZF1DXdPec7aLNegM", emoji: "💃" },

        // 😴 SLEEP & BURNOUT RECOVERY
        { title: "Deep Sleep & Unwind", cat: "sleep", mood: "burnout", embed: "37i9dQZF1DWYcDQ1hSjOpY", emoji: "💤" },
        { title: "Sleep Mix", cat: "sleep", mood: "burnout", embed: "37i9dQZF1DWZd79rJ6a7lp", emoji: "🌙" },

        // ⚡ ENERGY (For Anger/Venting)
        { title: "Beast Mode Energy", cat: "energy", mood: "angry", embed: "37i9dQZF1DX76Wlfdnj7AP", emoji: "🏋️" },
        { title: "Gym Workout", cat: "energy", mood: "angry", embed: "37i9dQZF1DX70RN3TfWWpP", emoji: "🔥" }
      ];

      function renderPlaylists(category) {
        const grid = $('playlistsGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const filtered = category === 'all' ? library : library.filter(m => m.cat === category);

        filtered.forEach(item => {
          grid.innerHTML += `
        <iframe style="border-radius:12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05);" 
          src="https://open.spotify.com/embed/playlist/${item.embed}?utm_source=generator&theme=0" 
          width="100%" height="352" frameBorder="0" allowfullscreen="" 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy">
        </iframe>
      `;
        });
      }

      function suggest(mood) {
        const strip = $('musicStrip');
        const content = $('msContent');
        const match = library.find(m => m.mood === mood) || library[1];

        if (match) {
          if (strip) strip.style.display = 'flex';
          if (content) content.innerHTML = `<strong>${match.title}</strong> to help you with feeling ${mood}`;

          const mmdEmoji = $('mmdEmoji');
          const mmdMoodName = $('mmdMoodName');
          const mmdDesc = $('mmdDesc');
          if (mmdEmoji && mmdMoodName) {
            mmdEmoji.textContent = match.emoji;
            mmdMoodName.textContent = `You're feeling ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;
            mmdDesc.textContent = `I've queued up '${match.title}' specifically to help you.`;
          }
          if (window.filterMusic) window.filterMusic(match.cat);
        }
      }
      return { suggest, renderPlaylists, library };
    })();

    window.filterMusic = function (cat, btnEl = null) {
      if (btnEl) {
        document.querySelectorAll('.music-cat-btn').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
      } else {
        document.querySelectorAll('.music-cat-btn').forEach(b => {
          if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${cat}'`)) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
      }
      MusicTherapy.renderPlaylists(cat);
    };

    // Initial Render
    setTimeout(() => { if ($('playlistsGrid')) MusicTherapy.renderPlaylists('all'); }, 500);

    /* ─────────────────────────────────────────────
       5.  PANIC MODE
    ───────────────────────────────────────────── */
    let panicInterval = null;
    let panicTimerInterval = null;
    let panicTimeLeft = 300;
    let panicActive = false;

    window.triggerPanicMode = function () {
      const overlay = $('panicOverlay');
      overlay.classList.add('open');
      document.querySelectorAll('.grounding-step').forEach(el => el.classList.remove('done'));

      if (panicInterval) clearInterval(panicInterval);
      if (panicTimerInterval) clearInterval(panicTimerInterval);
      panicActive = false;
      panicTimeLeft = 300;

      const ring = $('panicCircle');
      ring.style.transform = "scale(1)";
      $('panicBreathText').textContent = "Breathe";
      $('panicPhaseText').innerText = "Tap the circle to begin guided breathing (5:00)";

      ring.onclick = function () {
        if (panicActive) {
          // Pause functionality if clicked again
          clearInterval(panicInterval);
          clearInterval(panicTimerInterval);
          panicActive = false;
          ring.style.transform = "scale(1)";
          $('panicBreathText').textContent = "Paused";
          return;
        }

        panicActive = true;
        let phase = 0;
        const t = $('panicBreathText');
        const pPhaseText = $('panicPhaseText');

        pPhaseText.innerText = "Guided Breathing - 5:00";

        panicTimerInterval = setInterval(() => {
          panicTimeLeft--;
          if (panicTimeLeft <= 0) {
            clearInterval(panicInterval);
            clearInterval(panicTimerInterval);
            ring.style.transform = "scale(1)";
            t.textContent = "Done";
            pPhaseText.innerText = "Session complete. You're doing great. 💙";
            panicActive = false;
            return;
          }
          const m = Math.floor(panicTimeLeft / 60);
          const s = panicTimeLeft % 60;
          pPhaseText.innerText = `Guided Breathing - ${m}:${s < 10 ? '0' + s : s}`;
        }, 1000);

        t.textContent = "Inhale"; ring.style.transform = "scale(1.2)";
        panicInterval = setInterval(() => {
          phase = (phase + 1) % 2;
          if (phase === 1) { t.textContent = "Exhale"; ring.style.transform = "scale(0.8)"; }
          else { t.textContent = "Inhale"; ring.style.transform = "scale(1.2)"; }
        }, 4000);
      };
    };

    window.closePanicMode = function () {
      if (panicInterval) { clearInterval(panicInterval); panicInterval = null; }
      if (panicTimerInterval) { clearInterval(panicTimerInterval); panicTimerInterval = null; }
      panicActive = false;
      $('panicOverlay').classList.remove('open');
    };

    window.activateGrounding = function (el, idx) {
      el.classList.add('done');
    };

    /* ─────────────────────────────────────────────
       6.  CHAT ENGINE
    ───────────────────────────────────────────── */
    // --- API Proxy Setup ---
    // Groq calls are now securely proxied via the backend.

    let isAITyping = false;
    let currentMood = localStorage.getItem('currentMood') || 'neutral';
    let conversationHistory = JSON.parse(localStorage.getItem('chatHistory')) || [
      { role: "system", content: "You are MindfulAI, an empathetic, brief, and supportive AI mental health companion. You must talk and respond fluidly in ANY language the user speaks, prioritizing Indian languages like Hindi, Bengali, Tamil, Telugu, Marathi, etc. Match the user's language and script. Keep responses conversational, warm, and personalized. Notice emotions and guide gently. Never output markdown, just plain text." }
    ];

    function saveState() {
      if (typeof window.syncStateToAtlas === 'function') window.syncStateToAtlas();
    }

    window.changeLanguage = function () {
      const lang = document.getElementById('chatLanguage').value;
      let langInstruction = '';
      if (lang === 'auto') {
        langInstruction = "You must talk and respond fluidly in ANY language the user speaks, prioritizing Indian languages like Hindi, Bengali, Tamil, Telugu, Marathi, etc. Match the user's language and script.";
      } else {
        langInstruction = `You MUST strictly process and respond ONLY in ${lang.toUpperCase()}. If the user uses English letters but implies ${lang.toUpperCase()}, translate and reply in ${lang.toUpperCase()} script.`;
      }

      if (conversationHistory.length > 0 && conversationHistory[0].role === 'system') {
        conversationHistory[0].content = `You are MindfulAI, an empathetic, brief, and supportive AI mental health companion. ${langInstruction} Keep responses conversational, warm, and personalized. Notice emotions and guide gently. Never output markdown, just plain text.`;
        saveState();
        showToast(`Language set to ${lang === 'auto' ? 'Auto-Detect' : lang.charAt(0).toUpperCase() + lang.slice(1)}`, 'info');
      }
    };

    window.reloadUserState = function () {
      const prefix = currentUserEmail ? `mindful_${currentUserEmail}_` : '';

      // Chat state
      conversationHistory = JSON.parse(localStorage.getItem(`${prefix}chatHistory`)) || [
        { role: "system", content: "You are MindfulAI, an empathetic, brief, and supportive AI mental health companion. You must talk and respond fluidly in ANY language the user speaks, prioritizing Indian languages like Hindi, Bengali, Tamil, Telugu, Marathi, etc. Match the user's language and script. Keep responses conversational, warm, and personalized. Notice emotions and guide gently. Never output markdown, just plain text." }
      ];
      currentMood = localStorage.getItem(`${prefix}currentMood`) || 'neutral';
      $('chatMessages').innerHTML = '';
      if (conversationHistory.length > 1) {
        conversationHistory.forEach(msg => {
          if (msg.role !== 'system') addMsg(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
        });
      }

      // Mood state
      if (typeof window.loadPersistedMoods === 'function') window.loadPersistedMoods();

      // Journal state
      if (typeof window.loadPersistedJournals === 'function') window.loadPersistedJournals();
    };

    document.addEventListener('DOMContentLoaded', () => {
      if (conversationHistory.length > 1) {
        $('chatMessages').innerHTML = '';
        conversationHistory.forEach(msg => {
          if (msg.role !== 'system') addMsg(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
        });
      }
    });

    function addMsg(role, text) {
      const messages = $('chatMessages');
      const div = document.createElement('div');
      div.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;

      const displayTxt = text.replace(/^\(User mood detected as: [^)]*\)\s*-\s*/, '');

      if (role === 'ai' && window.isVoiceEnabled) {
        speakText(displayTxt);
      }

      div.innerHTML = `
    ${role === 'ai' ? '<div class="msg-avatar">🌿</div>' : ''}
    <div class="msg-content">
      <div class="msg-bubble">${displayTxt.replace(/\n/g, '<br>')}</div>
      <div class="msg-time">${nowTime()}</div>
    </div>
    ${role === 'user' ? '<div class="msg-avatar">🧑</div>' : ''}
  `;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    window.handleInput = function (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
      StressDetector.onType();

      const val = el.value;
      if (val.trim()) {
        let analysis = EmotionEngine.analyse(val);
        $('eiLabel').innerHTML = `Detecting <strong>${analysis.primary}</strong> ${analysis.icon}`;
        $('emotionIndicator').style.display = 'flex';
      } else {
        $('emotionIndicator').style.display = 'none';
      }

      if (StressDetector.checkStress()) {
        $('stressIndicator').style.display = 'flex';
      } else {
        $('stressIndicator').style.display = 'none';
      }
    };

    window.handleKeyDown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

    window.sendMessage = async function (preset, voiceToneStr = null) {
      if (isAITyping) return;
      const input = $('chatInput');
      const text = (preset || input.value).trim();
      if (!text) return;

      input.value = '';
      input.style.height = 'auto';
      $('emotionIndicator').style.display = 'none';
      $('stressIndicator').style.display = 'none';

      addMsg('user', text);
      isAITyping = true;

      const mood = EmotionEngine.analyse(text);
      currentMood = mood.primary;
      $('lmdEmoji').textContent = mood.icon;
      $('lmdLabel').textContent = currentMood.charAt(0).toUpperCase() + currentMood.slice(1);
      saveState();
      MusicTherapy.suggest(currentMood);

      const token = localStorage.getItem('mindful_jwt');
      if (!token) {
        addMsg('ai', `[Sign In Required]: Please sign in to enable AI responses.`);
        isAITyping = false; return;
      }

      let userMsgText = `(User mood detected as: ${currentMood}) - ${text}`;
      if (voiceToneStr) {
        userMsgText = `(Voice tone detected as: ${voiceToneStr} | User mood detected as: ${currentMood}) - ${text}`;
      }
      conversationHistory.push({ role: "user", content: userMsgText });
      saveState();

      addTypingIndicator();

      // Sliding Window to prevent 400 Payload Exceeded limits
      let payloadHistory = conversationHistory;
      if (conversationHistory.length > 20) {
        payloadHistory = [conversationHistory[0], ...conversationHistory.slice(-19)];
      }

      try {
        const res = await fetch(`/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ messages: payloadHistory })
        });

        removeTypingIndicator();

        if (!res.ok) {
          if (res.status === 429) throw new Error("Rate limit exceeded. Please wait a moment.");
          if (res.status === 401) throw new Error("Invalid API Key provided.");
          throw new Error(`HTTP Error ${res.status}`);
        }

        const data = await res.json();
        if (data.error) addMsg('ai', `Error: ${data.error.message}`);
        else {
          const responseText = data.choices[0].message.content;
          conversationHistory.push({ role: "assistant", content: responseText });
          saveState();
          addMsg('ai', responseText);
        }
      } catch (err) {
        removeTypingIndicator();
        addMsg('ai', `⚠️ Connection issue: ${err.message}. Please try again.`);
      } finally {
        isAITyping = false;
      }
    };

    function addTypingIndicator() {
      const messages = $('chatMessages');
      const div = document.createElement('div');
      div.id = 'typingBubble';
      div.className = `message ai-message`;
      div.innerHTML = `<div class="msg-avatar">🌿</div><div class="msg-content"><div class="msg-bubble" style="font-weight:600; color:var(--primary); padding-bottom:5px;">Mira is typing...</div></div>`;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }
    function removeTypingIndicator() {
      const t = $('typingBubble');
      if (t) t.remove();
    }

    window.quickMood = (emoji, label) => { sendMessage(`I am feeling ${label.toLowerCase()} ${emoji}`); };
    window.clearChat = () => {
      if (confirm("Are you sure you want to clear chat history?")) {
        $('chatMessages').innerHTML = '';
        conversationHistory = [conversationHistory[0]];
        saveState();
      }
    };


    // Pomodoro
    let pomoTimer = null;
    let pomoTime = 25 * 60;
    window.startStudyTimer = function () {
      scrollToSection('student');
      $('pomodoroCard').style.display = 'flex';
    };

    window.startPomodoro = function () {
      const btn = $('pomodoroBtn');
      if (pomoTimer) {
        clearInterval(pomoTimer);
        pomoTimer = null;
        btn.innerText = "Resume Session";
        return;
      }
      btn.innerText = "Pause Session";
      pomoTimer = setInterval(() => {
        pomoTime--;
        const m = Math.floor(pomoTime / 60);
        const s = pomoTime % 60;
        $('pomodoroDisplay').innerText = `${m}:${s < 10 ? '0' + s : s}`;
        if (pomoTime <= 0) {
          clearInterval(pomoTimer);
          pomoTimer = null;
          showToast('Study Session Complete! Take a break.', 'info', 5000);
          resetPomodoro();
        }
      }, 1000);
    };

    window.resetPomodoro = function () {
      clearInterval(pomoTimer);
      pomoTimer = null;
      pomoTime = 25 * 60;
      $('pomodoroDisplay').innerText = "25:00";
      if ($('pomodoroBtn')) $('pomodoroBtn').innerText = "Start Session";
    };


    /* ─────────────────────────────────────────────
       8. MISSING ENGINE LOGIC (BREATHE / MOOD)
    ───────────────────────────────────────────── */
    /* ─────────────────────────────────────────────
       9.  BREATHING ENGINE - COSMIC REDESIGN
    ───────────────────────────────────────────── */

    // Breathing State Management
    const BreathingEngine = {
      state: {
        currentTechnique: 'box',
        isActive: false,
        cycleCount: 0,
        timeLeft: 300,
        currentPhase: 'idle',
        phaseTimeLeft: 0
      },

      // Technique definitions
      techniques: {
        box: {
          label: 'Box Breathing',
          timing: '4s · 4s · 4s · 4s',
          icon: '🟦',
          cycles: [
            { phase: 'Inhale', duration: 4 },
            { phase: 'Hold', duration: 4 },
            { phase: 'Exhale', duration: 4 },
            { phase: 'Hold', duration: 4 }
          ],
          fullCycleDuration: 16,
          defaultDuration: 180,
          description: 'Box Breathing – A calming technique used by Navy SEALs to control stress. Inhale for 4 seconds • Hold for 4 seconds • Exhale for 4 seconds • Hold for 4 seconds. Perfect for managing stress and anxiety.'
        },
        '478': {
          label: '4-7-8 Technique',
          timing: '4s · 7s · 8s',
          icon: '🌙',
          cycles: [
            { phase: 'Inhale', duration: 4 },
            { phase: 'Hold', duration: 7 },
            { phase: 'Exhale', duration: 8 }
          ],
          fullCycleDuration: 19,
          defaultDuration: 120,
          description: '4-7-8 Technique – A Pranayama-derived method to regulate the nervous system and promote deep relaxation. Parameters: 4s Inhale • 7s Hold • 8s Exhale.'
        },
        diaphragm: {
          label: 'Deep Breathing',
          timing: '5s in · 5s out',
          icon: '🌊',
          cycles: [
            { phase: 'Inhale', duration: 5 },
            { phase: 'Exhale', duration: 5 }
          ],
          fullCycleDuration: 10,
          defaultDuration: 300,
          description: 'Deep Breathing – Activates your parasympathetic nervous system. Deeply inhale for 5 seconds • Exhale slowly for 5 seconds. Ideal for relaxation and anxiety relief.'
        },
        panic: {
          label: 'Panic Calm',
          timing: '3s in · 6s out',
          icon: '🆘',
          cycles: [
            { phase: 'Inhale', duration: 3 },
            { phase: 'Exhale', duration: 6 }
          ],
          fullCycleDuration: 9,
          defaultDuration: 120,
          description: 'Panic Calm – Quickly stops the panic spiral. Short inhale 3s • Long exhale 6s. Find your anchor and focus on your breathing.'
        }
      },

      intervals: {
        phase: null,
        timer: null
      },

      init() {
        this.loadPersistedState();
        this.updateUI();
      },

      selectTechnique(type) {
        const tech = this.techniques[type];
        this.state.currentTechnique = type;
        this.state.isActive = false;
        this.state.cycleCount = 0;
        this.state.timeLeft = tech.defaultDuration;
        const mins = Math.floor(this.state.timeLeft / 60);
        const secs = this.state.timeLeft % 60;
        if ($('sessionDuration')) $('sessionDuration').textContent = `${mins}:${secs < 10 ? '0' + secs : secs}`;
        this.stopBreathing();
        this.updateUI();
        this.saveState();
      },

      startBreathing() {
        if (this.state.isActive) return;

        this.state.isActive = true;

        const tech = this.techniques[this.state.currentTechnique];
        let cycleIndex = 0;
        let cycleStartTime = Date.now();

        const updatePhase = () => {
          const currentCycle = tech.cycles[cycleIndex % tech.cycles.length];
          this.state.currentPhase = currentCycle.phase;

          $('breathePhase').textContent = `${currentCycle.phase} for ${currentCycle.duration}s`;
          $('crystalCenterText').textContent = currentCycle.phase.toUpperCase();

          // Animate the crystal center
          if (currentCycle.phase === 'Inhale') {
            $('crystalCenterText').style.animation = 'none';
            setTimeout(() => {
              $('crystalCenterText').style.animation = 'crystalPulseIn 4s ease-in-out';
            }, 10);
          } else if (currentCycle.phase === 'Exhale') {
            $('crystalCenterText').style.animation = 'none';
            setTimeout(() => {
              $('crystalCenterText').style.animation = 'crystalPulseOut 4s ease-in-out';
            }, 10);
          }

          cycleIndex++;
          if (cycleIndex % tech.cycles.length === 0) {
            this.state.cycleCount++;
            $('cycleCount').textContent = this.state.cycleCount;
          }
        };

        // Run phases
        this.intervals.phase = setInterval(() => {
          updatePhase();
        }, this.getPhaseIntervalMS());

        // Timer countdown
        this.intervals.timer = setInterval(() => {
          this.state.timeLeft--;
          const mins = Math.floor(this.state.timeLeft / 60);
          const secs = this.state.timeLeft % 60;
          $('sessionDuration').textContent = `${mins}:${secs < 10 ? '0' + secs : secs}`;

          if (this.state.timeLeft <= 0) {
            this.completeSession();
          }
        }, 1000);

        this.updateUI();
      },

      stopBreathing() {
        this.state.isActive = false;
        clearInterval(this.intervals.phase);
        clearInterval(this.intervals.timer);
        $('breathePhase').textContent = 'Choose a technique to begin';
        $('crystalCenterText').textContent = 'PREPARE';
        $('crystalSubText').textContent = 'Press to Begin';
        this.updateUI();
      },

      completeSession() {
        this.stopBreathing();
        showToast('🧘 Great job! Breathing session completed. You feel calmer already!', 'success');
        const tech = this.techniques[this.state.currentTechnique];
        this.state.timeLeft = tech.defaultDuration;
        this.state.cycleCount = 0;
        $('cycleCount').textContent = '0';
        const mins = Math.floor(this.state.timeLeft / 60);
        const secs = this.state.timeLeft % 60;
        $('sessionDuration').textContent = `${mins}:${secs < 10 ? '0' + secs : secs}`;
        this.saveState();
      },

      getPhaseIntervalMS() {
        const tech = this.techniques[this.state.currentTechnique];
        const totalMs = tech.cycles.reduce((sum, c) => sum + c.duration, 0) * 1000;
        return totalMs / tech.cycles.length;
      },

      updateUI() {
        const tech = this.techniques[this.state.currentTechnique];
        const btn = $('breatheStartBtn');

        // Update button text and state
        if (this.state.isActive) {
          btn.innerHTML = '<span class="ssb-icon">⏸</span><span class="ssb-text">Pause</span>';
        } else {
          btn.innerHTML = '<span class="ssb-icon">▶</span><span class="ssb-text">Start Session</span>';
        }

        // Update selected badge
        document.querySelectorAll('.technique-card').forEach(card => {
          const badge = card.querySelector('.tc-badge');
          if (card.dataset.technique === this.state.currentTechnique) {
            card.classList.add('active');
            badge.style.display = 'block';
          } else {
            card.classList.remove('active');
            badge.style.display = 'none';
          }
        });

        // Update details card
        $('detailsTitle').textContent = tech.label;
        $('detailsDesc').textContent = tech.description;
      },

      saveState() {
        localStorage.setItem('mindful_breathing_state', JSON.stringify(this.state));
      },

      loadPersistedState() {
        const saved = localStorage.getItem('mindful_breathing_state');
        if (saved) {
          this.state = { ...this.state, ...JSON.parse(saved) };
          // Reset active state on reload
          this.state.isActive = false;
        }
      }
    };

    // Global selectable breathing function
    window.selectTechnique = function (type, btn) {
      BreathingEngine.selectTechnique(type);
    };

    // Global toggle breathing function
    window.toggleBreathing = function () {
      if (BreathingEngine.state.isActive) {
        BreathingEngine.stopBreathing();
      } else {
        BreathingEngine.startBreathing();
      }
    };

    // Initialize breathing engine
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        BreathingEngine.init();
      }, 500);
    });

    // Add CSS animations for crystal pulse
    const crystalStyle = document.createElement('style');
    crystalStyle.textContent = `
  @keyframes crystalPulseIn {
    0% { transform: scale(0.8); opacity: 0.6; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 0.9; }
  }
  
  @keyframes crystalPulseOut {
    0% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(0.9); opacity: 0.7; }
    100% { transform: scale(0.8); opacity: 0.6; }
  }
  
  @keyframes voicePulse {
    0% { box-shadow: 0 0 0 0 rgba(126, 184, 255, 0.7); transform: scale(1); }
    70% { box-shadow: 0 0 0 10px rgba(126, 184, 255, 0); transform: scale(1.1); }
    100% { box-shadow: 0 0 0 0 rgba(126, 184, 255, 0); transform: scale(1); }
  }
  
  .voice-toggle-btn.speaking {
    animation: voicePulse 1.5s infinite !important;
    background: var(--primary) !important;
    border-color: #fff !important;
  }
`;
    document.head.appendChild(crystalStyle);

    let moodLogs = JSON.parse(localStorage.getItem('mindful_moods')) || [];
    window.loadPersistedMoods = function () {
      const prefix = currentUserEmail ? `mindful_${currentUserEmail}_` : '';
      moodLogs = JSON.parse(localStorage.getItem(`${prefix}mindful_moods`)) || [];
      if (typeof renderMoodAnalytics === 'function') renderMoodAnalytics();
    };
    let currentMoodVal = null;
    let currentMoodLabel = "";
    let currentMoodEmoji = "";

    window.selectMood = function (btn, val, label, emoji) {
      document.querySelectorAll('.mood-emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMoodVal = val;
      currentMoodLabel = label;
      currentMoodEmoji = emoji;
      $('selectedMoodLabel').innerText = `${label} ${emoji}`;
    };
    window.toggleTag = function (btn) { btn.classList.toggle('active'); };

    window.logMood = function () {
      if (!currentMoodVal) {
        showToast("Please select a mood first!", "warn");
        return;
      }

      const activeTags = Array.from(document.querySelectorAll('.mood-tag.active')).map(b => b.innerText.trim());

      const newLog = {
        date: getLocalDate(),
        time: nowTime(),
        val: currentMoodVal,
        label: currentMoodLabel,
        emoji: currentMoodEmoji,
        tags: activeTags
      };

      moodLogs.push(newLog);
      if (typeof window.syncStateToAtlas === 'function') window.syncStateToAtlas();

      // Reset UI
      document.querySelectorAll('.mood-tag').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.mood-emoji-btn').forEach(b => b.classList.remove('active'));
      $('selectedMoodLabel').innerText = "Select a mood above";
      currentMoodVal = null;

      showToast("Mood logged successfully to your private diary!", "info");
      renderMoodAnalytics();
      if (typeof window.refreshMoodHeatmap === 'function') window.refreshMoodHeatmap();
    };

    window.autoLogMoodFromSession = function () {
      showToast(`Auto-logged session dominant mood (${currentMood}) to tracker.`, "info");
    };

    function renderMoodAnalytics() {
      // Refresh list
      const list = $('moodHistoryList');
      if (!list) return;

      if (moodLogs.length === 0) {
        list.innerHTML = `<p class="empty-history" style="text-align:center; padding: 2rem; color: #6b7280;">No mood logs yet. Start tracking to see your patterns! 🌱</p>`;
      } else {
        list.innerHTML = moodLogs.slice().reverse().map(l => `
      <div class="feed-card">
        <div class="fc-emoji">${l.emoji}</div>
        <div class="fc-main">
          <div class="fc-title">
            <span class="fc-label">${l.label}</span>
            <span class="fc-time">${l.date} ${l.time}</span>
          </div>
          <div class="fc-tags">
            ${l.tags ? l.tags.map(t => `<span class="fc-tag">${t}</span>`).join('') : ''}
          </div>
        </div>
      </div>
    `).join('');
      }

      // Average Mood
      let avgString = "--";
      if (moodLogs.length > 0) {
        const avg = moodLogs.reduce((acc, l) => acc + l.val, 0) / moodLogs.length;
        avgString = avg.toFixed(1);
      }
      if ($('avgMood')) $('avgMood').innerText = avgString;

      // Heatmap
      const hm = $('moodHeatmapCalendar');
      if (hm) {
        hm.innerHTML = '';
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let html = '';
        let startOffset = firstDay === 0 ? 6 : firstDay - 1; // Make Monday 0

        for (let i = 0; i < startOffset; i++) html += `<div class="hm-cell hm-empty"></div>`;

        for (let day = 1; day <= daysInMonth; ++day) {
          let ds = getLocalDate(new Date(year, month, day));
          let log = moodLogs.slice().reverse().find(x => x.date === ds);
          let cls = '';
          if (log) {
            if (log.val === 5) cls = "hm-excellent";
            else if (log.val === 4) cls = "hm-good";
            else if (log.val === 3) cls = "hm-okay";
            else if (log.val === 2) cls = "hm-low";
            else if (log.val === 1) cls = "hm-bad";
          }
          html += `<div class="hm-cell ${cls}" title="${ds}">${day}</div>`;
        }

        const rem = (startOffset + daysInMonth) % 7;
        if (rem > 0) {
          for (let i = 0; i < 7 - rem; i++) html += `<div class="hm-cell hm-empty"></div>`;
        }
        hm.innerHTML = html;

        const lbl = $('heatmapMonthLbl');
        if (lbl) lbl.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }

    document.addEventListener('DOMContentLoaded', () => { setTimeout(renderMoodAnalytics, 800); });

    /* ─────────────────────────────────────────────
       10. A11y & GLOBAL INIT
    ───────────────────────────────────────────── */
    window.toggleEmotionPanel = () => { $('emotionSidebar').classList.toggle('open'); };
    window.toggleEmoji = () => { $('emojiPicker').classList.toggle('open'); };
    window.insertEmoji = (emoji) => { $('chatInput').value += emoji; };

    window.selectECOption = function (element) {
      element.classList.toggle('active');
    };

    window.saveEmergencyContacts = function () {
      const activeOptions = document.querySelectorAll('.ec-option.active');
      const contacts = Array.from(activeOptions).map(el => {
        return {
          name: el.querySelector('strong').innerText.replace('📞 ', ''),
          phone: el.querySelector('span').innerText
        };
      });

      localStorage.setItem('mindful_emergency_contacts', JSON.stringify(contacts));
      document.getElementById('emergencyContactOverlay').classList.add('hidden');
      renderEmergencyContacts();
      showToast("Emergency contacts saved successfully!", "info");
    };

    window.renderEmergencyContacts = function () {
      const saved = JSON.parse(localStorage.getItem('mindful_emergency_contacts') || '[]');
      const panicContainer = document.getElementById('userSavedPanicContacts');
      const footerHeaderContainer = document.getElementById('footerEmergencyContacts');
      const footerContainer = document.getElementById('footerContactsGrid');
      const defaultPanicCall = document.getElementById('defaultPanicCall');

      if (saved.length > 0 && panicContainer && defaultPanicCall) {
        defaultPanicCall.style.display = 'none'; // hide default if custom ones exist

        // clear old non-default buttons
        panicContainer.innerHTML = '';

        saved.forEach(contact => {
          const btn = document.createElement('a');
          btn.href = 'tel:' + contact.phone.replace(/[^0-9]/g, '');
          btn.className = 'panic-action-btn danger';
          btn.innerHTML = '📞 Call ' + contact.name;
          panicContainer.appendChild(btn);
        });
      }

      if (saved.length > 0 && footerContainer && footerHeaderContainer) {
        footerHeaderContainer.querySelector('h4').innerText = 'My Emergency Contacts';
        footerContainer.innerHTML = '';
        saved.forEach(contact => {
          footerContainer.innerHTML += `<div class="contact">📞 ${contact.name}: <a href="tel:${contact.phone.replace(/[^0-9]/g, '')}"><strong>${contact.phone}</strong></a></div>`;
        });
      }
    };

    /* ─────────────────────────────────────────────
       8.  VOICE ASSISTANCE (STT & TTS)
    ───────────────────────────────────────────── */
    window.isVoiceEnabled = localStorage.getItem('mindful_voice_enabled') === 'true';
    let recognition = null;
    let isListening = false;

    /* ── VoiceToneAnalyzer ── */
    const VoiceToneAnalyzer = (() => {
      // Hesitation markers that suggest anxiety / distress
      const HESITATION_WORDS = ['um', 'uh', 'er', 'hmm', 'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically'];
      // High-anxiety keyword signals
      const ANXIETY_KEYWORDS = ['panic', 'panicking', 'scared', 'terrified', 'can\'t breathe', 'heart', 'shaking', 'trembling', 'overwhelmed', 'freaking out', 'losing it'];
      // Sadness / depression signals
      const SADNESS_KEYWORDS = ['hopeless', 'worthless', 'give up', 'can\'t go on', 'nobody', 'alone', 'empty', 'numb', 'pointless', 'wish i was'];
      // Stress / overload signals
      const STRESS_KEYWORDS = ['deadline', 'pressure', 'too much', 'failing', 'exhausted', 'burned out', 'no time', 'can\'t cope', 'drowning'];

      /**
       * Analyse a speech transcript + duration to produce a tone label, emoji, and color.
       * @param {string} transcript - The raw transcribed text
       * @param {number} durationSec - How long the user spoke in seconds
       * @returns {{ tone: string, emoji: string, color: string, severity: number }}
       */
      function analyse(transcript, durationSec) {
        const t = transcript.toLowerCase();
        const wordList = t.split(/\s+/).filter(Boolean);
        const wordCount = wordList.length;
        const wps = wordCount / Math.max(durationSec, 0.5); // Words per second

        let severity = 0; // 0=calm, 1=mild, 2=moderate, 3=high, 4=crisis

        // ── Signal 1: Speech rate ──
        if (wps > 4.0) severity += 3;        // Extremely fast → very anxious
        else if (wps > 3.0) severity += 2;   // Fast → anxious
        else if (wps > 2.2) severity += 1;   // Slightly fast → mildly stressed
        else if (wps < 0.9) severity += 1;   // Very slow → hesitant/sad

        // ── Signal 2: Hesitation word ratio ──
        const hesitationCount = wordList.filter(w => HESITATION_WORDS.includes(w)).length;
        const hesitationRatio = hesitationCount / Math.max(wordCount, 1);
        if (hesitationRatio > 0.15) severity += 2; // >15% hesitation words
        else if (hesitationRatio > 0.08) severity += 1;

        // ── Signal 3: Crisis / high-anxiety keywords ──
        const hasAnxiety = ANXIETY_KEYWORDS.some(kw => t.includes(kw));
        const hasSadness = SADNESS_KEYWORDS.some(kw => t.includes(kw));
        const hasStress = STRESS_KEYWORDS.some(kw => t.includes(kw));
        if (hasAnxiety) severity += 3;
        if (hasSadness) severity += 2;
        if (hasStress) severity += 2;

        // ── Signal 4: Very short utterances (fragmented speech) ──
        if (wordCount <= 3 && durationSec > 3) severity += 1; // Long pause, few words

        // ── Map severity to tone ──
        let tone, emoji, color;
        if (severity >= 6) {
          tone = 'Highly Anxious'; emoji = '😰'; color = '#7eb8ff';
        } else if (severity >= 4) {
          tone = 'Anxious'; emoji = '😟'; color = '#f472b6';
        } else if (severity >= 3) {
          tone = 'Stressed'; emoji = '😤'; color = '#fb923c';
        } else if (hasSadness && severity >= 2) {
          tone = 'Sad/Hesitant'; emoji = '😔'; color = '#60a5fa';
        } else if (severity >= 2) {
          tone = 'Mildly Anxious'; emoji = '😕'; color = '#fbbf24';
        } else if (wps < 0.9) {
          tone = 'Quiet/Sad'; emoji = '😢'; color = '#60a5fa';
        } else {
          tone = 'Calm'; emoji = '😌'; color = '#34d399';
        }

        return { tone, emoji, color, severity, wps: wps.toFixed(1), hesitationRatio: (hesitationRatio * 100).toFixed(0) };
      }

      return { analyse };
    })();

    /* Helper to show a floating voice-tone badge below the mic button */
    function showVoiceToneBadge(result) {
      let badge = document.getElementById('voiceToneBadge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'voiceToneBadge';
        document.body.appendChild(badge);
      }
      badge.className = 'voice-tone-badge show';
      badge.innerHTML = `
    <span class="vtb-icon">${result.emoji}</span>
    <div class="vtb-body">
      <div class="vtb-title">🎙️ Voice Tone Detected</div>
      <div class="vtb-tone" style="color:${result.color}">${result.tone}</div>
      <div class="vtb-meta">${result.wps} WPS · ${result.hesitationRatio}% hesitation</div>
    </div>
  `;
      clearTimeout(badge._timer);
      badge._timer = setTimeout(() => badge.classList.remove('show'), 4500);
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      let speechStartTime = 0;

      recognition.onstart = () => {
        isListening = true;
        speechStartTime = Date.now();
        $('micBtn').classList.add('listening');
        const vti = $('voiceToneIndicator');
        if (vti) {
          vti.style.display = 'flex';
          vti.className = 'voice-tone-indicator listening';
          $('vtiLabel').innerText = '🎙️ Listening to voice tone...';
          $('vtiLabel').style.color = '';
        }
        showToast('Listening... Speak now 🎙️', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const durationSec = (Date.now() - speechStartTime) / 1000;

        // Set the transcribed text in the input
        $('chatInput').value = transcript;

        // ── Phase 1: Show "Analyzing..." for 1.8 seconds ──
        const vti = $('voiceToneIndicator');
        if (vti) {
          vti.style.display = 'flex';
          vti.className = 'voice-tone-indicator analyzing';
          $('vtiLabel').innerText = '⏳ Analyzing voice tone...';
          $('vtiLabel').style.color = 'var(--warn)';
        }

        setTimeout(() => {
          // ── Phase 2: Run the analysis ──
          const result = VoiceToneAnalyzer.analyse(transcript, durationSec);

          if (vti) {
            vti.className = `voice-tone-indicator detected`;
            $('vtiLabel').innerText = `${result.emoji} Tone Detected: ${result.tone}`;
            $('vtiLabel').style.color = result.color;
          }

          // Show the floating badge
          showVoiceToneBadge(result);

          // ── Phase 3: After another 1.5s → send the message ──
          setTimeout(() => {
            if (vti) vti.style.display = 'none';
            // Re-apply neutral class
            if (vti) vti.className = 'voice-tone-indicator';
            sendMessage(null, result.tone);
          }, 1600);
        }, 1800);
      };

      recognition.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        stopListening();
        const vti = $('voiceToneIndicator');
        if (vti) { vti.style.display = 'none'; vti.className = 'voice-tone-indicator'; }
        showToast('Voice identification failed. Please try again.', 'warn');
      };

      recognition.onend = () => {
        stopListening();
        // Only hide VTI if we are not mid-analysis (chatInput empty means user said nothing)
        const vti = $('voiceToneIndicator');
        if (vti && !$('chatInput').value) {
          vti.style.display = 'none';
          vti.className = 'voice-tone-indicator';
        }
      };
    }

    function stopListening() {
      isListening = false;
      if ($('micBtn')) $('micBtn').classList.remove('listening');
      if (recognition) recognition.stop();
    }

    window.toggleMic = function () {
      window.speechSynthesis.cancel(); // Stop AI voice if speaking
      if (!recognition) {
        showToast("Speech Recognition not supported in this browser.", "warn");
        return;
      }
      if (isListening) {
        stopListening();
      } else {
        recognition.start();
      }
    };

    window.toggleVoice = function () {
      window.isVoiceEnabled = !window.isVoiceEnabled;
      localStorage.setItem('mindful_voice_enabled', window.isVoiceEnabled);
      updateVoiceUI();
      
      if (window.isVoiceEnabled) {
        // If unmuting, read the last AI message immediately
        const lastAI = conversationHistory.slice().reverse().find(m => m.role === 'assistant');
        if (lastAI) {
          const cleanTxt = lastAI.content.replace(/^\(Voice tone detected as: [^)]* \| User mood detected as: [^)]*\)\s*-\s*/, '')
                           .replace(/^\(User mood detected as: [^)]*\)\s*-\s*/, '');
          speakText(cleanTxt);
        } else {
          // Fallback to initial greeting if history is empty
          const greetingText = "Hi there! I'm Mira, your real-time mental health companion. How are you feeling right now?";
          speakText(greetingText);
        }
      }
      
      showToast(window.isVoiceEnabled ? "AI Voice Enabled 🔊" : "AI Voice Muted 🔇", "info");
    };

    function updateVoiceUI() {
      const btn = $('voiceToggleBtn');
      const icon = $('voiceIcon');
      if (!btn || !icon) return;
      if (window.isVoiceEnabled) {
        btn.classList.remove('muted');
        icon.textContent = '🔊';
      } else {
        btn.classList.add('muted');
        icon.textContent = '🔇';
        window.speechSynthesis.cancel();
      }
    }

    function speakText(text) {
      if (!('speechSynthesis' in window)) return;
      
      // Stop current speech to avoid overlapping
      window.speechSynthesis.cancel(); 

      // Chrome Fix: 100ms delay between cancel and speak is often necessary
      setTimeout(() => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 1.1; 
        utter.volume = 1.0; // Max volume

        // Visual Feedback via pulsing button
        utter.onstart = () => {
          console.log("Mira is speaking:", text.substring(0, 50) + "...");
          document.getElementById('voiceToggleBtn')?.classList.add('speaking');
        };
        utter.onend = () => document.getElementById('voiceToggleBtn')?.classList.remove('speaking');
        utter.onerror = () => document.getElementById('voiceToggleBtn')?.classList.remove('speaking');

        // Detect language
        if (/[\u0900-\u097F]/.test(text)) utter.lang = 'hi-IN';
        else if (/[\u0980-\u09FF]/.test(text)) utter.lang = 'bn-IN';
        else if (/[\u0B80-\u0BFF]/.test(text)) utter.lang = 'ta-IN';
        else if (/[\u0C00-\u0C7F]/.test(text)) utter.lang = 'te-IN';
        else if (/[\u0A80-\u0AFF]/.test(text)) utter.lang = 'gu-IN';
        else if (/[\u0C80-\u0CFF]/.test(text)) utter.lang = 'kn-IN';
        else if (/[\u0D00-\u0D7F]/.test(text)) utter.lang = 'ml-IN';
        else utter.lang = 'en-IN';

        const voices = window.speechSynthesis.getVoices();
        
        const selectVoice = () => {
          const currentVoices = window.speechSynthesis.getVoices();
          // Try to find a female voice first
          let preferredVoice = currentVoices.find(v => v.lang === utter.lang && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Natural')));

          if (!preferredVoice && utter.lang.startsWith('en')) {
            preferredVoice = currentVoices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.name.includes('Microsoft Zira') || v.name.includes('Hazel'));
          }
          
          if (preferredVoice) utter.voice = preferredVoice;
          window.speechSynthesis.speak(utter);
        };

        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            selectVoice();
            window.speechSynthesis.onvoiceschanged = null;
          };
        } else {
          selectVoice();
        }
      }, 100);
    }

    // Initialize Voice UI on load
    setTimeout(updateVoiceUI, 500);

    /* ─────────────────────────────────────────────
       14. GUIDED JOURNAL ENGINE
    ───────────────────────────────────────────── */
    let journalEntries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
    window.loadPersistedJournals = function () {
      const prefix = currentUserEmail ? `mindful_${currentUserEmail}_` : '';
      journalEntries = JSON.parse(localStorage.getItem(`${prefix}journalEntries`)) || [];
      if (typeof renderJournalEntries === 'function') renderJournalEntries();
    };
    let selectedJournalMood = null;

    window.selectJournalMood = function (btn, emoji) {
      document.querySelectorAll('#journalMoods .mood-emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedJournalMood = emoji;
    };

    window.setJournalPrompt = function (prompt) {
      const input = $('journalInput');
      if (input.value.trim() === '') {
        input.value = prompt + '\n';
      } else {
        input.value += '\n\n' + prompt + '\n';
      }
      input.focus();
    };

    window.saveJournalEntry = function () {
      const content = $('journalInput').value.trim();
      if (!content) {
        showToast("Journal entry cannot be empty", "warn");
        return;
      }

      const entry = {
        id: Date.now().toString(),
        date: getLocalDate(),
        time: nowTime(),
        mood: selectedJournalMood || '😐',
        content: content
      };

      journalEntries.unshift(entry);
      if (typeof window.syncStateToAtlas === 'function') window.syncStateToAtlas();

      // Automagic Sync with Global Mood Tracker!
      let moodVal = 3;
      let moodLabel = 'Okay';
      if (entry.mood === '😄') { moodVal = 5; moodLabel = 'Excellent'; }
      if (entry.mood === '😊') { moodVal = 4; moodLabel = 'Good'; }
      if (entry.mood === '😔') { moodVal = 2; moodLabel = 'Low'; }
      if (entry.mood === '😢') { moodVal = 1; moodLabel = 'Bad'; }

      // Create a mood log representation of this journal
      const newMoodLog = {
        date: entry.date,
        time: entry.time,
        val: moodVal,
        label: moodLabel,
        emoji: entry.mood,
        tags: ['📓 Journal']
      };
      moodLogs.push(newMoodLog);
      if (typeof window.syncStateToAtlas === 'function') window.syncStateToAtlas();

      if (typeof renderMoodAnalytics === 'function') {
        renderMoodAnalytics();
      }

      clearJournalForm();
      renderJournalEntries();
      showToast("Journal entry saved & synced to mood history!", "info");
    };

    window.clearJournalForm = function () {
      $('journalInput').value = '';
      document.querySelectorAll('#journalMoods .mood-emoji-btn').forEach(b => b.classList.remove('active'));
      selectedJournalMood = null;
    };

    window.filterJournalEntries = function (query) {
      renderJournalEntries(query.toLowerCase());
    };

    function renderJournalEntries(filter = '') {
      const list = $('journalEntriesList');
      if (!list) return;

      const filtered = journalEntries.filter(e =>
        e.content.toLowerCase().includes(filter) || e.date.includes(filter) || (e.mood && e.mood.includes(filter))
      );

      if (filtered.length === 0) {
        list.innerHTML = '<p class="empty-history">No entries found. Write your first reflection above! 🌱</p>';
        return;
      }

      list.innerHTML = filtered.map(e => `
    <div class="journal-entry-card" id="journal-entry-${e.id}">
      <div class="je-header">
        <span class="je-emoji">${e.mood}</span>
        <span class="je-date">${e.date} at ${e.time}</span>
        <button class="chat-btn" onclick="deleteJournalEntry('${e.id}')" title="Delete Entry">🗑️</button>
      </div>
      <div class="je-content">${e.content.replace(/\n/g, '<br>')}</div>
    </div>
  `).join('');
    }

    window.deleteJournalEntry = function (id) {
      if (confirm("Are you sure you want to delete this journal entry?")) {
        journalEntries = journalEntries.filter(e => e.id !== id);
        if (typeof window.syncStateToAtlas === 'function') window.syncStateToAtlas();
        renderJournalEntries($('journalSearch') ? $('journalSearch').value.toLowerCase() : '');
        showToast("Entry deleted", "info");
      }
    };

    setTimeout(() => {
      renderJournalEntries();
    }, 600);

    /* ─────────────────────────────────────────────
       15. REAL-TIME EXAM STRESS MODE
    ───────────────────────────────────────────── */

    window.toggleExamMode = function () {
      const tools = $('examTools');
      const btn = $('examModeBtn');
      if (!tools || !btn) return;

      const isActive = tools.style.display !== 'none';
      tools.style.display = isActive ? 'none' : 'flex';
      btn.textContent = isActive ? 'Activate' : 'Deactivate';
      btn.style.background = isActive
        ? 'rgba(99,102,241,0.15)'
        : 'rgba(239,68,68,0.15)';
      btn.style.borderColor = isActive
        ? 'rgba(99,102,241,0.4)'
        : 'rgba(239,68,68,0.4)';
      btn.style.color = isActive ? '#a5b4fc' : '#fca5a5';

      if (!isActive) {
        showToast('Exam Stress Mode activated 📝', 'info');
        tools.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    window.fillExamStress = function (text) {
      const input = $('examStressInput');
      if (input) {
        input.value = text;
        input.focus();
        // Prompt the stress detector check
        const event = new Event('keyup');
        input.dispatchEvent(event);
      }
    };

    let examLastTypingTime = Date.now();
    let examTypingSpeeds = [];

    if ($('examStressInput')) {
      $('examStressInput').addEventListener('keyup', (e) => {
        const indicator = $('examStressIndicator');
        if (!indicator) return;

        // Calculate typing speed (Panic detection)
        const now = Date.now();
        const timeDiff = now - examLastTypingTime;
        examLastTypingTime = now;

        if (timeDiff > 10 && timeDiff < 1000) {
          examTypingSpeeds.push(timeDiff);
          if (examTypingSpeeds.length > 5) examTypingSpeeds.shift();
        }

        let avgSpeed = 500;
        if (examTypingSpeeds.length > 0) {
          avgSpeed = examTypingSpeeds.reduce((a, b) => a + b) / examTypingSpeeds.length;
        }

        if (e.target.value.length === 0) {
          indicator.style.color = 'transparent';
          indicator.style.background = 'transparent';
          return;
        }

        if (avgSpeed < 100) {
          indicator.innerText = "🚨 High Panic Detected - Breathe";
          indicator.style.color = '#fff';
          indicator.style.background = '#ef4444';
        } else if (avgSpeed < 250) {
          indicator.innerText = "⚠️ Anxious Typing";
          indicator.style.color = '#000';
          indicator.style.background = '#fbbf24';
        } else {
          indicator.innerText = "✅ Calm";
          indicator.style.color = '#fff';
          indicator.style.background = '#10b981';
        }

        if (e.key === 'Enter') {
          window.analyzeExamStress();
        }
      });
    }

    window.analyzeExamStress = async function () {
      const input = $('examStressInput');
      const responseDiv = $('examStressResponse');
      const query = input.value.trim();

      if (!query) return;

      responseDiv.style.display = 'block';
      responseDiv.innerHTML = '<i>Mira is analyzing your stress...</i>';

      try {
        const prompt = `You are Mira, a friendly student-focused AI. A student is stressed about exams: "${query}". 
        Give 3 short, pointed, simple bullet points of advice. 
        Use extremely simple words. No long sentences. 
        Format: Bullet points only. Max 50 words total. 
        Tone: Supportive peer.`;

        const token = localStorage.getItem('mindful_jwt');
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }]
          })
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message);
        }

        let reply = data.choices[0].message.content;

        responseDiv.innerHTML = `<strong>Mira says:</strong><br><br>${reply}`;
      } catch (err) {
        console.error(err);
        responseDiv.innerHTML = `<strong>Mira says:</strong><br>I'm having trouble connecting right now (${err.message})<br><br>Please remember: one exam does not define your worth. Take a deep breath, step away for 5 minutes, and try again.`;
      }
    };

    console.log('MindfulAI - All Flaws Patched & Engine Loaded');

    /* ═══════════════════════════════════════
       🎨 FRONTEND UPGRADES: Scroll, Cursor, Back-to-Top, Section Dots
    ═══════════════════════════════════════ */
    // Scroll progress bar
    window.addEventListener('scroll', () => {
      const prog = document.getElementById('scrollProgressBar');
      if (prog) {
        const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        prog.style.width = pct + '%';
      }
      // Back to top
      const btn = document.getElementById('backToTopBtn');
      if (btn) btn.classList.toggle('visible', window.scrollY > 400);
      // Section dots
      document.querySelectorAll('.spd').forEach(dot => {
        const sec = document.getElementById(dot.dataset.target);
        if (!sec) return;
        const r = sec.getBoundingClientRect();
        dot.classList.toggle('active', r.top <= window.innerHeight / 2 && r.bottom > window.innerHeight / 2);
      });
    }, { passive: true });

    // Section dots click
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.spd').forEach(dot => {
        dot.addEventListener('click', () => {
          const sec = document.getElementById(dot.dataset.target);
          if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        });
      });
    });

    // Cursor glow
    document.addEventListener('mousemove', e => {
      const g = document.getElementById('cursorGlow');
      if (g) { g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; }
    });

    // Scroll reveal
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.feature-card, .mood-logger, .mood-chart-area, .journal-compose, .journal-history, .burnout-card, .pomodoro-card, .exam-stress-card, .student-tips-card, .games-arena, .achievements-shelf').forEach(el => {
        el.classList.add('scroll-reveal');
        revealObs.observe(el);
      });
    });

    /* ═══════════════════════════════════════
       🏆 GAME TRACKING
    ═══════════════════════════════════════ */
    // Track games played set
    const gamesPlayed = new Set(JSON.parse(localStorage.getItem('mindful_games_played') || '[]'));
    function markGamePlayed(g) {
      gamesPlayed.add(g);
      localStorage.setItem('mindful_games_played', JSON.stringify([...gamesPlayed]));
    }

    /* ═══════════════════════════════════════
       🎮 GAME SWITCHER
    ═══════════════════════════════════════ */
    window.switchGame = function (name, btn) {
      document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.game-tab-btn').forEach(b => b.classList.remove('active'));
      const panel = document.getElementById('game-' + name);
      if (panel) panel.classList.add('active');
      if (btn) btn.classList.add('active');
      if (name === 'doodle') initDoodle();
    };

    /* ═══════════════════════════════════════
       🌊 GAME 1: ZEN BUBBLE POP
    ═══════════════════════════════════════ */
    let bubbleInterval = null, bubbleScore = 0, bubbleRunning = false, bubbleTimeLeft = 60, bubbleTimer = null;

    window.toggleBubbles = function () {
      if (bubbleRunning) {
        clearInterval(bubbleInterval);
        clearInterval(bubbleTimer);
        bubbleRunning = false;
        document.getElementById('bubbleToggleBtn').textContent = '▶ Start';
        markGamePlayed('bubbles');
      } else {
        const arena = document.getElementById('bubbleArena');
        if (arena.querySelector('.bubble-hint')) arena.querySelector('.bubble-hint').style.display = 'none';
        
        // Reset if starting from beginning or time was up
        if (bubbleTimeLeft <= 0) {
          bubbleScore = 0;
          bubbleTimeLeft = 60;
          document.getElementById('bubbleScore').textContent = '0';
          document.getElementById('bubbleTime').textContent = '60s';
        }

        bubbleRunning = true;
        document.getElementById('bubbleToggleBtn').textContent = '⏸ Pause';
        bubbleInterval = setInterval(spawnBubble, 900);
        
        bubbleTimer = setInterval(() => {
          bubbleTimeLeft--;
          document.getElementById('bubbleTime').textContent = bubbleTimeLeft + 's';
          if (bubbleTimeLeft <= 0) {
            clearInterval(bubbleInterval);
            clearInterval(bubbleTimer);
            bubbleRunning = false;
            document.getElementById('bubbleToggleBtn').textContent = '▶ Start';
            showToast(`Time's up! Final Score: ${bubbleScore} 🫧`, 'info');
            markGamePlayed('bubbles');
          }
        }, 1000);
        
        saveAch('panic_recover'); 
      }
    };

    window.resetBubbles = function () {
      clearInterval(bubbleInterval);
      clearInterval(bubbleTimer);
      bubbleRunning = false;
      bubbleScore = 0;
      bubbleTimeLeft = 60;
      document.getElementById('bubbleScore').textContent = '0';
      document.getElementById('bubbleTime').textContent = '60s';
      document.getElementById('bubbleToggleBtn').textContent = '▶ Start';
      const arena = document.getElementById('bubbleArena');
      arena.querySelectorAll('.zen-bubble').forEach(b => b.remove());
      if (arena.querySelector('.bubble-hint')) arena.querySelector('.bubble-hint').style.display = 'block';
    };

    const BUBBLE_COLORS = [
      ['rgba(126,184,255,0.3)', 'rgba(126,184,255,0.6)'],
      ['rgba(52,211,153,0.3)', 'rgba(52,211,153,0.6)'],
      ['rgba(192,132,252,0.3)', 'rgba(192,132,252,0.6)'],
      ['rgba(255,140,105,0.3)', 'rgba(255,140,105,0.6)'],
      ['rgba(6,239,197,0.3)', 'rgba(6,239,197,0.6)'],
    ];
    const BUBBLE_EMOJIS = ['💧', '🫧', '✨', '🌿', '💙', '🌸', '⭐', '🫀'];

    function spawnBubble() {
      const arena = document.getElementById('bubbleArena');
      if (!arena || !bubbleRunning) return;
      const size = 44 + Math.random() * 44;
      const col = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
      const emoji = BUBBLE_EMOJIS[Math.floor(Math.random() * BUBBLE_EMOJIS.length)];
      const dur = 5 + Math.random() * 5;
      const b = document.createElement('div');
      b.className = 'zen-bubble';
      b.style.cssText = `width:${size}px;height:${size}px;left:${5 + Math.random() * 85}%;bottom:-60px;background:radial-gradient(circle at 35% 35%,${col[1]},${col[0]});box-shadow:0 0 ${size * 0.4}px ${col[0]},inset 0 0 ${size * 0.2}px rgba(255,255,255,0.3);animation-duration:${dur}s;border:1px solid rgba(255,255,255,0.2);`;
      b.textContent = emoji;
      b.onclick = () => popBubble(b);
      arena.appendChild(b);
      setTimeout(() => { if (b.parentNode) b.remove(); }, dur * 1000);
    }

    function popBubble(b) {
      b.classList.add('bubble-pop-anim');
      setTimeout(() => b.remove(), 350);
      bubbleScore++;
      document.getElementById('bubbleScore').textContent = bubbleScore;
      const best = parseInt(localStorage.getItem('bubble_best') || '0');
      if (bubbleScore > best) { localStorage.setItem('bubble_best', bubbleScore); document.getElementById('bubbleBest').textContent = bubbleScore; }
      if (bubbleScore >= 50) saveAch('bubble_popper');
      markGamePlayed('bubbles');
    }

    document.addEventListener('DOMContentLoaded', () => {
      const best = localStorage.getItem('bubble_best') || '0';
      if (document.getElementById('bubbleBest')) document.getElementById('bubbleBest').textContent = best;
    });

    /* ═══════════════════════════════════════
       🧩 GAME 2: MEMORY MATCH
    ═══════════════════════════════════════ */
    const MEM_EMOJIS = ['🌿', '🌸', '🦋', '🌙', '⭐', '🌊'];
    let memFlipped = [], memMatched = 0, memMoves = 0, memLock = false, memTimer = null, memTimeLeft = 60;

    window.startMemoryGame = function () {
      memFlipped = []; memMatched = 0; memMoves = 0; memLock = false; memTimeLeft = 60;
      clearInterval(memTimer);
      document.getElementById('memoryMoves').textContent = '0';
      document.getElementById('memoryMatched').textContent = '0';
      document.getElementById('memoryTime').textContent = '60s';
      const cards = [...MEM_EMOJIS, ...MEM_EMOJIS].sort(() => Math.random() - 0.5);
      const grid = document.getElementById('memoryGrid');
      grid.innerHTML = '';
      cards.forEach((emoji, i) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.emoji = emoji;
        card.innerHTML = `<div class="memory-card-inner"><div class="memory-card-front">🧩</div><div class="memory-card-back">${emoji}</div></div>`;
        card.addEventListener('click', () => flipCard(card));
        grid.appendChild(card);
      });
      memTimer = setInterval(() => { 
        memTimeLeft--; 
        document.getElementById('memoryTime').textContent = memTimeLeft + 's'; 
        if (memTimeLeft <= 0) {
          clearInterval(memTimer);
          memLock = true;
          document.getElementById('memoryGrid').innerHTML = `<div class="memory-win-msg" style="grid-column:1/-1; color: var(--danger);">⌛ Time's Up! You found ${memMatched} pairs.</div>`;
          showToast("Memory Match: Time's up! 🧩", "warn");
        }
      }, 1000);
      markGamePlayed('memory');
    };

    function flipCard(card) {
      if (memLock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
      card.classList.add('flipped');
      memFlipped.push(card);
      if (memFlipped.length === 2) {
        memLock = true; memMoves++;
        document.getElementById('memoryMoves').textContent = memMoves;
        if (memFlipped[0].dataset.emoji === memFlipped[1].dataset.emoji) {
          memFlipped.forEach(c => c.classList.add('matched'));
          memMatched++;
          document.getElementById('memoryMatched').textContent = memMatched;
          memFlipped = []; memLock = false;
          if (memMatched === MEM_EMOJIS.length) {
            clearInterval(memTimer);
            saveAch('memory_ace');
            setTimeout(() => {
              document.getElementById('memoryGrid').innerHTML = `<div class="memory-win-msg" style="grid-column:1/-1;">🎉 Brilliant! ${memMoves} moves in ${60 - memTimeLeft}s!</div>`;
              showToast('Memory game complete! 🧩 Achievement unlocked!', 'info');
            }, 600);
          }
        } else {
          setTimeout(() => { memFlipped.forEach(c => c.classList.remove('flipped')); memFlipped = []; memLock = false; }, 900);
        }
      }
    }

    /* ═══════════════════════════════════════
       ✨ GAME 3: STAR DOODLE
    ═══════════════════════════════════════ */
    let doodleColor = '#7eb8ff', doodleDrawing = false, doodleCtx = null, doodleCanvas = null, doodleUsed = false;

    function initDoodle() {
      doodleCanvas = document.getElementById('doodleCanvas');
      if (!doodleCanvas || doodleCtx) return;
      doodleCanvas.width = doodleCanvas.offsetWidth;
      doodleCanvas.height = doodleCanvas.offsetHeight;
      doodleCtx = doodleCanvas.getContext('2d');
      doodleCtx.fillStyle = '#060810';
      doodleCtx.fillRect(0, 0, doodleCanvas.width, doodleCanvas.height);
      const draw = (x, y) => {
        if (!doodleDrawing) return;
        const sz = parseInt(document.getElementById('brushSize').value) || 6;
        doodleCtx.beginPath();
        doodleCtx.arc(x, y, sz / 2, 0, Math.PI * 2);
        doodleCtx.fillStyle = doodleColor;
        doodleCtx.shadowBlur = sz * 2;
        doodleCtx.shadowColor = doodleColor;
        doodleCtx.fill();
        if (!doodleUsed) { doodleUsed = true; saveAch('artist'); markGamePlayed('doodle'); }
      };
      const pos = (e) => {
        const r = doodleCanvas.getBoundingClientRect();
        if (e.touches) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      doodleCanvas.addEventListener('mousedown', e => { doodleDrawing = true; const p = pos(e); draw(p.x, p.y); });
      doodleCanvas.addEventListener('mousemove', e => { if (!doodleDrawing) return; const p = pos(e); draw(p.x, p.y); });
      doodleCanvas.addEventListener('mouseup', () => doodleDrawing = false);
      doodleCanvas.addEventListener('mouseleave', () => doodleDrawing = false);
      doodleCanvas.addEventListener('touchstart', e => { e.preventDefault(); doodleDrawing = true; const p = pos(e); draw(p.x, p.y); });
      doodleCanvas.addEventListener('touchmove', e => { e.preventDefault(); if (!doodleDrawing) return; const p = pos(e); draw(p.x, p.y); });
      doodleCanvas.addEventListener('touchend', () => doodleDrawing = false);
    }

    window.setDoodleColor = function (c, btn) {
      doodleColor = c;
      document.querySelectorAll('.doodle-color-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    };

    window.clearDoodle = function () {
      if (!doodleCtx || !doodleCanvas) return;
      doodleCtx.fillStyle = '#060810';
      doodleCtx.fillRect(0, 0, doodleCanvas.width, doodleCanvas.height);
    };

    window.saveDoodle = function () {
      if (!doodleCanvas) return;
      const a = document.createElement('a');
      a.download = 'mindfulai-doodle.png';
      a.href = doodleCanvas.toDataURL();
      a.click();
      showToast('Doodle saved! 🎨', 'info');
    };

    /* ═══════════════════════════════════════
       🎯 GAME 4: FOCUS DOTS
    ═══════════════════════════════════════ */
    let focusRunning = false, focusScore = 0, focusMissed = 0, focusTimeLeft = 30, focusInterval = null, focusSpawnInterval = null;

    window.toggleFocusGame = function () {
      if (focusRunning) {
        clearInterval(focusInterval); clearInterval(focusSpawnInterval);
        focusRunning = false;
        document.getElementById('focusToggleBtn').textContent = '▶ Start';
        document.querySelectorAll('.focus-dot').forEach(d => d.remove());
        showToast(`Focus session done! Score: ${focusScore} 🎯`, 'info');
      } else {
        focusScore = 0; focusMissed = 0; focusTimeLeft = 30;
        document.getElementById('focusScore').textContent = '0';
        document.getElementById('focusMissed').textContent = '0';
        document.getElementById('focusTime').textContent = '30s';
        const hint = document.querySelector('#game-focus .focus-hint');
        if (hint) hint.style.display = 'none';
        focusRunning = true;
        document.getElementById('focusToggleBtn').textContent = '⏹ Stop';
        focusInterval = setInterval(() => {
          focusTimeLeft--;
          document.getElementById('focusTime').textContent = focusTimeLeft + 's';
          if (focusTimeLeft <= 0) {
            window.toggleFocusGame();
            if (focusScore >= 20) saveAch('focus_hero');
            markGamePlayed('focus');
          }
        }, 1000);
        const speed = document.getElementById('focusSpeed').value;
        const delay = speed === 'slow' ? 2200 : speed === 'fast' ? 900 : 1500;
        focusSpawnInterval = setInterval(spawnDot, delay);
        markGamePlayed('focus');
      }
    };

    function spawnDot() {
      const arena = document.getElementById('focusArena');
      if (!arena || !focusRunning) return;
      const size = 38 + Math.random() * 30;
      const speed = document.getElementById('focusSpeed').value;
      const life = speed === 'slow' ? 2800 : speed === 'fast' ? 1000 : 1800;
      const DCOLS = ['#7eb8ff', '#a78bfa', '#34d399', '#ff8c69', '#f472b6'];
      const col = DCOLS[Math.floor(Math.random() * DCOLS.length)];
      const d = document.createElement('div');
      d.className = 'focus-dot';
      d.style.cssText = `width:${size}px;height:${size}px;left:${5 + Math.random() * 85}%;top:${10 + Math.random() * 75}%;background:radial-gradient(circle at 35% 35%,${col},rgba(0,0,0,0.2));box-shadow:0 0 ${size * 0.6}px ${col},0 0 ${size * 1.2}px ${col}40;animation-duration:0.25s,${life}ms;border:1.5px solid rgba(255,255,255,0.3);`;
      d.onclick = (e) => {
        d.classList.add('dot-hit-anim');
        focusScore++;
        document.getElementById('focusScore').textContent = focusScore;
        // score popup
        const pop = document.createElement('div');
        pop.className = 'focus-score-popup';
        pop.textContent = '+1';
        pop.style.left = d.style.left;
        pop.style.top = `calc(${d.style.top} - 20px)`;
        arena.appendChild(pop);
        setTimeout(() => pop.remove(), 800);
        setTimeout(() => d.remove(), 300);
        e.stopPropagation();
      };
      arena.appendChild(d);
      setTimeout(() => { if (d.parentNode) { focusMissed++; document.getElementById('focusMissed').textContent = focusMissed; d.remove(); } }, life);
    }

    /* ═══════════════════════════════════════
       🌈 GAME 5: COLOR BREATHING
    ═══════════════════════════════════════ */
    let cbRunning = false, cbPhase = 0, cbCount = 0, cbSessionSec = 0, cbInterval = null, cbSessionInterval = null;
    const CB_PHASES = [
      { label: 'Inhale…', color: 'rgba(30,58,143,0.6)', bg: 'rgba(20,35,80,0.3)', cls: 'inhale', dur: 4000 },
      { label: 'Hold', color: 'rgba(45,74,138,0.5)', bg: 'rgba(25,40,90,0.25)', cls: '', dur: 2000 },
      { label: 'Exhale…', color: 'rgba(15,30,80,0.4)', bg: 'rgba(10,20,50,0.2)', cls: 'exhale', dur: 4000 },
      { label: 'Rest', color: 'rgba(20,40,100,0.35)', bg: 'rgba(12,22,55,0.15)', cls: '', dur: 2000 },
    ];

    window.toggleColorBreath = function () {
      if (cbRunning) {
        clearInterval(cbInterval); clearInterval(cbSessionInterval);
        cbRunning = false;
        document.getElementById('colorBreathBtn').textContent = '▶ Begin';
        const orb = document.getElementById('cbOrb');
        if (orb) { orb.className = 'cb-orb'; orb.style.background = ''; }
        document.getElementById('cbInstruction').textContent = 'Session paused. Great work! 🌈';
        markGamePlayed('colorbreath');
      } else {
        cbRunning = true; cbPhase = 0;
        document.getElementById('colorBreathBtn').textContent = '⏸ Pause';
        cbSessionInterval = setInterval(() => {
          cbSessionSec++;
          const m = Math.floor(cbSessionSec / 60), s = cbSessionSec % 60;
          document.getElementById('breathSessionTime').textContent = `${m}:${s < 10 ? '0' + s : s}`;
        }, 1000);
        runCBPhase();
        markGamePlayed('colorbreath');
      }
    };

    function runCBPhase() {
      if (!cbRunning) return;
      const p = CB_PHASES[cbPhase % CB_PHASES.length];
      const orb = document.getElementById('cbOrb');
      const inst = document.getElementById('cbInstruction');
      if (orb) {
        orb.className = 'cb-orb ' + p.cls;
        orb.style.background = `radial-gradient(circle, ${p.color}, rgba(6,8,16,0.5))`;
      }
      if (inst) inst.textContent = p.label;
      document.querySelectorAll('.cb-swatch').forEach((sw, i) => sw.classList.toggle('active', i === cbPhase % CB_PHASES.length));
      const arena = document.getElementById('colorBreathArena');
      if (arena) arena.style.background = p.bg;
      if (cbPhase % CB_PHASES.length === 2) { // on exhale
        cbCount++;
        document.getElementById('breathSyncCount').textContent = cbCount;
        if (cbCount >= 10) saveAch('breath_sync');
      }
      cbPhase++;
      cbInterval = setTimeout(runCBPhase, p.dur);
    }

    // Hook existing features to achievements
    const _origLogMood = window.logMood;
    if (_origLogMood) window.logMood = function (...a) {
      _origLogMood.apply(this, a);
      const logs = JSON.parse(localStorage.getItem('moodLogs') || '[]');
      if (logs.length >= 1) saveAch('first_step');
    };

    const _origSave = window.saveJournalEntry;
    if (_origSave) window.saveJournalEntry = function (...a) {
      _origSave.apply(this, a);
      const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
      if (entries.length >= 5) saveAch('reflector');
    };

    console.log('🎮 MindfulAI Games + Achievements Loaded!');



    // -------------------------------------------
    // ? PREMIUM ANIMATION ENHANCEMENTS
    // -------------------------------------------

    // Section title underline reveal
    function initSectionTitleAnimations() {
      const titles = document.querySelectorAll('.section-title');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      }, { threshold: 0.4 });
      titles.forEach(t => observer.observe(t));
    }
    document.addEventListener('DOMContentLoaded', initSectionTitleAnimations);

    // Staggered feature card entrance
    function initCardStagger() {
      const cards = document.querySelectorAll('.feature-card, .ach-badge, .mood-logger, .mood-chart-area');
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => {
              e.target.classList.add('visible');
            }, (Array.from(cards).indexOf(e.target)) * 80);
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });
      cards.forEach(c => { c.classList.add('scroll-reveal'); io.observe(c); });
    }
    document.addEventListener('DOMContentLoaded', initCardStagger);

    // Typed counter animation for hero stats
    function animateCounters() {
      document.querySelectorAll('.stat-num').forEach(el => {
        const target = parseInt(el.textContent.replace(/\D/g, ''));
        if (!target) return;
        const suffix = el.textContent.replace(/[\d]/g, '');
        let current = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = current.toLocaleString() + suffix;
          if (current >= target) clearInterval(timer);
        }, 25);
      });
    }
    const heroObserver = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { animateCounters(); heroObserver.disconnect(); }
    }, { threshold: 0.5 });
    const heroEl = document.querySelector('.hero');
    if (heroEl) heroObserver.observe(heroEl);

    // Magnetic hover effect on primary buttons
    document.querySelectorAll('.btn-primary, .game-control-btn, .breathe-start-btn').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });

    console.log('? Premium animations loaded!');

    // -- Click Ripple Effect on all buttons --
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('button, .btn-primary, .suggestion-chip, .mood-tag, .nav-link, .technique-btn, .game-tab-btn');
      if (!btn) return;
      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      const size = Math.max(btn.offsetWidth, btn.offsetHeight);
      const rect = btn.getBoundingClientRect();
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });

    // -- Section title auto-add visible on scroll --
    (function () {
      const titles = document.querySelectorAll('.section-title');
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
      }, { threshold: 0.3 });
      titles.forEach(t => io.observe(t));
    })();

    // -- Breathing circle scale animation on phase --
    const origToggle = window.toggleBreathing;
    if (typeof window.applyBreathPhaseStyle !== 'function') {
      window.applyBreathPhaseStyle = function (phase) {
        const circle = document.getElementById('breatheCircle');
        const ring = document.getElementById('breatheRing');
        const phaseEl = document.getElementById('breathePhase');
        if (!circle) return;
        const styles = {
          inhale: { scale: 'scale(1.15)', bg: 'radial-gradient(circle at 40% 35%, #1a2456, #060810)', glow: '0 0 80px rgba(126,184,255,0.5)', phase: 'rgba(126,184,255,0.1)', border: 'rgba(126,184,255,0.3)', label: 'Breathe In...' },
          hold: { scale: 'scale(1.15)', bg: 'radial-gradient(circle at 40% 35%, #231a44, #060810)', glow: '0 0 80px rgba(167,139,250,0.5)', phase: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', label: 'Hold...' },
          exhale: { scale: 'scale(0.88)', bg: 'radial-gradient(circle at 40% 35%, #0e1a2a, #060810)', glow: '0 0 30px rgba(126,184,255,0.2)', phase: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)', label: 'Breathe Out...' },
          rest: { scale: 'scale(0.88)', bg: 'radial-gradient(circle at 40% 35%, #0d1a1e, #060810)', glow: '0 0 25px rgba(52,211,153,0.2)', phase: 'rgba(52,211,153,0.07)', border: 'rgba(52,211,153,0.2)', label: 'Rest...' }
        };
        const s = styles[phase] || styles.inhale;
        circle.style.transform = s.scale;
        circle.style.background = s.bg;
        if (ring) ring.style.boxShadow = s.glow + ', 0 0 150px rgba(126,184,255,0.08)';
        if (phaseEl) { phaseEl.style.background = s.phase; phaseEl.style.borderColor = s.border; phaseEl.textContent = s.label; }
      };
    }

    console.log('? Heading, breathing, login & ripple upgrades loaded!');

    // ---------------------------------------------------
    // ?? PREMIUM TOAST NOTIFICATION SYSTEM
    // ---------------------------------------------------
    // showToast has been unified and moved to the top of the file
    window.dismissToast = function (el) {
      if (!el || el.classList.contains('hide')) return;
      el.classList.add('hide');
      setTimeout(() => el.remove(), 400);
    };

    // Override old sideNotif calls if they existed
    window.showSideNotif = window.showToast;

    // ---------------------------------------------------
    // ?? GAME TUTORIAL SYSTEM
    // ---------------------------------------------------
    const GAME_TUTORIALS = {
      bubbles: {
        icon: '🫧', title: 'Zen Bubbles',
        desc: 'A gentle mindfulness game — pop rising bubbles to release stress and find calm.',
        steps: [
          { text: 'Click <strong>▶ Start</strong> to begin spawning bubbles.' },
          { text: 'Click or tap any bubble to <strong>pop it</strong> and earn a point.' },
          { text: 'Bubbles rise and fade — <strong>be quick</strong> but stay relaxed.' },
          { text: 'Try to breathe in rhythm with the rising bubbles.' }
        ],
        tip: '💡 <strong>Mindfulness tip:</strong> Each pop is a small release. Imagine your worries floating away with the bubbles.'
      },
      memory: {
        icon: '🧩', title: 'Memory Match',
        desc: 'A calming memory game that sharpens focus and quiets anxious thoughts.',
        steps: [
          { text: 'Click <strong>🔄 New Game</strong> to shuffle and deal the cards.' },
          { text: '<strong>Click a card</strong> to flip it and reveal the emoji.' },
          { text: 'Flip a second card — if they match, they <strong>stay revealed</strong>.' },
          { text: 'Match all pairs with the fewest moves to win!' }
        ],
        tip: '🧠 <strong>Why it helps:</strong> Memory tasks redirect anxious thoughts into focused, calm mental activity.'
      },
      doodle: {
        icon: '✨', title: 'Star Doodle',
        desc: 'A free-form drawing canvas — creative expression is deeply therapeutic.',
        steps: [
          { text: 'Choose a <strong>color</strong> and <strong>brush size</strong> from the toolbar.' },
          { text: 'Click and drag on the canvas to <strong>draw freely</strong>.' },
          { text: 'Use <strong>Undo</strong> to remove the last stroke anytime.' },
          { text: 'Click <strong>Clear</strong> to start a fresh canvas.' }
        ],
        tip: '🎨 <strong>Art therapy:</strong> Even 5 minutes of free drawing can significantly reduce cortisol levels.'
      },
      focus: {
        icon: '🎯', title: 'Focus Dots',
        desc: 'Train your reaction and focus by clicking disappearing dots before they vanish.',
        steps: [
          { text: 'Click <strong>▶ Start</strong> to begin the session.' },
          { text: 'Colored dots appear randomly — <strong>click them</strong> before they disappear.' },
          { text: 'Choose <strong>Slow / Medium / Fast</strong> speed to control difficulty.' },
          { text: 'Your score increases with each dot you catch in time.' }
        ],
        tip: '⏳ <strong>Focus training:</strong> Reaction games build concentration skills and interrupt rumination cycles.'
      },
      colorbreath: {
        icon: '🌈', title: 'Color Breathing',
        desc: 'A visual breathing companion — let the expanding orb guide your breath.',
        steps: [
          { text: 'Click <strong>▶ Start</strong> to begin the guided breathing session.' },
          { text: 'When the orb <strong>expands</strong> — breathe IN slowly.' },
          { text: 'When the orb <strong>shrinks</strong> — breathe OUT gently.' },
          { text: 'Choose a <strong>color palette</strong> below to match your mood.' }
        ],
        tip: '🫁 <strong>Science:</strong> Controlled breathing activates the parasympathetic nervous system, reducing anxiety in minutes.'
      }
    };

    window.showTutorial = function (gameKey) {
      const data = GAME_TUTORIALS[gameKey] || GAME_TUTORIALS.bubbles;
      const modal = document.getElementById('gameTutorialModal');
      const content = document.getElementById('tutorialContent');

      content.innerHTML = `
    <div class="tutorial-header">
      <span class="tutorial-game-icon">${data.icon}</span>
      <div class="tutorial-title">${data.title}</div>
      <div class="tutorial-desc">${data.desc}</div>
    </div>
    <ul class="tutorial-steps">
      ${data.steps.map((s, i) => `
        <li class="tutorial-step" style="animation-delay:${0.08 * i}s">
          <div class="step-num">${i + 1}</div>
          <div class="step-text">${s.text}</div>
        </li>`).join('')}
    </ul>
    <div class="tutorial-tip">${data.tip}</div>
    <button class="tutorial-play-btn" onclick="closeTutorial()">? Got it! Let's Play</button>
  `;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };

    window.closeTutorial = function () {
      const modal = document.getElementById('gameTutorialModal');
      modal.style.opacity = '0';
      setTimeout(() => { modal.style.display = 'none'; modal.style.opacity = ''; document.body.style.overflow = ''; }, 300);
    };

    // ---------------------------------------------------
    // ? HERO STAR PARTICLES
    // ---------------------------------------------------
    (function spawnStars() {
      const hero = document.querySelector('.hero');
      if (!hero) return;
      for (let i = 0; i < 18; i++) {
        const s = document.createElement('div');
        s.className = 'star-particle';
        const size = 1 + Math.random() * 2.5;
        s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%; top:${Math.random() * 100}%;
      --dur:${2 + Math.random() * 4}s; --delay:${Math.random() * 4}s;
      opacity:${0.2 + Math.random() * 0.5};
    `;
        hero.appendChild(s);
      }
    })();

    // ---------------------------------------------------
    // ?? MOBILE MENU CLOSE ON LINK CLICK
    // ---------------------------------------------------
    document.querySelectorAll('.mobile-menu a').forEach(a => {
      a.addEventListener('click', () => {
        document.getElementById('mobileMenu')?.classList.remove('open');
      });
    });

    // ---------------------------------------------------
    // ?? SHOW TOAST ON KEY EVENTS (replaces old notifs)
    // ---------------------------------------------------
    // Intercept login success/failure if not already handled
    const _origHandleAuth = window.handleAuth;
    if (typeof _origHandleAuth === 'function') {
      window.handleAuth = async function (e) {
        const result = await _origHandleAuth.call(this, e);
        return result;
      };
    }

    // Welcome toast on page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        showToast({ title: 'Welcome to MindfulAI 🌿', msg: 'Your mental wellness companion is ready.', type: 'info', duration: 4500 });
      }, 1200);
    });

    console.log('✨ Tutorial, Toast, Stars & Mobile loaded!');

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          console.log('Service Worker registered successfully');
        }).catch(err => {
          console.warn('Service Worker registration failed:', err);
        });
      });
    }

    // ---------------------------------------------------
    // 📥 EXPORT DATA (CSV)
    // ---------------------------------------------------
    window.exportDataCSV = function () {
      if (!moodLogs || moodLogs.length === 0) {
        showToast("No mood logs found to export.", "warn");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Type,Date,Score,Mood,Note,Tags\n";

      // Add Moods
      moodLogs.forEach(log => {
        const d = new Date(log.date).toLocaleDateString();
        const tags = Array.isArray(log.tags) ? log.tags.join(';') : '';
        const note = (log.note || '').replace(/,/g, ''); // basic escape
        csvContent += `Mood,${d},${log.score},${log.label},${note},${tags}\n`;
      });

      // Add Journals if any
      if (journalEntries && journalEntries.length > 0) {
        journalEntries.forEach(entry => {
          const d = entry.date;
          const text = (entry.text || '').replace(/,/g, ' ').replace(/\n/g, ' '); // basic escape
          csvContent += `Journal,${d},,,${text},\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `MindfulAI_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Your data has been exported securely.", "success");
    };

    /* ------------------------------------------------------
       🎯 POMODORO TIMER & STRICT FOCUS MODE
       ------------------------------------------------------ */
    let pomodoroSeconds = 25 * 60;
    let pomodoroInterval = null;
    let isBreak = false;

    window.togglePomodoro = function() {
      if (pomodoroInterval) {
        stopPomodoro();
      } else {
        startPomodoro();
      }
    };

    window.startPomodoro = function() {
      if (pomodoroInterval) return;
      
      // Update UI for running state
      document.body.classList.add('strict-focus-frozen');
      document.getElementById('pomodoroBtn').textContent = 'Stop Focus';
      document.getElementById('pomodoroBtn').style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
      document.getElementById('pomodoroBtn').style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.4)';
      
      showToast(isBreak ? "Break started! Rest well." : "Focus mode active! No distractions allowed.", "info");

      pomodoroInterval = setInterval(() => {
        pomodoroSeconds--;
        updatePomodoroUI();

        if (pomodoroSeconds <= 0) {
          clearInterval(pomodoroInterval);
          pomodoroInterval = null;
          isBreak = !isBreak;
          pomodoroSeconds = isBreak ? 5 * 60 : 25 * 60;
          
          document.body.classList.remove('strict-focus-frozen');
          updatePomodoroUI();
          
          const msg = isBreak ? "Focus session complete! Time for a 5-minute break. ☕" : "Break over! Ready to focus? 🎯";
          showToast(msg, "success");
          
          // Sound or notification can be added here
          if ('Notification' in window && Notification.permission === 'granted') {
             new Notification("MindfulAI Focus", { body: msg });
          }
        }
      }, 1000);
    };

    window.stopPomodoro = function() {
      clearInterval(pomodoroInterval);
      pomodoroInterval = null;
      document.body.classList.remove('strict-focus-frozen');
      
      const btn = document.getElementById('pomodoroBtn');
      btn.textContent = 'Start Focus';
      btn.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
      btn.style.boxShadow = '0 4px 20px rgba(168,85,247,0.4)';
      
      showToast("Focus session paused. Website unfrozen.", "info");
    };

    window.resetPomodoro = function() {
      stopPomodoro();
      isBreak = false;
      pomodoroSeconds = 25 * 60;
      updatePomodoroUI();
      document.getElementById('pomodoroPhase').textContent = 'Study Session';
      showToast("Timer reset to 25 minutes.", "info");
    };

    function updatePomodoroUI() {
      const display = document.getElementById('pomodoroDisplay');
      const phase = document.getElementById('pomodoroPhase');
      
      const mins = Math.floor(pomodoroSeconds / 60);
      const secs = pomodoroSeconds % 60;
      display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      if (pomodoroInterval) {
        phase.textContent = isBreak ? "☕ Break Time" : "🎯 Focusing...";
        phase.classList.add('timer-running-anim');
      } else {
        phase.textContent = isBreak ? "Rest Complete" : "Ready to Focus?";
        phase.classList.remove('timer-running-anim');
      }
    }
/* ─────────────────────────────────────────────
   BURNOUT SELF-ASSESSMENT
───────────────────────────────────────────── */
(function initBurnoutAssessment() {
  const questions = [
    { id: 'bq1', text: 'I feel emotionally drained by my studies or work.' },
    { id: 'bq2', text: 'I feel overwhelmed by deadlines or responsibilities.' },
    { id: 'bq3', text: 'I have been sleeping poorly or feeling fatigued.' },
  ];

  // 3 options only: value 0, 1, 2
  const labels = ['No', 'Sometimes', 'Yes'];

  function render() {
    const container = document.getElementById('burnoutQuestions');
    if (!container) return;
    container.innerHTML = questions.map(q => `
      <div class="bq-item" style="margin-bottom:1rem;">
        <p style="font-size:0.88rem;color:var(--text-1);margin-bottom:0.5rem;line-height:1.4;">${q.text}</p>
        <div style="display:flex;gap:0.4rem;">
          ${labels.map((lbl, i) => `
            <label style="display:flex;align-items:center;cursor:pointer;
              background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
              border-radius:7px;padding:0.28rem 0.8rem;font-size:0.78rem;color:var(--text-2);
              transition:0.2s;" class="bq-option">
              <input type="radio" name="${q.id}" value="${i}" style="display:none;">
              <span>${lbl}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const siblings = container.querySelectorAll(`input[name="${radio.name}"]`);
        siblings.forEach(s => {
          s.parentElement.style.background = 'rgba(255,255,255,0.04)';
          s.parentElement.style.borderColor = 'rgba(255,255,255,0.08)';
          s.parentElement.style.color = 'var(--text-2)';
        });
        radio.parentElement.style.background = 'rgba(126,184,255,0.15)';
        radio.parentElement.style.borderColor = 'rgba(126,184,255,0.5)';
        radio.parentElement.style.color = '#fff';
      });
    });
  }

  window.checkBurnout = function () {
    const container = document.getElementById('burnoutQuestions');
    const result = document.getElementById('burnoutResult');
    if (!container || !result) return;

    let total = 0, answered = 0;
    questions.forEach(q => {
      const sel = container.querySelector(`input[name="${q.id}"]:checked`);
      if (sel) { total += parseInt(sel.value, 10); answered++; }
    });

    if (answered < questions.length) {
      showToast('Please answer all 3 questions first.', 'warn');
      return;
    }

    // max = 3 questions × 2 (max value) = 6
    const pct = Math.round((total / 6) * 100);

    let label, color, emoji;
    if (pct === 0)       { label = 'Very Low';    color = '#34d399'; emoji = '🌱'; }
    else if (pct <= 33)  { label = 'Low Risk';    color = '#6ee7b7'; emoji = '😌'; }
    else if (pct <= 66)  { label = 'Moderate';    color = '#fbbf24'; emoji = '⚠️'; }
    else if (pct < 100)  { label = 'High Risk';   color = '#f97316'; emoji = '🔥'; }
    else                 { label = 'Critical';    color = '#f43f5e'; emoji = '🆘'; }

    result.style.display = 'block';
    result.innerHTML = `
      <div style="margin-top:0.8rem;display:inline-flex;align-items:center;gap:0.6rem;
        padding:0.45rem 1.1rem;border-radius:100px;
        background:${color}18;border:1px solid ${color}55;
        animation:popIn 0.35s ease;">
        <span style="font-size:1rem;">${emoji}</span>
        <span style="font-size:0.95rem;font-weight:700;color:${color};">${label}</span>
        <button onclick="document.getElementById('burnoutResult').style.display='none';window.initBurnoutRender();"
          style="margin-left:0.4rem;background:none;border:none;color:${color};cursor:pointer;font-size:0.75rem;opacity:0.7;">↺</button>
      </div>
    `;
  };

  window.initBurnoutRender = render;
  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
})();

/* ─────────────────────────────────────────────
   MOOD HEATMAP CALENDAR
───────────────────────────────────────────── */
(function initMoodHeatmap() {
  const MOOD_COLORS = {
    excellent: { bg: '#22c55e', label: 'Great' },
    good:      { bg: '#86efac', label: 'Good' },
    okay:      { bg: '#facc15', label: 'Okay' },
    low:       { bg: '#fb923c', label: 'Low' },
    bad:       { bg: '#f43f5e', label: 'Very Low' },
    neutral:   { bg: 'rgba(255,255,255,0.07)', label: '' },
  };

  function moodToKey(mood) {
    if (!mood) return 'neutral';
    const m = mood.toLowerCase();
    if (m.includes('great') || m.includes('excellent') || m.includes('amazing')) return 'excellent';
    if (m.includes('good') || m.includes('happy'))                                return 'good';
    if (m.includes('okay') || m.includes('ok') || m.includes('neutral'))         return 'okay';
    if (m.includes('low') || m.includes('sad') || m.includes('stress') || m.includes('anxi')) return 'low';
    if (m.includes('bad') || m.includes('terrible') || m.includes('depress'))    return 'bad';
    return 'neutral';
  }

  function buildMoodMap() {
    const map = {};
    if (typeof moodLogs !== 'undefined' && Array.isArray(moodLogs)) {
      moodLogs.forEach(log => {
        const d = log.date ? log.date.slice(0, 10) : null;
        if (d) map[d] = moodToKey(log.label || log.mood || log.emotion || '');
      });
    }
    return map;
  }

  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  function renderCalendar() {
    const grid  = document.getElementById('moodHeatmapCalendar');
    const label = document.getElementById('heatmapMonthLbl');
    if (!grid || !label) return;

    label.textContent = MONTH_NAMES[currentMonth] + ' ' + currentYear;

    const moodMap   = buildMoodMap();
    const firstDay  = new Date(currentYear, currentMonth, 1);
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    grid.innerHTML = '';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:0.5rem;';

    for (let i = 0; i < startOffset; i++) {
      const blank = document.createElement('div');
      blank.style.height = '30px';
      grid.appendChild(blank);
    }

    const t = new Date();
    const todayKey = t.getFullYear() + '-' +
      String(t.getMonth()+1).padStart(2,'0') + '-' +
      String(t.getDate()).padStart(2,'0');

    for (let day = 1; day <= totalDays; day++) {
      const dateKey = currentYear + '-' +
        String(currentMonth+1).padStart(2,'0') + '-' +
        String(day).padStart(2,'0');

      const key   = moodMap[dateKey] || 'neutral';
      const color = MOOD_COLORS[key];
      const isToday = dateKey === todayKey;

      const cell = document.createElement('div');
      cell.title = color.label ? (dateKey + ': ' + color.label) : dateKey;
      cell.style.cssText = [
        'height:30px', 'border-radius:6px',
        'background:' + color.bg,
        'display:flex', 'align-items:center', 'justify-content:center',
        'font-size:0.68rem', 'font-weight:600',
        'color:' + (key === 'neutral' ? 'rgba(255,255,255,0.25)' : '#111'),
        'cursor:default', 'transition:transform 0.15s',
        isToday ? 'outline:2px solid #818cf8;outline-offset:2px' : ''
      ].join(';');
      cell.textContent = day;

      cell.addEventListener('mouseenter', () => {
        cell.style.transform = 'scale(1.18)';
        cell.style.zIndex = '5';
      });
      cell.addEventListener('mouseleave', () => {
        cell.style.transform = 'scale(1)';
        cell.style.zIndex = '';
      });

      grid.appendChild(cell);
    }
  }

  window.heatmapChangeMonth = function(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0;  currentYear++; }
    if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
    renderCalendar();
  };

  window.refreshMoodHeatmap = renderCalendar;

  document.addEventListener('DOMContentLoaded', renderCalendar);
  if (document.readyState !== 'loading') renderCalendar();
})();
