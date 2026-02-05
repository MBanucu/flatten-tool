---
description: Create a new GitHub release: analyze changes, bump version, update CHANGELOG.md with versioned section, commit, tag, push, and create release using gh CLI
subtask: true
---

Follow these steps to create a new GitHub release based on recent changes. This command assumes gh CLI is installed and authenticated, and the repository has a GitHub remote.

First, review the key guidelines from Keep a Changelog (https://keepachangelog.com/en/1.0.0/) and Semantic Versioning 2.0.0 (https://semver.org/spec/v2.0.0.html), as in update-changelog.

1. Check if gh is available: !gh --version
   If not found, respond: "gh CLI not installed. Please install from https://cli.github.com/"

2. Get the current CHANGELOG.md content: @CHANGELOG.md

3. Identify the last released version from CHANGELOG.md or git tags: !git describe --tags --abbrev=0 || echo "0.0.0"
   Let last_version = output of above (strip 'v' if present).

4. Get commit messages since last version: !git log --pretty=format:"%s" ${last_version}..HEAD

5. If no commits, check for [Unreleased] section in CHANGELOG.md. If neither, respond: "No changes to release. No action taken."

6. Parse CHANGELOG.md to extract any existing [Unreleased] changes (content between ## [Unreleased] and next ## heading).

7. Classify each commit message into categories (Added, Changed, Deprecated, Removed, Fixed, Security). Use conventional commit prefixes if present (feat: → Added, fix: → Fixed, breaking: → Changed with MAJOR bump). Incorporate unreleased changes into classification.

8. Determine version bump:
   - MAJOR if any breaking changes.
   - MINOR if new features (Added) but no breaking.
   - PATCH if only fixes/changes without new features or breaking.
   - If pre-release needed, append -alpha.1 etc. (decide based on stability).

   Compute next_version by incrementing from last_version accordingly (e.g., 1.0.0 -> 1.1.0 for MINOR).

9. Group all changes (from commits and unreleased) under appropriate headings. Omit empty sections.

10. Get today's date: !date +%Y-%m-%d

11. Update CHANGELOG.md:
    - Replace [Unreleased] section (if exists) with ## [next_version] - today's_date
    - Add the grouped changes under the new section.
    - If no [Unreleased], insert the new section after the header.
    - Preserve the rest of the file.

12. Update package.json version to ${next_version}

13. Output the full updated CHANGELOG.md content and overwrite the file.

13. Stage and commit the update: !git add CHANGELOG.md package.json && git commit -m "chore: update changelog for v${next_version}"

14. Create annotated tag: !git tag -a v${next_version} -m "Release v${next_version}"

15. Push changes and tags: !git push && git push --tags

16. Extract release notes: Parse the updated CHANGELOG.md to get the content under ## [next_version] ... (excluding the heading itself).

17. Create a temporary file with the release notes: !echo "${release_notes}" > /tmp/release-notes.md

18. Create GitHub release: !gh release create v${next_version} --title "v${next_version}" --notes-file /tmp/release-notes.md

19. Clean up: !rm /tmp/release-notes.md

20. If successful, respond: "Release v${next_version} created successfully."

If $ARGUMENTS provided, use it to override version bump or add changes (e.g., /release MAJOR "Added: breaking feature").

Handle errors gracefully, such as no GitHub remote or authentication issues, by informing the user.

Prioritize accuracy, adherence to standards, and clean git history.