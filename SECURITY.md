# 🛡️ Security Policy — ArChess

The ArChess project team is committed to delivering an enterprise-hardened, secure gaming platform. This document outlines our security architecture, supported versions, and vulnerability disclosure process.

---

## 📦 Supported Versions

| Version | Supported | Security Maintenance |
| :--- | :---: | :--- |
| **4.x** (Latest) | ✅ | Active security patches and vulnerability audits |
| < 4.0 | ❌ | End of Life (Upgrade to 4.x recommended) |

---

## 🔒 Built-in Security Architecture

ArChess implements defense-in-depth security principles across all layers:

### 1. SQL Injection Immunity
- **100% Parameterized Queries**: Every database transaction in [`backend/database.py`](file:///c:/Users/mohda/Python%20Codes/ARCHESS/backend/database.py) uses SQLite tuple parameterization (`?`).
- There is **zero** string formatting or dynamic concatenation in SQL query paths.

### 2. Authentication & Brute-Force Shields
- **Cryptographic Password Hashing**: Passwords are encrypted using Werkzeug’s salted key-derivation algorithms (`scrypt` / `pbkdf2:sha256`).
- **Login Rate Limiter**: Maximum **15 failed login attempts per minute per IP address** enforced via in-memory sliding-window limiters with thread locks.
- **Match Settlement Limiter**: Maximum **60 match settlement requests per minute per IP address** preventing ELO ladder inflation.

### 3. Session & Cookie Hardening
- Session cookies enforce `HttpOnly` and `SameSite=Lax`.
- In production (`FLASK_ENV=production`), cookies automatically enforce the `Secure` flag.
- Cryptographic fallback warning ensures server administrators configure a persistent 64-character `SECRET_KEY` in production.

### 4. Cross-Site Scripting (XSS) Prevention
- Usernames and dynamic telemetry are rendered into DOM elements exclusively using `textContent` and `createElement` rather than string template `innerHTML`.
- Jinja2 auto-escaping is active across all server-rendered HTML templates.

### 5. WebSocket DoS Mitigation
- Incoming WebSocket frames have a hard payload ceiling of **64KB** in [`backend/multiplayer.py`](file:///c:/Users/mohda/Python%20Codes/ARCHESS/backend/multiplayer.py), preventing buffer overflow and memory exhaustion attacks.

### 6. Container Hardening
- Docker containers run under an unprivileged user (`archess`, UID 10001) rather than `root`.
- Multi-stage build isolates build tooling from the runtime attack surface.

---

## 🔍 Automated Security Testing

ArChess enforces automated security audits in the CI/CD pipeline:
* **Static Analysis**: Scanned with `bandit -r backend/ run.py -ll` (0 High / 0 Medium vulnerabilities).
* **Dependency Auditing**: Verified with `pip-audit -r requirements.txt` (0 known CVEs).
* **Automated Test Coverage**: 122 tests covering 100% of statements across all backend modules.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in ArChess, please report it responsibly:

1. **Do not disclose publicly** in GitHub issues or discussions.
2. Email the maintainer with a detailed report at: **security@archess.local** or submit a private security advisory on GitHub via **Security** $\rightarrow$ **Report a vulnerability**.
3. Include:
   * Description of the vulnerability and affected endpoint/component.
   * Reproduction steps or conceptual proof-of-concept.
   * Suggested remediation (if available).

You will receive an initial response within **48 hours**, followed by a timeline for patch development and coordinated disclosure.
