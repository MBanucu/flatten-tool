---
description: Analyze git changes, craft a Conventional Commits message, and commit staged changes
subtask: true
---

Please perform the following steps carefully to create a high-quality git commit:

1. Run `git status` to examine the current repository state, including staged, unstaged, and untracked files.

2. Inspect the detailed changes:
   - Staged changes: review the full `git diff --staged`
   - Unstaged changes: review the full `git diff`
   - Untracked files: list and review their contents if relevant

3. Deeply analyze the purpose, impact, and nature of all changes in the codebase.

4. Craft a detailed commit message that strictly follows the Conventional Commits specification (v1.0.0).

   Before writing the message, carefully read and internalize the complete specification here:  
   https://www.conventionalcommits.org/en/v1.0.0/#specification

   Key guidelines from the spec:
   - Use the format: `<type>[optional scope]: <description>`
   - Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert (and others if justified)
   - Subject line: imperative tense, no capitalization, ≤50 characters
   - Optional body: explain **what** and **why** (not how), wrap at 72 characters
   - Optional footer: for BREAKING CHANGE, references to issues, etc.

   Choose the most appropriate type and scope based on the changes. Make the message clear, professional, and informative for future readers (including changelogs and release notes).

5. If there are no staged changes:
   - Inform the user that nothing is staged.
   - Suggest which files/changes should be staged (using `git add`) for this commit, or ask for clarification.

6. If there are staged changes:
   - Present the proposed commit message for review.
   - Once approved (or if proceeding), commit the staged changes with the crafted message using the appropriate `git commit` command.

7. If there are important unstaged or untracked changes that logically belong in this commit, recommend staging them first.

Prioritize accuracy, completeness, and adherence to the Conventional Commits standard.
