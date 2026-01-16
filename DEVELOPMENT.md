# Development Guide

Guide for developers working on the Obsidian Slack Emoji plugin.

## Prerequisites

- **Bun**: Package manager and runtime ([install](https://bun.sh/))
- **Devbox**: Development environment manager (optional but recommended)
- **Obsidian**: For testing the plugin
- **Git**: Version control

## Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/obsidian-slack-emoji.git
cd obsidian-slack-emoji

# Install dependencies
bun install

# Start development build (watch mode)
bun run dev

# Copy built files to test vault
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/obsidian-slack-emoji/
```

Or using the Makefile:

```bash
make install
make dev
make dev-vault  # Copies to TEST_VAULT
```

## Project Structure

```
obsidian-slack-emoji/
├── src/
│   ├── main.ts                       # Plugin entry point
│   ├── settings.ts                   # Settings validation
│   ├── settings-tab.ts               # Settings UI
│   ├── emoji-manager.ts              # Core emoji registry
│   ├── custom-emoji-watcher.ts       # File system monitor
│   ├── editor/
│   │   ├── emoji-plugin.ts           # CodeMirror ViewPlugin
│   │   ├── emoji-decorator.ts        # Pattern detection
│   │   ├── emoji-widget.ts           # Widget rendering
│   │   └── emoji-suggester.ts        # Autocomplete
│   ├── reading/
│   │   └── emoji-postprocessor.ts    # Reading mode renderer
│   ├── data/
│   │   └── emoji-loader.ts           # Emojibase loader
│   └── types/
│       └── emoji.ts                  # TypeScript interfaces
├── styles.css                        # Plugin styles
├── manifest.json                     # Plugin metadata
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── vitest.config.ts                  # Test config
├── eslint.config.mjs                 # Linter config
├── esbuild.config.mjs                # Build config
└── Makefile                          # Development commands
```

## Development Workflow

### 1. Hot Reload Development

The recommended workflow for rapid iteration:

```bash
# Terminal 1: Watch for changes and rebuild
bun run dev

# Terminal 2: Copy to vault after each build
make dev-vault  # or manually copy files
```

After copying files:
1. Open Obsidian Developer Console (Ctrl+Shift+I)
2. Run: `app.plugins.disablePlugin('obsidian-slack-emoji')`
3. Run: `app.plugins.enablePlugin('obsidian-slack-emoji')`

Or use the "Hot Reload" community plugin for automatic reloading.

### 2. Making Changes

**Code changes:**
1. Edit source files in `src/`
2. Watch for automatic rebuild (if using `bun run dev`)
3. Copy to test vault
4. Reload plugin in Obsidian
5. Test your changes

**Style changes:**
1. Edit `styles.css`
2. Copy to test vault
3. Reload Obsidian (Ctrl+R)

### 3. Running Tests

```bash
# Run all tests once
bun run test

# Watch mode (re-run on changes)
bun run test:watch

# With coverage report
bun run test:coverage
```

Tests are in `.test.ts` files next to the code they test.

### 4. Code Quality

```bash
# Type checking
bun run typecheck

# Linting
bun run lint
bun run lint:fix

# Formatting
bun run format
bun run format:check

# All checks at once
make quality
```

## Testing

### Unit Tests

We use Vitest with happy-dom for DOM testing.

**Coverage targets:**
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

**Components excluded from coverage:**
- `src/main.ts` - Plugin integration
- `src/settings-tab.ts` - UI-heavy
- `src/editor/emoji-decorator.ts` - Requires CodeMirror runtime
- `src/editor/emoji-plugin.ts` - Requires CodeMirror runtime
- `src/custom-emoji-watcher.ts` - Requires Obsidian Vault integration

These components require manual integration testing in Obsidian.

### Manual Testing Checklist

Before releasing:

**Unicode Emoji:**
- [ ] `:thumbsup:` renders as 👍 in reading mode
- [ ] `:thumbsup:` renders as 👍 in live preview
- [ ] `:+1:` (alias) renders as 👍
- [ ] Multiple emoji in one line work
- [ ] Emoji in headings work
- [ ] Emoji in lists work
- [ ] Code blocks are not processed

**Custom Emoji:**
- [ ] Upload PNG via settings works
- [ ] Upload JPG via settings works
- [ ] Upload GIF via settings works (animated)
- [ ] Add file to folder auto-loads
- [ ] Delete file from folder removes emoji
- [ ] Rename file in folder updates shortcode
- [ ] Custom emoji renders in reading mode
- [ ] Custom emoji renders in live preview
- [ ] Aliases work for custom emoji

**Autocomplete:**
- [ ] Typing `:th` shows suggestions
- [ ] Suggestions show preview images
- [ ] Arrow keys navigate suggestions
- [ ] Enter selects suggestion
- [ ] Mouse click selects suggestion
- [ ] Min chars setting works
- [ ] Disable autocomplete works

**Settings:**
- [ ] Toggle Unicode emoji on/off
- [ ] Toggle custom emoji on/off
- [ ] Toggle autocomplete on/off
- [ ] Change folder path
- [ ] Upload custom emoji
- [ ] Edit aliases
- [ ] Delete custom emoji
- [ ] Gallery displays all emoji

## Building

### Development Build

```bash
bun run dev
# Creates main.js with source maps
```

### Production Build

```bash
bun run build
# Creates optimized main.js
# Runs type checking first
```

### Build Configuration

The build uses esbuild configured in `esbuild.config.mjs`:

- **Entry**: `src/main.ts`
- **Output**: `main.js`
- **Target**: ES2020
- **Format**: CommonJS
- **External**: `obsidian`, `@codemirror/*`
- **Bundle**: Yes
- **Minify**: Production only
- **Sourcemap**: Development only

## Architecture

### Dual Rendering System

The plugin uses two separate renderers:

1. **Reading Mode**: Markdown post-processor
   - Processes HTML after Markdown rendering
   - Replaces `:shortcode:` text with emoji
   - Implemented in `reading/emoji-postprocessor.ts`

2. **Live Preview**: CodeMirror 6 ViewPlugin
   - Decorates editor syntax tree
   - Replaces `:shortcode:` ranges with widgets
   - Implemented in `editor/emoji-plugin.ts`, `emoji-decorator.ts`, `emoji-widget.ts`

### EmojiManager

Central registry for all emoji (Unicode + custom):

- **Data structures**: Map for O(1) lookup by shortcode
- **Alias resolution**: Map for alias → canonical shortcode
- **Search**: Substring matching on shortcode, aliases, and labels
- **Lifecycle**: Loaded once, cached in memory

### Custom Emoji Watcher

Monitors file system for changes:

- **Events**: create, delete, rename, modify
- **File types**: .png, .jpg, .jpeg, .gif, .svg, .webp
- **Shortcode generation**: Filename → sanitized shortcode
- **Data storage**: Base64 data URLs in memory, metadata in settings

### Autocomplete

EditorSuggest-based autocomplete:

- **Trigger**: `:` followed by minChars characters
- **Query**: EmojiManager.searchEmojis()
- **Rendering**: Preview image/character + shortcode + label
- **Selection**: Replaces `:query` with `:shortcode:`

## Release Process

### Version Bumping

```bash
# Update version in manifest.json and package.json
make release VERSION=1.2.3

# Or manually:
vim manifest.json  # Update "version": "1.2.3"
vim package.json   # Update "version": "1.2.3"
git add manifest.json package.json
git commit -m "chore: bump version to 1.2.3"
git tag v1.2.3
git push && git push --tags
```

### GitHub Actions

The release is automated via GitHub Actions:

1. **Tag push** triggers `.github/workflows/release.yml`
2. **CI runs**: lint, typecheck, test, build
3. **Release created**: Auto-generated notes from commits
4. **Files attached**: main.js, manifest.json, styles.css

### Pre-Release Checklist

- [ ] All tests passing (`bun run test`)
- [ ] No lint errors (`bun run lint`)
- [ ] No type errors (`bun run typecheck`)
- [ ] Build succeeds (`bun run build`)
- [ ] Manual testing complete (see checklist above)
- [ ] CHANGELOG.md updated
- [ ] Version bumped in manifest.json and package.json

## Troubleshooting

### TypeScript Errors

- Check `tsconfig.json` for correct paths
- Verify all imports use correct paths
- Run `bun run typecheck` to see full errors

### Test Failures

- Check test mocks match actual APIs
- Verify happy-dom environment is working
- Look for console errors in test output

### Build Failures

- Clear build artifacts: `make clean`
- Reinstall dependencies: `rm -rf node_modules && bun install`
- Check esbuild config is valid

### Plugin Not Loading

- Check Obsidian console for errors
- Verify manifest.json is valid JSON
- Check plugin folder name matches manifest ID
- Try disabling/enabling in settings

### Hot Reload Not Working

- Verify plugin was disabled before enabling
- Check Developer Console for errors
- Try full Obsidian restart
- Verify copied files are correct versions

## Contributing

### Code Style

- Use TypeScript for all code
- Follow ESLint rules (see `eslint.config.mjs`)
- Format with Prettier (4 spaces, single quotes)
- Use functional patterns over classes where reasonable
- Write tests for new features

### Commit Messages

Use conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
test: add tests
chore: update dependencies
refactor: refactor code
```

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run quality checks: `make quality`
6. Commit with conventional commits
7. Push and create PR
8. Wait for CI to pass
9. Address review comments

## Resources

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [Emojibase Documentation](https://emojibase.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Bun Documentation](https://bun.sh/docs)
