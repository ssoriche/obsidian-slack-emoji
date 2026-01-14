import { Plugin } from 'obsidian';
import type { EmojiSettings } from './types/emoji';
import { validateSettings } from './settings';
import { DEFAULT_SETTINGS } from './types/emoji';

/**
 * Main plugin class for Slack-style emoji support
 */
export default class SlackEmojiPlugin extends Plugin {
    settings: EmojiSettings = DEFAULT_SETTINGS;

    /**
     * Called when plugin is loaded
     */
    async onload(): Promise<void> {
        console.log('Loading Slack Emoji plugin');

        // Load settings
        await this.loadSettings();

        // TODO: Initialize emoji manager
        // TODO: Register editor extensions
        // TODO: Register markdown post-processor
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
        // TODO: Dispose editor extensions
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
