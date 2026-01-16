import { PluginSettingTab, Setting, Notice } from 'obsidian';
import type { App } from 'obsidian';
import type SlackEmojiPlugin from './main';
import type { CustomEmojiMetadata } from './types/emoji';

/**
 * Settings tab for Slack Emoji plugin
 */
export class SlackEmojiSettingTab extends PluginSettingTab {
    plugin: SlackEmojiPlugin;

    constructor(app: App, plugin: SlackEmojiPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Header
        containerEl.createEl('h2', { text: 'Slack Emoji Settings' });

        // Feature Toggles Section
        containerEl.createEl('h3', { text: 'Features' });

        new Setting(containerEl)
            .setName('Enable Unicode emoji')
            .setDesc('Render standard Unicode emoji using Emojibase data (e.g., :thumbsup: → 👍)')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.enableUnicodeEmoji).onChange(async (value) => {
                    this.plugin.settings.enableUnicodeEmoji = value;
                    await this.plugin.saveSettings();

                    if (value && this.plugin.emojiManager) {
                        await this.plugin.emojiManager.loadUnicodeEmojis();
                        new Notice('Unicode emoji loaded');
                    }
                })
            );

        new Setting(containerEl)
            .setName('Enable custom emoji')
            .setDesc(
                'Load custom emoji from folder and render them in notes (e.g., :custom_logo: → image)'
            )
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.enableCustomEmoji).onChange(async (value) => {
                    this.plugin.settings.enableCustomEmoji = value;
                    await this.plugin.saveSettings();

                    // Restart watcher if needed
                    if (value) {
                        await this.startCustomEmojiWatcher();
                    } else {
                        this.stopCustomEmojiWatcher();
                    }
                })
            );

        new Setting(containerEl)
            .setName('Enable autocomplete')
            .setDesc('Show emoji suggestions when typing :shortcode')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.enableAutocomplete).onChange(async (value) => {
                    this.plugin.settings.enableAutocomplete = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Autocomplete minimum characters')
            .setDesc('Minimum characters to type before showing suggestions (default: 2)')
            .addText((text) =>
                text
                    .setPlaceholder('2')
                    .setValue(String(this.plugin.settings.autocompleteMinChars))
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.autocompleteMinChars = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // Custom Emoji Section
        containerEl.createEl('h3', { text: 'Custom Emoji' });

        new Setting(containerEl)
            .setName('Custom emoji folder')
            .setDesc('Vault folder containing custom emoji images (will be created if it doesn\'t exist)')
            .addText((text) =>
                text
                    .setPlaceholder('.obsidian/emoji')
                    .setValue(this.plugin.settings.customEmojiFolder)
                    .onChange(async (value) => {
                        if (value.trim()) {
                            this.plugin.settings.customEmojiFolder = value.trim();
                            await this.plugin.saveSettings();

                            // Restart watcher with new folder
                            if (this.plugin.settings.enableCustomEmoji) {
                                await this.startCustomEmojiWatcher();
                            }
                        }
                    })
            );

        // Upload custom emoji
        new Setting(containerEl)
            .setName('Upload custom emoji')
            .setDesc('Upload an image file to use as a custom emoji')
            .addButton((button) =>
                button.setButtonText('Upload').onClick(() => {
                    this.showUploadDialog();
                })
            );

        // Custom emoji gallery
        if (this.plugin.settings.customEmojis.length > 0) {
            containerEl.createEl('h4', { text: 'Custom Emoji Gallery' });

            const gallery = containerEl.createDiv('emoji-gallery');

            for (const metadata of this.plugin.settings.customEmojis) {
                this.renderEmojiCard(gallery, metadata);
            }
        } else {
            containerEl.createEl('p', {
                text: 'No custom emoji yet. Upload images or add them to the custom emoji folder.',
                cls: 'setting-item-description',
            });
        }

        // Help section
        containerEl.createEl('h3', { text: 'Help' });
        const helpText = containerEl.createEl('div', { cls: 'setting-item-description' });
        helpText.innerHTML = `
            <p><strong>Using emoji in notes:</strong></p>
            <ul>
                <li>Type <code>:shortcode:</code> to render emoji (e.g., <code>:thumbsup:</code>)</li>
                <li>Use aliases for convenience (e.g., <code>:+1:</code> works for thumbsup)</li>
                <li>Add custom emoji by uploading images or placing them in the custom emoji folder</li>
            </ul>
            <p><strong>Custom emoji tips:</strong></p>
            <ul>
                <li>Supported formats: PNG, JPG, GIF, SVG, WebP</li>
                <li>Filename becomes the shortcode (e.g., <code>logo.png</code> → <code>:logo:</code>)</li>
                <li>Spaces and special characters in filenames are converted to underscores</li>
                <li>Add aliases to make emoji easier to find</li>
            </ul>
        `;
    }

    /**
     * Render a card for a custom emoji in the gallery
     */
    private renderEmojiCard(container: HTMLElement, metadata: CustomEmojiMetadata): void {
        const card = container.createDiv('emoji-card');

        // Get emoji data from manager
        const emoji = this.plugin.emojiManager?.findByShortcode(metadata.shortcode);

        // Preview image
        if (emoji?.type === 'custom') {
            const img = card.createEl('img', { cls: 'emoji-preview-large' });
            img.src = emoji.data;
            img.alt = `:${metadata.shortcode}:`;
        }

        // Shortcode
        const shortcodeEl = card.createEl('div');
        shortcodeEl.style.cssText = 'font-weight: bold; text-align: center;';
        shortcodeEl.textContent = `:${metadata.shortcode}:`;

        // Filename
        const filenameEl = card.createEl('div');
        filenameEl.style.cssText = 'font-size: 0.8em; color: var(--text-muted); text-align: center;';
        filenameEl.textContent = metadata.filename;

        // Aliases
        if (metadata.aliases.length > 0) {
            const aliasesEl = card.createEl('div');
            aliasesEl.style.cssText = 'font-size: 0.8em; color: var(--text-muted);';
            aliasesEl.textContent = `Aliases: ${metadata.aliases.map((a) => `:${a}:`).join(', ')}`;
        }

        // Action buttons
        const actions = card.createDiv('emoji-actions');
        actions.style.cssText = 'margin-top: 0.5rem;';

        // Edit aliases button
        const editBtn = actions.createEl('button', { text: 'Edit Aliases' });
        editBtn.style.cssText = 'flex: 1; padding: 0.25rem 0.5rem; font-size: 0.9em;';
        editBtn.onclick = () => {
            this.showEditAliasesDialog(metadata);
        };

        // Delete button
        const deleteBtn = actions.createEl('button', { text: 'Delete' });
        deleteBtn.style.cssText =
            'flex: 1; padding: 0.25rem 0.5rem; font-size: 0.9em; background-color: var(--background-modifier-error); color: var(--text-on-accent);';
        deleteBtn.onclick = async () => {
            await this.deleteCustomEmoji(metadata.shortcode);
        };
    }

    /**
     * Show dialog to upload a custom emoji
     */
    private showUploadDialog(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/gif,image/svg+xml,image/webp';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                // Generate shortcode from filename
                const shortcode = this.filenameToShortcode(file.name);

                // Check if shortcode already exists
                const existing = this.plugin.emojiManager?.findByShortcode(shortcode);
                if (existing) {
                    new Notice(
                        `Emoji with shortcode :${shortcode}: already exists. Please rename the file or delete the existing emoji.`
                    );
                    return;
                }

                // Read file as array buffer for saving
                const arrayBuffer = await file.arrayBuffer();

                // Save file to custom emoji folder
                const folderPath = this.plugin.settings.customEmojiFolder;
                const filePath = `${folderPath}/${file.name}`;

                // Create folder if it doesn't exist
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (!folder) {
                    await this.app.vault.createFolder(folderPath);
                }

                // Write file to vault
                await this.app.vault.createBinary(filePath, arrayBuffer);

                new Notice(`Custom emoji :${shortcode}: uploaded successfully!`);

                // Refresh display
                this.display();
            } catch (error) {
                console.error('Failed to upload custom emoji:', error);
                new Notice('Failed to upload custom emoji. See console for details.');
            }
        };

        input.click();
    }

    /**
     * Show dialog to edit aliases for a custom emoji
     */
    private showEditAliasesDialog(metadata: CustomEmojiMetadata): void {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: 1.5rem;
            z-index: 1000;
            min-width: 400px;
            max-width: 600px;
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;

        const title = modal.createEl('h3', { text: `Edit aliases for :${metadata.shortcode}:` });
        title.style.marginTop = '0';

        modal.createEl('p', {
            text: 'Enter aliases separated by commas (e.g., logo, brand, company)',
            cls: 'setting-item-description',
        });

        const input = modal.createEl('textarea');
        input.value = metadata.aliases.join(', ');
        input.style.cssText = 'width: 100%; min-height: 80px; margin-bottom: 1rem;';

        const buttons = modal.createDiv();
        buttons.style.cssText = 'display: flex; gap: 0.5rem; justify-content: flex-end;';

        const saveBtn = buttons.createEl('button', { text: 'Save' });
        saveBtn.style.cssText = 'padding: 0.5rem 1rem;';
        saveBtn.onclick = async () => {
            const aliasesText = input.value.trim();
            const aliases = aliasesText
                ? aliasesText.split(',').map((a) => a.trim().toLowerCase())
                : [];

            // Update metadata
            metadata.aliases = aliases;

            // Save to settings
            await this.plugin.saveSettings();

            // Update in emoji manager
            if (this.plugin.emojiManager) {
                this.plugin.emojiManager.updateCustomEmoji(metadata.shortcode, { aliases });
            }

            // Close modal
            document.body.removeChild(overlay);
            document.body.removeChild(modal);

            new Notice('Aliases updated');
            this.display();
        };

        const cancelBtn = buttons.createEl('button', { text: 'Cancel' });
        cancelBtn.style.cssText = 'padding: 0.5rem 1rem;';
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        };

        overlay.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        };

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        input.focus();
    }

    /**
     * Delete a custom emoji
     */
    private async deleteCustomEmoji(shortcode: string): Promise<void> {
        const confirmed = confirm(
            `Are you sure you want to delete the custom emoji :${shortcode}:? This will remove the file from your vault.`
        );
        if (!confirmed) return;

        try {
            // Find metadata
            const metadata = this.plugin.settings.customEmojis.find(
                (m) => m.shortcode === shortcode
            );
            if (!metadata) {
                new Notice('Emoji not found in settings');
                return;
            }

            // Get emoji to find filepath
            const emoji = this.plugin.emojiManager?.findByShortcode(shortcode);
            if (emoji?.type === 'custom') {
                // Delete file from vault
                const file = this.app.vault.getAbstractFileByPath(emoji.filepath);
                if (file) {
                    await this.app.vault.delete(file);
                }
            }

            // Remove from settings
            this.plugin.settings.customEmojis = this.plugin.settings.customEmojis.filter(
                (m) => m.shortcode !== shortcode
            );
            await this.plugin.saveSettings();

            // Remove from emoji manager
            if (this.plugin.emojiManager) {
                this.plugin.emojiManager.removeCustomEmoji(shortcode);
            }

            new Notice(`Custom emoji :${shortcode}: deleted`);
            this.display();
        } catch (error) {
            console.error('Failed to delete custom emoji:', error);
            new Notice('Failed to delete custom emoji. See console for details.');
        }
    }

    /**
     * Convert filename to shortcode
     */
    private filenameToShortcode(filename: string): string {
        const name = filename.replace(/\.[^.]+$/, '');
        return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    }

    /**
     * Convert blob to data URL
     */
    private blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Start custom emoji watcher
     */
    private async startCustomEmojiWatcher(): Promise<void> {
        if (this.plugin.emojiWatcher) {
            this.plugin.emojiWatcher.stop();
        }

        if (this.plugin.emojiManager) {
            const { CustomEmojiWatcher } = await import('./custom-emoji-watcher');
            this.plugin.emojiWatcher = new CustomEmojiWatcher(
                this.app.vault,
                this.plugin.emojiManager,
                this.plugin.settings.customEmojiFolder
            );
            await this.plugin.emojiWatcher.start();
            new Notice('Custom emoji watcher restarted');
        }
    }

    /**
     * Stop custom emoji watcher
     */
    private stopCustomEmojiWatcher(): void {
        if (this.plugin.emojiWatcher) {
            this.plugin.emojiWatcher.stop();
            this.plugin.emojiWatcher = null;
            new Notice('Custom emoji watcher stopped');
        }
    }
}
