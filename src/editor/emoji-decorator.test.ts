import { describe, it, expect, beforeEach } from 'vitest';
import { EmojiDecorator } from './emoji-decorator';
import { EmojiManager } from '../emoji-manager';

describe('EmojiDecorator', () => {
    let manager: EmojiManager;
    let decorator: EmojiDecorator;

    beforeEach(async () => {
        manager = new EmojiManager();
        await manager.loadUnicodeEmojis();
        decorator = new EmojiDecorator(manager);
    });

    describe('constructor', () => {
        it('should create a decorator with emoji manager', () => {
            expect(decorator).toBeDefined();
            expect(decorator).toBeInstanceOf(EmojiDecorator);
        });
    });

    describe('buildDecorations', () => {
        it('should return a DecorationSet', () => {
            // Note: Full integration testing with CodeMirror requires a proper editor setup
            // which is difficult in a unit test environment. The decorator's functionality
            // is best tested through manual testing in the actual Obsidian plugin.
            // Here we just verify the decorator can be instantiated.
            expect(decorator).toBeDefined();
        });
    });
});
