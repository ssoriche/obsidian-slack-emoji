.PHONY: help install dev build test lint format typecheck clean release dev-vault quality

# Default target
help:
	@echo "Obsidian Slack Emoji - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Build in watch mode"
	@echo "  make dev-vault        Copy built files to test vault"
	@echo ""
	@echo "Build:"
	@echo "  make build            Build for production"
	@echo ""
	@echo "Quality:"
	@echo "  make test             Run all tests"
	@echo "  make test-watch       Run tests in watch mode"
	@echo "  make test-coverage    Run tests with coverage"
	@echo "  make lint             Run ESLint"
	@echo "  make format           Format code with Prettier"
	@echo "  make format-check     Check code formatting"
	@echo "  make typecheck        Run TypeScript type checking"
	@echo "  make quality          Run all quality checks"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            Remove build artifacts"
	@echo ""
	@echo "Release:"
	@echo "  make release VERSION=x.y.z    Update version and create tag"
	@echo ""
	@echo "Note: Requires devbox (https://www.jetify.com/devbox)"

# Variables
TEST_VAULT ?= $(HOME)/Documents/ObsidianTestVault
PLUGIN_DIR := $(TEST_VAULT)/.obsidian/plugins/obsidian-slack-emoji

# Install dependencies
install:
	@echo "Installing dependencies..."
	@devbox run -- bun install
	@echo "Dependencies installed!"

# Development
dev:
	devbox run -- bun run dev

dev-vault:
	@mkdir -p $(PLUGIN_DIR)
	@cp main.js manifest.json styles.css $(PLUGIN_DIR)/
	@echo "Files copied to $(PLUGIN_DIR)"

# Build
build:
	devbox run -- bun run build

# Testing
test:
	devbox run -- bun run test

test-watch:
	devbox run -- bun run test:watch

test-coverage:
	devbox run -- bun run test:coverage

# Code Quality
lint:
	devbox run -- bun run lint

format:
	devbox run -- bun run format

format-check:
	devbox run -- bun run format:check

typecheck:
	devbox run -- bun run typecheck

quality: lint format-check typecheck test
	@echo "All quality checks passed!"

# Cleanup
clean:
	rm -f main.js main.js.map
	rm -rf coverage/

# Release
release:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION is required. Usage: make release VERSION=x.y.z"; \
		exit 1; \
	fi
	@echo "Updating version to $(VERSION)..."
	@jq '.version = "$(VERSION)"' manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json
	@jq '.version = "$(VERSION)"' package.json > package.json.tmp && mv package.json.tmp package.json
	@git add manifest.json package.json
	@git commit -m "chore: bump version to $(VERSION)"
	@git tag v$(VERSION)
	@echo "Version updated to $(VERSION). Push with: git push && git push --tags"
