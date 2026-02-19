---
description: How we handle complex tasks safely (The Antigravity Safety Protocol)
---

**Use this workflow BEFORE starting any complex task that involves major refactoring, layout changes, or logic rewrites.**

1.  **Stop and assess risk.**
    - If the change might break the build or layout -> **COMMIT FIRST.**
    - Run: `git status`

2.  **Commit working state.**
    - If there are uncommitted changes, save them now.
    - Run: `git add . && git commit -m "Safety save before [Task Name]"`
    - Verify: `git log -1`

3.  **Branch for safety (Optional but Recommended).**
    - Create a disposable branch for the experiment.
    - Run: `git checkout -b experiment/[feature-name]`

4.  **Execute the plan.**
    - Only now do we start coding.

5.  **Merge or Abort.**
    - **Success**: Merge the branch back to main. `git checkout main && git merge experiment/[feature-name]`
    - **Fail**: Delete the branch and reset. `git checkout main && git branch -D experiment/[feature-name]`

**When to invoke:**
- Any time the user says "refactor", "rewrite", or "change the layout".
- Any time we are unsure of the outcome.
- At the start of every new session.
