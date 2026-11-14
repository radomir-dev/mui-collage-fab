# Guidelines

## Worktrees

All work happens in a worktree under `.slim/<short-name>`, never in `/tmp` and never in the primary checkout — that one stays on `main` with a clean tree. `.slim/` and `.slim-*/` are gitignored, so those copies stay out of `git status`; skip `.slim/` when searching or globbing the repository root as well.

## Issues

Start issue work from a branch linked to the issue, so it shows up in the issue's Development panel. Create it through the API rather than `git switch -c`:

```sh
gh api graphql \
  -f query='mutation($issue:ID!,$oid:GitObjectID!,$repo:ID!,$name:String!){createLinkedBranch(input:{issueId:$issue,oid:$oid,repositoryId:$repo,name:$name}){linkedBranch{ref{name}}}}' \
  -F issue="$(gh issue view <n> --json id -q .id)" \
  -F repo="$(gh repo view --json id -q .id)" \
  -F oid="$(git rev-parse origin/main)" \
  -F name="<n>-<slug>"
```

Then fetch it into a `.slim/` worktree and work there.

## Pull requests

Write PR descriptions like a lazy but talented developer who cannot be bothered: a sentence or two on what changed and why, then stop. No headings, no checklists, no bullet lists, no restating the diff — the code and the commits carry the detail.

Open the pull request as a draft as soon as the branch has its first commit, even if the work is barely started, and keep pushing to it as the work lands. Mark it ready only when it is finished.

Title the pull request as a Conventional Commits message (`type(scope): subject`), because `pr-title` in CI rejects anything else.
