# Obsidian Slack Emoji

Slack-style emoji support for Obsidian with custom emoji functionality. Type `:emoji:` and see rendered images in both editing and reading modes.

## Features

- **Slack-style syntax**: Type `:thumbsup:` to render 👍
- **Emoji aliases**: Multiple shortcodes work for the same emoji (`:thumbsup:`, `:+1:`, `:thumbup:`)
- **Custom emoji**: Upload your own images or place them in a folder
- **Live rendering**: Emoji appear in both editing (live preview) and reading modes
- **Autocomplete**: Start typing `:` and get emoji suggestions with previews
- **Unicode emoji**: 1900+ standard emoji from Emojibase with GitHub/Slack aliases
- **Automatic detection**: Custom emoji folder is monitored for changes

## Installation

### Via BRAT (Recommended)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. In BRAT settings, click "Add Beta plugin"
3. Enter this repository URL: `https://github.com/YOUR_USERNAME/obsidian-slack-emoji`
4. Enable the plugin in Settings → Community plugins

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/YOUR_USERNAME/obsidian-slack-emoji/releases)
2. Create a folder: `VaultFolder/.obsidian/plugins/obsidian-slack-emoji/`
3. Place the downloaded files in the folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community plugins

## Usage

### Basic Emoji Syntax

Type emoji shortcodes surrounded by colons:

```markdown
I love Obsidian :heart:
Great work :thumbsup: :+1: :tada:
Custom emoji works too :custom_logo:
```

Renders as:

I love Obsidian ❤️
Great work 👍 👍 🎉
Custom emoji works too [custom image]

### Autocomplete

1. Type `:` followed by at least 2 characters
2. A suggestion popup appears with matching emoji
3. Use arrow keys to navigate, Enter to select
4. Or click an emoji with your mouse

### Adding Custom Emoji

#### Method 1: Upload via Settings

1. Open Settings → Slack Emoji
2. Click "Upload custom emoji"
3. Select an image file (PNG, JPG, GIF, SVG, WebP)
4. The filename becomes the shortcode (e.g., `logo.png` → `:logo:`)

#### Method 2: Add to Folder

1. Place image files in `.obsidian/emoji/` (or your configured folder)
2. The plugin automatically detects and loads them
3. Filenames are converted to shortcodes:
   - `company-logo.png` → `:company-logo:`
   - `my emoji.png` → `:my_emoji:`
   - `special@#$.png` → `:special___:`

### Managing Aliases

Aliases let you use multiple shortcodes for the same emoji:

1. Open Settings → Slack Emoji
2. Find the emoji in the gallery
3. Click "Edit Aliases"
4. Enter comma-separated aliases (e.g., `logo, brand, company`)
5. Now `:logo:`, `:brand:`, and `:company:` all work

### Deleting Custom Emoji

1. Open Settings → Slack Emoji
2. Find the emoji in the gallery
3. Click "Delete"
4. Confirm deletion (removes both file and metadata)

## Configuration

Settings are found in Settings → Slack Emoji.

### Feature Toggles

- **Enable Unicode emoji**: Toggle standard emoji rendering (default: on)
- **Enable custom emoji**: Toggle custom emoji rendering (default: on)
- **Enable autocomplete**: Toggle emoji suggestions (default: on)

### Autocomplete Settings

- **Minimum characters**: How many characters to type before suggestions appear (default: 2)

### Custom Emoji Folder

- **Folder path**: Where to look for custom emoji images (default: `.obsidian/emoji`)
- The folder is monitored for changes—add/remove files anytime
- Folder is created automatically if it doesn't exist

## Supported Image Formats

Custom emoji supports:

- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- GIF (`.gif`) - including animated
- SVG (`.svg`)
- WebP (`.webp`)

## Troubleshooting

### Emoji not rendering

- Check that the plugin is enabled in Community plugins
- Verify the relevant feature is enabled in settings
- For custom emoji, check the file is in the correct folder
- Try disabling and re-enabling the plugin

### Autocomplete not showing

- Type at least 2 characters after `:` (configurable in settings)
- Verify "Enable autocomplete" is on in settings
- Make sure you're in editing mode (not source mode)

### Custom emoji not loading

- Check the file format is supported
- Verify the folder path in settings is correct
- Look for errors in Developer Console (Ctrl+Shift+I)
- Try uploading via settings instead of folder

### Shortcode conflicts

- Custom emoji take priority over Unicode emoji
- If two custom emoji have the same shortcode, the most recent one is used
- Delete and re-upload to resolve conflicts

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for development setup, testing, and contribution guidelines.

## Credits

- Unicode emoji data from [Emojibase](https://emojibase.dev/)
- Inspired by Slack's emoji system
- Built for the Obsidian community

## License

MIT License - see LICENSE file for details

## Support

- Report bugs: [GitHub Issues](https://github.com/YOUR_USERNAME/obsidian-slack-emoji/issues)
- Feature requests: [GitHub Discussions](https://github.com/YOUR_USERNAME/obsidian-slack-emoji/discussions)
- Documentation: [GitHub Wiki](https://github.com/YOUR_USERNAME/obsidian-slack-emoji/wiki)
