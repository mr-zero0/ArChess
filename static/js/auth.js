/**
 * ARCHESS - Client-Side Authentication & Player Profile Manager
 * Manages player login state, ELO badges, auth modals, Google Sign-In,
 * and comprehensive Account Management (Avatar, Username, Password, Career Stats).
 */

window.ArchessAuth = {
  currentUser: null,
  selectedAvatar: 'knight',

  AVATAR_GLYPHS: {
    knight: '♞',
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    citadel: '🏰',
    phoenix: '🔥',
    sovereign: '👑',
    pawn: '♟'
  },

  async init() {
    this.injectAuthModal();
    this.injectAccountModal();
    this.setupListeners();
    this.setupGoogleAuthClient();
    await this.checkAuthStatus();
  },

  async checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        this.currentUser = data.user;
        this.selectedAvatar = data.user.avatar || 'knight';
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

    const glyph = this.AVATAR_GLYPHS[this.currentUser.avatar] || '♞';

    const adminPill = (this.currentUser && this.currentUser.is_admin)
      ? `<a href="/admin" class="btn-admin-nav-pill" id="navAdminDashboardLink" title="Command Center">🛡️ Admin</a>`
      : '';

    authContainer.innerHTML = `
      <div class="user-profile-badge" id="userProfileBadge" title="Account Settings & Commander Dossier">
        <div class="user-avatar-disc" id="navUserAvatarDisc">${glyph}</div>
        <div class="user-info-text">
          <span class="user-name-label" id="navUserNameLabel">${this.currentUser.username}</span>
          <span class="user-elo-tag" id="navUserEloTag">${this.currentUser.elo_rating} ELO</span>
        </div>
        ${adminPill}
        <button class="btn-logout-mini" id="navLogoutBtn" title="Log Out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    `;

    const badge = document.getElementById('userProfileBadge');
    if (badge) {
      badge.addEventListener('click', (e) => {
        if (e.target.closest('#navLogoutBtn')) return;
        this.openAccountModal();
      });
    }

    const logoutBtn = document.getElementById('navLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.logout();
      });
    }

    // Synchronize commander card on play page if present
    const whitePlayerName = document.getElementById('whitePlayerName');
    const whitePlayerSub = document.getElementById('whitePlayerSub');
    if (whitePlayerName && this.currentUser) {
      whitePlayerName.textContent = this.currentUser.username;
    }
    if (whitePlayerSub && this.currentUser) {
      whitePlayerSub.textContent = `White Army • ${this.currentUser.elo_rating} ELO`;
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

    const whitePlayerName = document.getElementById('whitePlayerName');
    const whitePlayerSub = document.getElementById('whitePlayerSub');
    if (whitePlayerName) whitePlayerName.textContent = 'Player 1';
    if (whitePlayerSub) whitePlayerSub.textContent = 'White Army • 1200 ELO';

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

  openAccountModal() {
    if (!this.currentUser) {
      this.openModal('login');
      return;
    }
    const modal = document.getElementById('accountManagementModal');
    if (!modal) return;

    this.populateAccountModal();
    modal.classList.add('active');
  },

  closeAccountModal() {
    const modal = document.getElementById('accountManagementModal');
    if (modal) modal.classList.remove('active');
  },

  populateAccountModal() {
    if (!this.currentUser) return;

    // Set Avatar and Header info
    const glyph = this.AVATAR_GLYPHS[this.currentUser.avatar] || '♞';
    const modalAvatar = document.getElementById('accModalAvatarDisplay');
    if (modalAvatar) modalAvatar.textContent = glyph;

    const modalUser = document.getElementById('accModalUsernameDisplay');
    if (modalUser) modalUser.textContent = this.currentUser.username;

    const modalElo = document.getElementById('accModalEloDisplay');
    if (modalElo) modalElo.textContent = `${this.currentUser.elo_rating} ELO`;

    const inputUser = document.getElementById('accUsernameInput');
    if (inputUser) inputUser.value = this.currentUser.username;

    this.selectedAvatar = this.currentUser.avatar || 'knight';

    // Highlight active avatar item
    document.querySelectorAll('.avatar-picker-item').forEach(item => {
      if (item.getAttribute('data-avatar') === this.selectedAvatar) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Populate Career Stats tab
    const total = this.currentUser.matches_played || 0;
    const wins = this.currentUser.wins || 0;
    const losses = this.currentUser.losses || 0;
    const draws = Math.max(0, total - (wins + losses));
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

    const statElo = document.getElementById('accStatElo');
    if (statElo) statElo.textContent = this.currentUser.elo_rating;

    const statTier = document.getElementById('accStatTier');
    if (statTier) {
      const elo = this.currentUser.elo_rating;
      statTier.textContent = elo >= 2700 ? 'Grandmaster' : (elo >= 2400 ? 'Master' : 'Contender');
    }

    const statMatches = document.getElementById('accStatMatches');
    if (statMatches) statMatches.textContent = total;

    const statWld = document.getElementById('accStatWLD');
    if (statWld) statWld.textContent = `${wins}W / ${losses}L / ${draws}D`;

    const statRate = document.getElementById('accStatWinRate');
    if (statRate) statRate.textContent = `${winRate}%`;

    const statProvider = document.getElementById('accStatProvider');
    if (statProvider) {
      statProvider.textContent = (this.currentUser.auth_provider === 'google') ? 'Google Connected' : 'Standard Local';
    }
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
      this.selectedAvatar = data.user.avatar || 'knight';
      this.renderUserBadge();
      this.closeModal();
      this.showToast(`Welcome back, ${data.user.username}! (${data.user.elo_rating} ELO)`, 'success');
    } catch (err) {
      this.showToast(err.message || 'Authentication failed', 'error');
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
      this.selectedAvatar = data.user.avatar || 'knight';
      this.renderUserBadge();
      this.closeModal();
      this.showToast(`Account created! Welcome Grandmaster ${data.user.username}!`, 'success');
    } catch (err) {
      this.showToast(err.message || 'Registration failed', 'error');
    }
  },

  async loginWithGoogle(credentialOrPayload) {
    try {
      const payload = typeof credentialOrPayload === 'string'
        ? { credential: credentialOrPayload }
        : credentialOrPayload;

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google authentication failed');

      this.currentUser = data.user;
      this.selectedAvatar = data.user.avatar || 'knight';
      this.renderUserBadge();
      this.closeModal();
      this.showToast(`Google Sign-In successful! Welcome ${data.user.username}!`, 'success');
    } catch (err) {
      this.showToast(err.message || 'Google Sign-In failed', 'error');
    }
  },

  setupGoogleAuthClient() {
    const clientId = window.ARCHESS_GOOGLE_CLIENT_ID;
    if (window.google && window.google.accounts && window.google.accounts.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response && response.credential) {
              this.loginWithGoogle(response.credential);
            }
          }
        });
      } catch (e) {
        console.warn('Google Identity initialization notice:', e);
      }
    }
  },

  triggerGoogleSignIn() {
    const clientId = window.ARCHESS_GOOGLE_CLIENT_ID;
    if (window.google && window.google.accounts && window.google.accounts.id && clientId) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification && notification.isNotDisplayed()) {
            this.showToast('Please enable popups or select account in Google dialog.', 'info');
          }
        });
        return;
      } catch (e) {
        console.warn('Google One-Tap prompt notice:', e);
      }
    }

    if (!clientId) {
      this.showToast('Google Sign-In is not configured on this server. Please use Email Sign-In.', 'warning');
      return;
    }

    this.showToast('Connecting to Google Identity Services...', 'info');
  },

  async updateProfile(newUsername, newAvatar) {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, avatar: newAvatar }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      this.currentUser = data.user;
      this.selectedAvatar = data.user.avatar;
      this.renderUserBadge();
      this.populateAccountModal();
      this.showToast('Profile and avatar updated successfully!', 'success');
    } catch (err) {
      this.showToast(err.message || 'Profile update failed', 'error');
    }
  },

  async updatePassword(currentPassword, newPassword) {
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      this.showToast('Password updated securely!', 'success');
      const form = document.getElementById('accPasswordForm');
      if (form) form.reset();
    } catch (err) {
      this.showToast(err.message || 'Password update failed', 'error');
    }
  },

  async deleteAccount() {
    if (!confirm('Are you sure you want to permanently delete your commander account? This action is irreversible.')) {
      return;
    }
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      this.currentUser = null;
      this.closeAccountModal();
      this.renderAuthButtons();
      this.showToast('Commander account has been deleted.', 'info');
    } catch (err) {
      this.showToast(err.message || 'Account deletion failed', 'error');
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

          <!-- Social Google Sign-In Option -->
          <div class="auth-social-wrap">
            <button type="button" class="btn-google-auth" id="btnGoogleAuth">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <div class="auth-or-separator"><span>OR WITH EMAIL</span></div>
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

  injectAccountModal() {
    if (document.getElementById('accountManagementModal')) return;

    const modalHtml = `
      <div class="modal-backdrop" id="accountManagementModal" role="dialog" aria-modal="true">
        <div class="modal-dialog account-mgmt-dialog">
          <button class="modal-close-btn" id="closeAccountMgmtModal">&times;</button>

          <div class="acc-mgmt-header">
            <div class="acc-avatar-preview-wrap">
              <div class="acc-avatar-large" id="accModalAvatarDisplay">♞</div>
            </div>
            <div class="acc-header-details">
              <span class="acc-eyebrow">COMMANDER PROFILE</span>
              <h2 class="acc-title" id="accModalUsernameDisplay">Commander</h2>
              <div class="acc-elo-chip" id="accModalEloDisplay">1200 ELO</div>
            </div>
          </div>

          <!-- Account Tabs -->
          <div class="acc-tabs-nav">
            <button class="acc-tab-btn active" data-acc-tab="profile">Profile & Avatar</button>
            <button class="acc-tab-btn" data-acc-tab="security">Security</button>
            <button class="acc-tab-btn" data-acc-tab="career">Career Stats</button>
            <button class="acc-tab-btn" data-acc-tab="danger">Danger Zone</button>
          </div>

          <!-- Tab 1: Profile & Avatar -->
          <div class="acc-tab-content active" id="accTabContentProfile">
            <div class="acc-section-block">
              <label class="acc-label">Select Tactical Avatar</label>
              <div class="avatar-picker-grid">
                <button type="button" class="avatar-picker-item" data-avatar="knight" title="Knight">♞</button>
                <button type="button" class="avatar-picker-item" data-avatar="king" title="King">♔</button>
                <button type="button" class="avatar-picker-item" data-avatar="queen" title="Queen">♕</button>
                <button type="button" class="avatar-picker-item" data-avatar="rook" title="Rook">♖</button>
                <button type="button" class="avatar-picker-item" data-avatar="bishop" title="Bishop">♗</button>
                <button type="button" class="avatar-picker-item" data-avatar="citadel" title="Citadel">🏰</button>
                <button type="button" class="avatar-picker-item" data-avatar="phoenix" title="Phoenix">🔥</button>
                <button type="button" class="avatar-picker-item" data-avatar="sovereign" title="Sovereign">👑</button>
              </div>
            </div>

            <form id="accProfileForm" class="acc-form">
              <div class="auth-input-group">
                <label>Callsign / Username</label>
                <input type="text" id="accUsernameInput" class="auth-text-input" minlength="3" maxlength="50" required>
              </div>
              <button type="submit" class="btn-gold acc-action-btn">
                <span>Save Profile Changes</span>
              </button>
            </form>
          </div>

          <!-- Tab 2: Security & Password -->
          <div class="acc-tab-content" id="accTabContentSecurity" style="display: none;">
            <form id="accPasswordForm" class="acc-form">
              <div class="auth-input-group">
                <label>Current Password</label>
                <input type="password" id="accCurrentPassword" class="auth-text-input" placeholder="••••••••" required>
              </div>
              <div class="auth-input-group">
                <label>New Password (min 6 chars)</label>
                <input type="password" id="accNewPassword" class="auth-text-input" placeholder="••••••••" minlength="6" required>
              </div>
              <div class="auth-input-group">
                <label>Confirm New Password</label>
                <input type="password" id="accConfirmPassword" class="auth-text-input" placeholder="••••••••" minlength="6" required>
              </div>
              <button type="submit" class="btn-gold acc-action-btn">
                <span>Update Password</span>
              </button>
            </form>
          </div>

          <!-- Tab 3: Career Stats -->
          <div class="acc-tab-content" id="accTabContentCareer" style="display: none;">
            <div class="acc-stats-matrix">
              <div class="acc-stat-box">
                <span class="acc-stat-val" id="accStatElo">1200</span>
                <span class="acc-stat-lbl">ELO Rating</span>
              </div>
              <div class="acc-stat-box">
                <span class="acc-stat-val" id="accStatTier">Contender</span>
                <span class="acc-stat-lbl">Tier Division</span>
              </div>
              <div class="acc-stat-box">
                <span class="acc-stat-val" id="accStatMatches">0</span>
                <span class="acc-stat-lbl">Total Battles</span>
              </div>
              <div class="acc-stat-box">
                <span class="acc-stat-val" id="accStatWLD">0W / 0L / 0D</span>
                <span class="acc-stat-lbl">Record</span>
              </div>
              <div class="acc-stat-box">
                <span class="acc-stat-val" id="accStatWinRate">0.0%</span>
                <span class="acc-stat-lbl">Win Ratio</span>
              </div>
              <div class="acc-stat-box">
                <span class="acc-stat-val" id="accStatProvider">Standard Local</span>
                <span class="acc-stat-lbl">Authentication</span>
              </div>
            </div>
          </div>

          <!-- Tab 4: Danger Zone -->
          <div class="acc-tab-content" id="accTabContentDanger" style="display: none;">
            <div class="acc-danger-card">
              <h4>Permanent Account Deletion</h4>
              <p>Purges your commander credentials, match history, ELO rating, and unlocked achievements from the ArChess ledger permanently.</p>
              <button type="button" class="btn-danger-purge" id="btnDeleteAccount">
                <span>Permanently Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  setupListeners() {
    const authModal = document.getElementById('accountAuthModal');
    const closeAuthBtn = document.getElementById('closeAccountAuthModal');
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const formLogin = document.getElementById('authFormLogin');
    const formRegister = document.getElementById('authFormRegister');
    const btnGoogleAuth = document.getElementById('btnGoogleAuth');

    if (closeAuthBtn) closeAuthBtn.addEventListener('click', () => this.closeModal());
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) this.closeModal();
      });
    }

    if (btnGoogleAuth) {
      btnGoogleAuth.addEventListener('click', () => this.triggerGoogleSignIn());
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

    // Account Management Modal Listeners
    const accModal = document.getElementById('accountManagementModal');
    const closeAccBtn = document.getElementById('closeAccountMgmtModal');
    if (closeAccBtn) closeAccBtn.addEventListener('click', () => this.closeAccountModal());
    if (accModal) {
      accModal.addEventListener('click', (e) => {
        if (e.target === accModal) this.closeAccountModal();
      });
    }

    // Tab switcher in Account Modal
    document.querySelectorAll('.acc-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.acc-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.acc-tab-content').forEach(c => {
          c.classList.remove('active');
          c.style.display = 'none';
        });

        btn.classList.add('active');
        const tab = btn.getAttribute('data-acc-tab');
        const targetId = `accTabContent${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
        const target = document.getElementById(targetId);
        if (target) {
          target.classList.add('active');
          target.style.display = 'block';
        }
      });
    });

    // Avatar selector items
    document.querySelectorAll('.avatar-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.avatar-picker-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.selectedAvatar = item.getAttribute('data-avatar');
        const glyph = this.AVATAR_GLYPHS[this.selectedAvatar] || '♞';
        const display = document.getElementById('accModalAvatarDisplay');
        if (display) display.textContent = glyph;
      });
    });

    // Profile form submit
    const profileForm = document.getElementById('accProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('accUsernameInput').value;
        this.updateProfile(newUsername, this.selectedAvatar);
      });
    }

    // Password form submit
    const passwordForm = document.getElementById('accPasswordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const curr = document.getElementById('accCurrentPassword').value;
        const nw = document.getElementById('accNewPassword').value;
        const cf = document.getElementById('accConfirmPassword').value;
        if (nw !== cf) {
          this.showToast('New passwords do not match.', 'error');
          return;
        }
        this.updatePassword(curr, nw);
      });
    }

    // Delete account button
    const btnDelete = document.getElementById('btnDeleteAccount');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => this.deleteAccount());
    }
  },

  showToast(message, type = 'info') {
    if (window.ArchessToast && typeof window.ArchessToast.show === 'function') {
      window.ArchessToast.show(message, type);
      return;
    }
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
