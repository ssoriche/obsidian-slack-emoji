import { Plugin } from 'obsidian';
import type { EmojiSettings } from './types/emoji';
import { validateSettings } from './settings';
import { DEFAULT_SETTINGS } from './types/emoji';
import { EmojiManager } from './emoji-manager';
import { EmojiPostProcessor } from './reading/emoji-postprocessor';
import { createEmojiEditorPlugin } from './editor/emoji-plugin';
import { CustomEmojiWatcher } from './custom-emoji-watcher';
import { SlackEmojiSettingTab } from './settings-tab';
import { EmojiSuggester } from './editor/emoji-suggester';

/**
 * Main plugin class for Slack-style emoji support
 */
export default class SlackEmojiPlugin extends Plugin {
    settings: EmojiSettings = DEFAULT_SETTINGS;
    emojiManager: EmojiManager | null = null;
    emojiWatcher: CustomEmojiWatcher | null = null;
    emojiSuggester: EmojiSuggester | null = null;

    /**
     * Called when plugin is loaded
     */
    async onload(): Promise<void> {
        console.log('Loading Slack Emoji plugin');

        // Load settings
        await this.loadSettings();

        // Initialize emoji manager
        this.emojiManager = new EmojiManager();

        // Load Unicode emoji if enabled
        if (this.settings.enableUnicodeEmoji) {
            try {
                await this.emojiManager.loadUnicodeEmojis();
                console.log('Unicode emoji loaded');
            } catch (error) {
                console.error('Failed to load Unicode emoji:', error);
            }
        }

        // Register markdown post-processor for reading mode
        const processor = new EmojiPostProcessor(this.emojiManager);
        this.registerMarkdownPostProcessor((element, context) => {
            processor.process(element, context);
        });

        // Register editor extension for live preview
        this.registerEditorExtension(createEmojiEditorPlugin(this.emojiManager));

        // Load custom emoji from settings
        if (this.settings.enableCustomEmoji) {
            this.loadCustomEmojisFromSettings();
        }

        // Start file watcher for custom emoji
        if (this.settings.enableCustomEmoji) {
            try {
                this.emojiWatcher = new CustomEmojiWatcher(
                    this.app.vault,
                    this.emojiManager,
                    this.settings.customEmojiFolder
                );
                await this.emojiWatcher.start();
                console.log(
                    `Custom emoji watcher started for folder: ${this.settings.customEmojiFolder}`
                );
            } catch (error) {
                console.error('Failed to start custom emoji watcher:', error);
            }
        }

        // Register autocomplete suggester
        if (this.settings.enableAutocomplete) {
            this.emojiSuggester = new EmojiSuggester(
                this.app,
                this.emojiManager,
                this.settings.autocompleteMinChars
            );
            this.registerEditorSuggest(this.emojiSuggester);
            console.log('Emoji autocomplete suggester registered');
        }

        // Add settings tab
        this.addSettingTab(new SlackEmojiSettingTab(this.app, this));

        console.log('Slack Emoji plugin loaded');
    }

    /**
     * Called when plugin is unloaded
     */
    onunload(): void {
        console.log('Unloading Slack Emoji plugin');

        // Clean up file watcher
        if (this.emojiWatcher) {
            this.emojiWatcher.stop();
            this.emojiWatcher = null;
        }

        // Editor extensions and suggesters are automatically disposed by Obsidian

        this.emojiSuggester = null;
        this.emojiManager = null;
    }

    /**
     * Load custom emoji aliases from settings
     * The watcher loads the images, this just adds the alias information
     */
    private loadCustomEmojisFromSettings(): void {
        if (!this.emojiManager) return;

        for (const metadata of this.settings.customEmojis) {
            const emoji = this.emojiManager.findByShortcode(metadata.shortcode);
            if (emoji?.type === 'custom') {
                // Update with aliases from settings
                this.emojiManager.updateCustomEmoji(metadata.shortcode, {
                    aliases: metadata.aliases,
                });
            }
        }
    }

    /**
     * Load settings from disk
     */
    async loadSettings(): Promise<void> {
        const loaded = (await this.loadData()) as Partial<EmojiSettings> | null;
        this.settings = validateSettings(loaded ?? {});
    }

    /**
     * Save settings to disk
     */
    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}
