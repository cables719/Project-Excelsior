---
description: How to safeguard your work with Git backups
---

# Backup Procedure

This project is version-controlled with Git.

## 1. Quick Backup (Checkpoint)

To save your current progress, run:

```bash
git add .
git commit -m "Checkpoint: [Describe your changes]"
```

## 2. Viewing History

To see what changed and when:

```bash
git log --oneline --graph --all
```

// turbo
## 3. Rescue Mission

If you break something and need to go back to the last safe state:

```bash
git reset --hard HEAD
```
> [!WARNING]
> This will delete all uncommitted changes!
