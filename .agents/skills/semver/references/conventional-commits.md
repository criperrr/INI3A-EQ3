# Conventional Commits and SemVer Mapping

The Conventional Commits specification provides a lightweight convention on top of commit messages, creating an explicit mapping to SemVer.

## 1. Commit Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## 2. SemVer Correlation

| Commit Type | SemVer Impact | Description |
|---|---|---|
| `fix:` | **PATCH** | Patches a bug in your codebase |
| `feat:` | **MINOR** | Introduces a new feature to the codebase |
| `BREAKING CHANGE:` or `!` | **MAJOR** | Introduces a breaking API change (correlates with `MAJOR` in Semantic Versioning) |
| `perf:` | **PATCH** (or no bump if internal) | Code change that improves performance |
| `refactor:` | **PATCH** (or no bump if internal) | Code change that neither fixes a bug nor adds a feature |
| `style:` | No bump | Changes that do not affect the meaning of the code (white-space, formatting) |
| `test:` | No bump | Adding missing tests or correcting existing tests |
| `chore:` | No bump | Build process, auxiliary tools, or dependency updates |
| `docs:` | No bump | Documentation only changes |

## 3. Examples

### Patch (Bug Fix)
```bash
git commit -m "fix(auth): handle expired refresh token without throwing unhandled rejection"
```

### Minor (New Feature)
```bash
git commit -m "feat(catalog): add barcode similarity matching fallback"
```

### Major (Breaking Change)
```bash
git commit -m "feat(api)!: drop legacy /v1/products endpoint in favor of /products"
```
Or with footer:
```bash
git commit -m "feat(auth): require 2FA token in all protected mutation requests

BREAKING CHANGE: All mutation routes now strictly require header 'X-2FA-Token'."
```
