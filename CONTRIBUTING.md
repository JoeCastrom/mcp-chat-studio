# Contributing to MCP Chat Studio

Thank you for your interest in contributing to MCP Chat Studio! We welcome contributions from the community.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- **Git**

### Setup Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/JoeCastrom/mcp-chat-studio.git
   cd mcp-chat-studio
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Copy environment template:**

   ```bash
   cp .env.example .env
   ```

5. **Copy config template:**

   ```bash
   cp config.yaml.example config.yaml
   ```

6. **Start development server:**

   ```bash
   npm run dev
   ```

7. **Open browser:**
   ```
   http://localhost:3082
   ```

## 📝 Development Workflow

### Code Style

We use **ESLint** and **Prettier** for code formatting:

```bash
# Check code style
npm run lint

# Auto-format code
npm run format
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation update`
- `style: formatting changes`
- `refactor: code refactoring`
- `test: add tests`
- `chore: maintenance tasks`

**Examples:**

```
feat: add support for Claude 4 models
fix: resolve MCP server connection timeout
docs: update OAuth configuration guide
```

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

## 🔧 Making Changes

### Adding a New LLM Provider

1. Edit `server/services/LLMClient.js`
2. Add provider configuration to `getBaseUrl()`
3. Add API key handling in `getApiKey()`
4. Add headers in `getHeaders()`
5. Add transformation functions if needed
6. Update `.env.example` with new keys
7. Update `README.md` with usage example

### Adding New MCP Features

1. Backend changes go in `server/routes/mcp.js` and `server/services/MCPManager.js`
2. Frontend changes go in `public/index.html`
3. Update API documentation in `README.md`

### Testing Your Changes

```bash
# Test with Ollama (no API key needed)
npm run dev

# Test different providers
# Set API keys in .env
OPENAI_API_KEY=sk-xxx npm run dev
```

**Manual Testing Checklist:**

- [ ] Chat works with streaming
- [ ] Chat works without streaming
- [ ] MCP server connects (STDIO and SSE)
- [ ] Tool calling works
- [ ] Inspector tab functions
- [ ] OAuth login/logout works (if applicable)
- [ ] Settings save/load correctly

## 🐛 Reporting Bugs

**Before reporting:**

1. Check existing issues
2. Test with latest version
3. Try with minimal configuration

**When reporting, include:**

- OS and Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages and logs
- Config files (remove secrets!)

**Use this template:**

```markdown
### Bug Description

A clear description of what the bug is.

### Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. See error

### Expected Behavior

What you expected to happen.

### Actual Behavior

What actually happened.

### Environment

- OS: [e.g., Windows 11, macOS 14]
- Node.js: [e.g., v22.0.0]
- Browser: [e.g., Chrome 120]

### Logs
```

Paste relevant logs here

```

```

## ✨ Suggesting Features

**For feature requests:**

1. Check if it's already suggested
2. Explain the use case
3. Describe the proposed solution
4. Consider alternatives

**Use this template:**

```markdown
### Feature Description

A clear description of the feature.

### Use Case

Who would benefit and why?

### Proposed Solution

How should it work?

### Alternatives Considered

What other approaches did you consider?
```

## 📦 Pull Request Process

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes:**
   - Write clean, documented code
   - Follow existing code style
   - Add comments for complex logic

3. **Format and lint:**

   ```bash
   npm run format
   npm run lint
   ```

4. **Commit your changes:**

   ```bash
   git add .
   git commit -m "feat: add my new feature"
   ```

5. **Push to your fork:**

   ```bash
   git push origin feature/my-new-feature
   ```

6. **Create Pull Request:**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill in the PR template
   - Link related issues

### Pull Request Checklist

- [ ] Code follows project style
- [ ] Code is formatted (`npm run format`)
- [ ] Code passes linting (`npm run lint`)
- [ ] Commit messages follow convention
- [ ] README updated (if needed)
- [ ] `.env.example` updated (if adding config)
- [ ] Config examples updated (if adding config)
- [ ] Tested manually
- [ ] No VW-specific or proprietary code

## 🔐 Security

**DO NOT commit:**

- API keys or secrets
- Personal credentials
- Company-specific configurations
- Private certificates

**If you find a security vulnerability:**

- DO NOT open a public issue
- Email the maintainers privately
- Allow time for a fix before disclosure

## 📄 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy toward others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Publishing others' private information
- Unethical or unprofessional conduct

## 📞 Questions?

- Open a GitHub Discussion
- Check existing documentation
- Ask in pull request comments

## 🙏 Thank You!

Your contributions make MCP Chat Studio better for everyone. We appreciate your time and effort!

---

**Happy coding!** 🎉
