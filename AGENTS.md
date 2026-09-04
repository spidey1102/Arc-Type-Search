# Project Instructions

- **GitHub Actions Usage Limit**: Never configure workflows to automatically run on `push` or `pull_request`. GitHub Action builds must only be triggered manually via `workflow_dispatch`.
- When pushing commits to the remote repository, always include `[skip ci]` in commit messages as an extra precaution to avoid consuming the user's limited GitHub Actions quota.
