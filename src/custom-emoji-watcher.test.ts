import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomEmojiWatcher } from './custom-emoji-watcher';
import { EmojiManager } from './emoji-manager';
import type { Vault, TFile } from 'obsidian';

describe('CustomEmojiWatcher', () => {
    let watcher: CustomEmojiWatcher;
    let manager: EmojiManager;
    let mockVault: Vault;

    const createMockFile = (path: string, name: string): TFile => ({
        path,
        name,
        extension: name.split('.').pop() ?? '',
        stat: {
            ctime: Date.now(),
            mtime: Date.now(),
            size: 1024,
        },
        basename: name.replace(/\.[^.]+$/, ''),
        vault: mockVault,
        parent: null,
    });

    beforeEach(async () => {
        manager = new EmojiManager();
        await manager.loadUnicodeEmojis(); // Load Unicode emoji so manager is initialized

        // Create a minimal mock vault
        mockVault = {
            getFiles: vi.fn(() => []),
            readBinary: vi.fn(async () => new ArrayBuffer(8)),
            on: vi.fn((eventName: string, callback: (...args: unknown[]) => unknown) => ({
                eventName,
                callback,
            })),
            offref: vi.fn(),
        } as unknown as Vault;

        watcher = new CustomEmojiWatcher(mockVault, manager, '.obsidian/emoji');
    });

    describe('constructor', () => {
        it('should create a watcher with vault, manager, and folder path', () => {
            expect(watcher).toBeDefined();
            expect(watcher).toBeInstanceOf(CustomEmojiWatcher);
        });
    });

    describe('start', () => {
        it('should register event handlers with the vault', async () => {
            await watcher.start();

            expect(mockVault.on).toHaveBeenCalledWith('create', expect.any(Function));
            expect(mockVault.on).toHaveBeenCalledWith('delete', expect.any(Function));
            expect(mockVault.on).toHaveBeenCalledWith('rename', expect.any(Function));
            expect(mockVault.on).toHaveBeenCalledWith('modify', expect.any(Function));
        });

        it('should load existing emoji from the folder', async () => {
            const mockFile = createMockFile('.obsidian/emoji/test.png', 'test.png');
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([mockFile]);

            // Mock readBinary to return a small PNG-like buffer
            (mockVault.readBinary as ReturnType<typeof vi.fn>).mockResolvedValue(
                new ArrayBuffer(8)
            );

            await watcher.start();

            // Should have loaded the emoji
            const stats = manager.getStats();
            expect(stats.custom).toBe(1);
        });
    });

    describe('stop', () => {
        it('should unregister event handlers from the vault', async () => {
            await watcher.start(); // Register handlers first

            watcher.stop();

            // Should call offref for each registered handler (4 events)
            expect(mockVault.offref).toHaveBeenCalledTimes(4);
        });
    });

    describe('emoji file detection', () => {
        it('should recognize image files in the emoji folder', async () => {
            const pngFile = createMockFile('.obsidian/emoji/logo.png', 'logo.png');
            const jpgFile = createMockFile('.obsidian/emoji/icon.jpg', 'icon.jpg');
            const gifFile = createMockFile('.obsidian/emoji/animation.gif', 'animation.gif');

            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([
                pngFile,
                jpgFile,
                gifFile,
            ]);
            (mockVault.readBinary as ReturnType<typeof vi.fn>).mockResolvedValue(
                new ArrayBuffer(8)
            );

            await watcher.start();

            const stats = manager.getStats();
            expect(stats.custom).toBe(3);
        });

        it('should ignore non-image files', async () => {
            const txtFile = createMockFile('.obsidian/emoji/readme.txt', 'readme.txt');
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([txtFile]);

            await watcher.start();

            const stats = manager.getStats();
            expect(stats.custom).toBe(0);
        });

        it('should ignore files outside the emoji folder', async () => {
            const outsideFile = createMockFile('other/folder/image.png', 'image.png');
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([outsideFile]);

            await watcher.start();

            const stats = manager.getStats();
            expect(stats.custom).toBe(0);
        });
    });

    describe('shortcode generation', () => {
        it('should convert filename to shortcode', async () => {
            const file = createMockFile('.obsidian/emoji/company-logo.png', 'company-logo.png');
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([file]);
            (mockVault.readBinary as ReturnType<typeof vi.fn>).mockResolvedValue(
                new ArrayBuffer(8)
            );

            await watcher.start();

            const emoji = manager.findByShortcode('company-logo');
            expect(emoji).toBeDefined();
            expect(emoji?.shortcode).toBe('company-logo');
        });

        it('should replace spaces with underscores in shortcodes', async () => {
            const file = createMockFile(
                '.obsidian/emoji/my emoji.png',
                'my emoji.png'
            );
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([file]);
            (mockVault.readBinary as ReturnType<typeof vi.fn>).mockResolvedValue(
                new ArrayBuffer(8)
            );

            await watcher.start();

            const emoji = manager.findByShortcode('my_emoji');
            expect(emoji).toBeDefined();
        });

        it('should replace special characters with underscores', async () => {
            const file = createMockFile(
                '.obsidian/emoji/emoji@#$.png',
                'emoji@#$.png'
            );
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([file]);
            (mockVault.readBinary as ReturnType<typeof vi.fn>).mockResolvedValue(
                new ArrayBuffer(8)
            );

            await watcher.start();

            const emoji = manager.findByShortcode('emoji___');
            expect(emoji).toBeDefined();
        });
    });
});
