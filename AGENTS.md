# Project Instructions

- **Push Confirmation Policy**: Never push commits to the remote repository (`git push`) automatically or unprompted. ONLY push to the remote repository when the user explicitly requests or confirms a push, so they can test locally/in preview first or specify an alternative branch.
- **GitHub Actions Usage Limit**: Never configure workflows to automatically run on `push` or `pull_request`. GitHub Action builds must only be triggered manually via `workflow_dispatch`.
- When pushing commits to the remote repository (after user confirmation), always include `[skip ci]` in commit messages as an extra precaution to avoid consuming the user's limited GitHub Actions quota.
