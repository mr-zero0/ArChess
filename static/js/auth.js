/**
 * ARCHESS - Client-Side Authentication & Player Profile Manager
 * Manages player login state, ELO badges, auth modals, and session sync with Flask backend.
 */

window.ArchessAuth = {
  currentUser: null,

  async init() {
    this.injectAuthModal();
    this.setupListeners();
    await this.checkAuthStatus();
  },

  async checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        this.currentUser = data.user;
        this.renderUserBadge();
      } else {
        this.currentUser = null;
        this.renderAuthButtons();
      }
    } catch (e) {
      console.warn('Auth check skipped (offline or server starting)');
      this.renderAuthButtons();
    }
  },

  renderUserBadge() {
    const authContainer = document.getElementById('navAuthContainer');
    if (!authContainer) return;

    authContainer.innerHTML = `
      <div class="user-profile-badge" id="userProfileBadge">
        <div class="user-avatar-disc">♞</div>
        <div class="user-info-text">
          <span class="user-name-label">${this.currentUser.username}</span>
          <span class="user-elo-tag">${this.currentUser.elo_rating} ELO</span>
        </div>
        <button class="btn-logout-mini" id="navLogoutBtn" title="Log Out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    `;

    const logoutBtn = document.getElementById('navLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.logout();
      });
    }
  },

  renderAuthButtons() {
    const authContainer = document.getElementById('navAuthContainer');
    if (!authContainer) return;

    authContainer.innerHTML = `
      <button class="btn-ghost open-auth-btn" data-auth-mode="login">Sign In</button>
      <button class="btn-gold open-auth-btn" data-auth-mode="register">
        <span>Play Free</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    `;

    document.querySelectorAll('.open-auth-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-auth-mode') || 'login';
        this.openModal(mode);
      });
    });
  },

  openModal(mode = 'login') {
    const modal = document.getElementById('accountAuthModal');
    if (!modal) return;

    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const formLogin = document.getElementById('authFormLogin');
    const formRegister = document.getElementById('authFormRegister');

    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.style.display = 'block';
      formLogin.style.display = 'none';
    }

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('accountAuthModal');
    if (modal) modal.classList.remove('active');
  },

  async login(identifier, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username_or_email: identifier, identifier, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      this.currentUser = data.user;
      this.renderUserBadge();
      this.closeModal();
      this.showToast(`Welcome back, ${data.user.username}! (ELO: ${data.user.elo_rating})`);
    } catch (err) {
      alert(err.message);
    }
  },

  async register(username, email, password) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      this.currentUser = data.user;
      this.renderUserBadge();
      this.closeModal();
      this.showToast(`Account created! Welcome Grandmaster ${data.user.username}!`);
    } catch (err) {
      alert(err.message);
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      this.currentUser = null;
      this.renderAuthButtons();
      this.showToast('Logged out successfully');
    } catch (err) {}
  },

  injectAuthModal() {
    if (document.getElementById('accountAuthModal')) return;

    const modalHtml = `
      <div class="modal-backdrop" id="accountAuthModal" role="dialog" aria-modal="true">
        <div class="modal-dialog auth-dialog">
          <button class="modal-close-btn" id="closeAccountAuthModal">&times;</button>
          
          <div class="auth-header-tabs">
            <button class="auth-tab-btn active" id="authTabLogin">Sign In</button>
            <button class="auth-tab-btn" id="authTabRegister">Create Account</button>
          </div>

          <!-- Login Form -->
          <form id="authFormLogin" class="auth-form-body">
            <div class="auth-input-group">
              <label>Username or Email</label>
              <input type="text" id="loginIdentifier" class="auth-text-input" placeholder="e.g. magnus@archess.gg" required>
            </div>
            <div class="auth-input-group">
              <label>Password</label>
              <input type="password" id="loginPassword" class="auth-text-input" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn-gold auth-submit-btn">
              <span>Enter Battlefield</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <div class="auth-demo-hint">Demo login: <code>Magnus_Kinetic</code> / <code>password123</code></div>
          </form>

          <!-- Register Form -->
          <form id="authFormRegister" class="auth-form-body" style="display: none;">
            <div class="auth-input-group">
              <label>Player Username</label>
              <input type="text" id="regUsername" class="auth-text-input" placeholder="e.g. Knight_Striker" required>
            </div>
            <div class="auth-input-group">
              <label>Email Address</label>
              <input type="email" id="regEmail" class="auth-text-input" placeholder="you@domain.com" required>
            </div>
            <div class="auth-input-group">
              <label>Password (min 6 chars)</label>
              <input type="password" id="regPassword" class="auth-text-input" placeholder="••••••••" minlength="6" required>
            </div>
            <button type="submit" class="btn-gold auth-submit-btn">
              <span>Register & Start at 1200 ELO</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  setupListeners() {
    const modal = document.getElementById('accountAuthModal');
    const closeBtn = document.getElementById('closeAccountAuthModal');
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const formLogin = document.getElementById('authFormLogin');
    const formRegister = document.getElementById('authFormRegister');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.style.display = 'block';
        formLogin.style.display = 'none';
      });
    }

    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('loginIdentifier').value;
        const pass = document.getElementById('loginPassword').value;
        this.login(id, pass);
      });
    }

    if (formRegister) {
      formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPassword').value;
        this.register(user, email, pass);
      });
    }
  },

  showToast(message) {
    let toast = document.querySelector('.toast-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="color:var(--gold-bright);">✦</span> ${message}`;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.ArchessAuth.init();
});
