# 🤝 Contributing to ArChess

Thank you for your interest in contributing to **ArChess**! As an authoritative competitive gaming platform, we maintain strict standards for code quality, security, and test coverage.

---

## 📋 Table of Contents
1. [Development Setup](#-development-setup)
2. [Code Standards & Style](#-code-standards--style)
3. [Testing & Coverage Policy](#-testing--coverage-policy)
4. [Git Commit Conventions](#-git-commit-conventions)
5. [Submitting a Pull Request](#-submitting-a-pull-request)

---

## 🛠️ Development Setup

### 1. Fork and Clone
```bash
git clone https://github.com/<your-username>/ArChess.git
cd ArChess
git remote add upstream https://github.com/mr-zero0/ArChess.git
```

### 2. Environment Setup
```bash
# Create Python 3.10+ virtual environment
python -m venv .venv

# Activate environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1
# Activate environment (Linux / macOS)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install flake8 bandit pip-audit
```

### 3. Start Development Server
```bash
python run.py
```
Visit `http://127.0.0.1:5000` to verify the local server.

---

## 🎨 Code Standards & Style

* **Python**: Follow [PEP 8](https://peps.python.org/pep-0008/) style guidelines.
  * Run linter: `flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=.venv,venv,.git,__pycache__,scratch`
* **JavaScript**: Use modern vanilla ES6+ for maximum performance and compatibility with Three.js.
* **Security**:
  * All database queries must use SQLite tuple parameterization (`?`). Dynamic SQL string formatting is strictly rejected.
  * Never render unescaped user inputs directly to `innerHTML`. Use `textContent` or sanitized DOM nodes.
  * No external assets that bypass self-contained procedural generation.

---

## 🧪 Testing & Coverage Policy

ArChess enforces a **100.0% statement coverage policy** across all backend modules (`backend/`). Any PR that introduces untested paths or reduces coverage below 100% will fail CI validation.

### Run Test Suite with Coverage
```bash
python -m pytest tests/ --cov=backend --cov-report=term-missing -v
```

Before pushing changes:
1. Ensure all **148+ tests** pass.
2. Confirm coverage report shows `100%` across all backend files.
3. Run security scan: `bandit -r backend/ run.py -ll`.
4. Run dependency scan: `pip-audit -r requirements.txt`.

---

## 📝 Git Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

* `feat(...)`: New feature or gameplay mechanic (e.g., `feat(3d): add dynamic board themes`)
* `fix(...)`: Bug fix or visual correction (e.g., `fix(arena): align 2D piece centroids to squares`)
* `sec(...)`: Security enhancement or hardening (e.g., `sec: add login brute-force rate limiter`)
* `perf(...)`: Performance optimization (e.g., `perf: add background visibility throttling`)
* `docs(...)`: Documentation additions or revisions (e.g., `docs: add deployment guide`)
* `test(...)`: Test suite additions or coverage expansions (e.g., `test: add health check probe tests`)
* `chore(...)`: Routine dependency updates or build script edits (e.g., `chore: update requirements.txt`)

---

## 🚀 Submitting a Pull Request

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with conventional messages.
3. Push to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
4. Open a Pull Request against `main` on `mr-zero0/ArChess`.
5. Ensure GitHub Actions CI/CD checks pass.
