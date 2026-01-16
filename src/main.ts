import { Plugin } from 'obsidian';
import type { EmojiSettings } from './types/emoji';
import { validateSettings } from './settings';
import { DEFAULT_SETTINGS } from './types/emoji';
import { EmojiManager } from './emoji-manager';
import { EmojiPostProcessor } from './reading/emoji-postprocessor';
import { createEmojiEditorPlugin } from './editor/emoji-plugin';

/**
 * Main plugin class for Slack-style emoji support
 */
export default class SlackEmojiPlugin extends Plugin {
    settings: EmojiSettings = DEFAULT_SETTINGS;
    emojiManager: EmojiManager | null = null;

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

        // TODO: Load custom emoji from settings
        // TODO: Add settings tab
        // TODO: Start file watcher

        console.log('Slack Emoji plugin loaded');
    }

    /**
     * Called when plugin is unloaded
     */
    onunload(): void {
        console.log('Unloading Slack Emoji plugin');

        // TODO: Clean up file watcher
        // Editor extensions are automatically disposed by Obsidian

        this.emojiManager = null;
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
