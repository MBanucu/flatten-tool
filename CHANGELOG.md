# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] / [next version]

### Added
- `--clipboard` / `-c` option to copy generated Markdown to system clipboard using clipboardy library (fixed hanging issue with sync API)

## [1.9.0] - 2026-02-05

### Added
- Add verbose option to log searched directories

### Chore
- Update process to include package.json version update

## [1.8.2] - 2026-02-05

### Changed
- Use globby ignore option for ignore patterns
- Enhance command to create multiple high-quality commits
- Split test suite to separate concerns

### Fixed
- Ignore destination file when it exists in source directory

### Documentation
- Refine commit message guidelines for generality
- Clarify commit message guidelines for internal changes
- Add clarification for internal enhancements commit type
- Add note about feat usage in CLI tools
- Update changelog with unreleased changes
- Clarify release strategy in update-changelog command
- Add changelog update slash command for OpenCode

### Chore
- Add flattened.md to .gitignore
- Add commit command for conventional commits
- Add changelog update slash command for OpenCode

## [1.8.1] - 2026-02-05

### Changed
- Refactor `collectSections` function to eliminate side effects, improving functional purity and immutability
- Fix bug where children keys incorrectly used full `relPath` instead of immediate child name

### Documentation
- Create CHANGELOG.md and update documentation
- Streamline AGENTS.md for coding guidelines

## [1.8.0] - 2026-02-05

### Added
- Implement dynamic backtick calculation for MD code blocks

### Changed
- Improve type safety in error handling
- Use snapshots for MD output verification in tests
- Improve tree building and markdown rendering with streams and typed structures
- Replace any with TreeNode and unknown, add runtime checks
- Split index.ts into modular src/ components

### Documentation
- Update AGENTS.md with snapshot testing guidelines
- Update and refine coding guidelines for AI agents

### Build
- Add postinstall script for NixOS Biome compatibility
- Add devenv for reproducible development environment

### Chore
- Update author and JSON import syntax

### Style
- Apply code formatting and linting fixes

## [1.7.0] - 2026-02-04
- Added explicit HTML anchors (`<a id="..."></a>`) before all headings for guaranteed compatibility across platforms that don't auto-generate heading IDs, maximum control over anchor names, and stable links.

## [1.6.4] - 2026-02-04
- Fixed: only add parent navigation link at root level

## [1.6.3] - 2024-10-15
- Enhanced safety: Automatically exclude common binary file extensions (PNG, JPEG, PDF, archives, executables, etc.) when merging to Markdown to prevent corruption.
- Added `--ignore` CLI option: Allow additional glob patterns to ignore (e.g., `*.log`, `temp/**`).
- Minor clean-ups: Improved variable naming and code consistency.
- Added YouTube video link in README demonstrating use case for AI discussions.

## [1.6.2] - 2024-10-14
- Updated AGENTS.md with revised coding guidelines.
- Added '..' links in subdirectory file trees for navigation to parent directories.

## [1.6.1] - 2024-10-14
- Added instructions for running flatten-tool directly with npx and bunx.

## [1.6.0] - 2024-10-14
- Perfect GitHub compatibility: anchors now exactly match GitHub Flavored Markdown auto-generation using github-slugger.
- Cleaner directory headers: removed trailing `/` for better readability.
- Precomputed anchors: ensures no mismatches even with slug collisions.
- Removed unused treeify dependency.

## [1.5.0] - 2024-10-13
- Improved navigation: project file tree is now a clickable nested Markdown list with links to each file's content section using standard markdown anchors.
- Simplified file headers: removed custom anchors from section headers.

## [1.4.0] - 2024-10-13
- Added project file tree to the beginning of merged Markdown output for better navigation.

## [1.3.1] - 2024-10-13
- Fixed GIF exclusion pattern to work recursively in subdirectories.

## [1.3.0] - 2024-10-13
- Excluded GIF files by default when merging to Markdown to prevent binary content corruption.

## [1.2.3] - 2024-10-13
- Added demo.gif to docs/ and linked in README.md.

## [1.2.2] - 2024-10-13
- Added `setMaxListeners(0)` on WriteStream in Markdown merging to silence listener warnings when processing many files.

## [1.2.1] - 2024-10-13
- Fixed memory leak warnings in Markdown merging by refactoring to use `pipeline` and `finished` from `node:stream/promises`.

## [1.2.0] - 2024-10-13
- Implemented streaming for Markdown merging to improve memory efficiency for large files/directories.
- Updated documentation and coding guidelines.

## [1.1.0] - 2024-10-13
- Made source argument optional (defaults to current directory).
- Improved CLI defaults and options.

## [1.0.0] - 2024-10-13
- Initial release with Markdown merging and directory flattening capabilities.