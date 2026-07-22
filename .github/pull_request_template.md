<!--
  CleanSight — Pull Request Template
  Fill in every section before requesting review.
  Delete any section that is genuinely not applicable.
-->

## Summary

<!-- One-paragraph description of what this PR does and *why*. -->

## Type of Change

<!-- Put an `x` in the boxes that apply -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 🔧 Refactor / tech debt
- [ ] 📦 Dependency update
- [ ] 🚀 CI/CD / Infrastructure
- [ ] 📝 Documentation only

## Related Issues

<!-- Link to any related issue(s): "Closes #123", "Fixes #456" -->

## Changes Made

<!-- Bullet list of the key changes. Be specific — reviewers will thank you. -->

- 
- 

## Testing

<!-- Describe how you tested these changes. -->

- [ ] I ran `pnpm test` (Vitest) and all tests pass locally
- [ ] I ran `pnpm run lint` in the Frontend directory and there are no ESLint errors
- [ ] I ran `tsc --noEmit` in the Frontend directory and there are no type errors
- [ ] I ran the backend tests (`node --test src/tests/*.test.js`) and they pass
- [ ] I manually tested the relevant feature/fix in the browser
- [ ] I added new unit tests for the changes I made

## Screenshots / Screen Recordings

<!-- If your change affects the UI, attach before/after screenshots or a short recording. -->

## Checklist

- [ ] My code follows the existing code style
- [ ] I have reviewed my own diff before submitting
- [ ] I have added/updated comments where the logic is non-obvious
- [ ] I have not committed `.env` files or secrets
- [ ] The CI checks (lint, type-check, tests, Docker build) are green for this PR
