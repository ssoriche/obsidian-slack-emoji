# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-02-28

### Fixed

- **Custom emoji now available immediately without reload** — vault events are not
  emitted for files externally added to `.obsidian/emoji/`. Added a 5-second polling
  fallback via `vault.adapter.list()` that picks up new files automatically. Also
  switched event handlers to path-based detection (`isEmojiPath`) so they work for
  any file regardless of whether it is indexed in Obsidian's vault cache. Emoji
  uploaded via the settings UI are now eagerly registered in the manager without
  waiting for a vault event.
- **Fix overlapping buttons in custom emoji gallery** — replaced the "Edit Aliases"
  and "Delete" text buttons (too wide for the card at minimum width) with ✏️ / 🗑️
  icon buttons with `aria-label` for accessibility.

## [0.1.2] - 2026-02-26

### Fixed

- Rewrite emoji decorator to process full document text with skip ranges, fixing
  missed or double-rendered emoji in certain editor states.

## [0.1.1] - 2026-02-26

### Fixed

- Prevent custom emoji rendering crash caused by unsorted decoration sets.
- Resolve custom emoji upload error, missing gallery display, and alias documentation.

## [0.1.0] - 2026-02-05

### Added

- Unicode emoji rendering in reading mode and live preview using `:shortcode:` syntax.
- Custom emoji support: upload images via settings UI or place them in `.obsidian/emoji/`.
- Autocomplete suggester — type `:` to browse and insert emoji.
- Settings UI with custom emoji gallery, alias editing, and folder configuration.
- Emoji aliases (e.g. `:+1:` renders as 👍).
- CodeMirror 6 live-preview extension with inline emoji rendering.
- File watcher for the custom emoji folder with create/delete/rename/modify handling.
