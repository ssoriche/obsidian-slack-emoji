import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
            adapter: {
                exists: vi.fn(async () => false),
                list: vi.fn(async () => ({ files: [], folders: [] })),
                readBinary: vi.fn(async () => new ArrayBuffer(8)),
            },
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

        it('should not match files in a folder whose name starts with the emoji folder name', async () => {
            // e.g. .obsidian/emoji-extra/ should NOT match .obsidian/emoji/
            const adjacentFile = createMockFile('.obsidian/emoji-extra/logo.png', 'logo.png');
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([adjacentFile]);

            await watcher.start();

            const stats = manager.getStats();
            expect(stats.custom).toBe(0);
        });
    });

    describe('event-driven emoji loading', () => {
        it('should register emoji via create event even for non-TFile objects', async () => {
            await watcher.start();

            // Capture the create callback registered with vault.on
            const onCalls = (mockVault.on as ReturnType<typeof vi.fn>).mock.calls as [
                string,
                (...args: unknown[]) => unknown,
            ][];
            const createCallback = onCalls.find(([event]) => event === 'create')?.[1];
            expect(createCallback).toBeDefined();

            // Simulate a vault create event with a minimal object (no TFile extension/stat).
            // The callback uses `void` internally so we wait for the async work to settle.
            const plainFile = {
                path: '.obsidian/emoji/test-unique-emoji.png',
                name: 'test-unique-emoji.png',
            };
            createCallback?.(plainFile);

            await vi.waitFor(() => {
                const emoji = manager.findByShortcode('test-unique-emoji');
                expect(emoji).not.toBeNull();
                expect(emoji?.type).toBe('custom');
            });
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
            const file = createMockFile('.obsidian/emoji/my emoji.png', 'my emoji.png');
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([file]);
            (mockVault.readBinary as ReturnType<typeof vi.fn>).mockResolvedValue(
                new ArrayBuffer(8)
            );

            await watcher.start();

            const emoji = manager.findByShortcode('my_emoji');
            expect(emoji).toBeDefined();
        });

        it('should replace special characters with underscores', async () => {
            const file = createMockFile('.obsidian/emoji/emoji@#$.png', 'emoji@#$.png');
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([file]);
            (mockVault.readBinary as ReturnType<typeof vi.fn>).mockResolvedValue(
                new ArrayBuffer(8)
            );

            await watcher.start();

            const emoji = manager.findByShortcode('emoji___');
            expect(emoji).toBeDefined();
        });
    });

    describe('polling', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            watcher.stop();
            vi.useRealTimers();
        });

        it('should start a poll timer when started', async () => {
            const setIntervalSpy = vi.spyOn(window, 'setInterval');
            await watcher.start();
            expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
        });

        it('should clear the poll timer when stopped', async () => {
            const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
            await watcher.start();
            watcher.stop();
            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        it('should pick up externally-added files when poll runs', async () => {
            // Start with an empty folder
            await watcher.start();
            expect(manager.getStats().custom).toBe(0);

            // Simulate a file appearing in the folder (e.g. copied via Finder)
            (mockVault.adapter.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (mockVault.adapter.list as ReturnType<typeof vi.fn>).mockResolvedValue({
                files: ['.obsidian/emoji/newly-added.png'],
                folders: [],
            });

            // Call the private poll method directly to avoid FileReader/timer interaction
            await (watcher as unknown as { pollForNewEmoji(): Promise<void> }).pollForNewEmoji();

            const emoji = manager.findByShortcode('newly-added');
            expect(emoji).toBeDefined();
            expect(emoji?.type).toBe('custom');
        });

        it('should not re-read files that are already registered', async () => {
            // Pre-load an emoji
            const existingFile = createMockFile('.obsidian/emoji/existing.png', 'existing.png');
            (mockVault.getFiles as ReturnType<typeof vi.fn>).mockReturnValue([existingFile]);
            (mockVault.readBinary as ReturnType<typeof vi.fn>).mockResolvedValue(
                new ArrayBuffer(8)
            );
            await watcher.start();
            expect(manager.getStats().custom).toBe(1);

            // Poll returns the same file
            (mockVault.adapter.exists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (mockVault.adapter.list as ReturnType<typeof vi.fn>).mockResolvedValue({
                files: ['.obsidian/emoji/existing.png'],
                folders: [],
            });
            const readBinarySpy = mockVault.adapter.readBinary as ReturnType<typeof vi.fn>;
            readBinarySpy.mockClear();

            await (watcher as unknown as { pollForNewEmoji(): Promise<void> }).pollForNewEmoji();

            // adapter.readBinary should NOT have been called again for the existing emoji
            expect(readBinarySpy).not.toHaveBeenCalled();
            expect(manager.getStats().custom).toBe(1);
        });
    });
});
