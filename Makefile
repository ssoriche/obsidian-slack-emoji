SHELL := /bin/bash

.PHONY: help install dev build test lint format typecheck clean release tag-release dev-vault quality

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
	@echo "  make release VERSION=x.y.z    Create version bump PR"
	@echo "  make tag-release VERSION=x.y.z Tag release after PR merge"
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

# Release management
# Usage: make release VERSION=x.y.z
# This creates a PR with the version bump. After merging, run: make tag-release VERSION=x.y.z
release:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION is required. Usage: make release VERSION=x.y.z"; \
		exit 1; \
	fi
	@if ! echo "$(VERSION)" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?(\+[A-Za-z0-9.-]+)?$$'; then \
		echo "Error: VERSION '$(VERSION)' is not a valid semver string (e.g., 1.2.3 or 1.2.3-rc.1)"; \
		exit 1; \
	fi
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "Error: Working directory is not clean. Commit or stash changes first."; \
		exit 1; \
	fi
	@CURRENT_BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$CURRENT_BRANCH" != "main" ]; then \
		echo "Error: Must be on main branch to release. Currently on $$CURRENT_BRANCH"; \
		echo "Run: git checkout main && git pull"; \
		exit 1; \
	fi
	@git pull --ff-only origin main
	@git checkout -b "release/v$(VERSION)"
	@devbox run -- bun pm version "$(VERSION)" --no-git-tag-version
	@git add package.json manifest.json versions.json
	@git commit -m "chore: bump version to $(VERSION)"
	@git push -u origin "release/v$(VERSION)"
	@printf '## Summary\n\n- Bump version to $(VERSION)\n\nAfter merging, run:\n\n    make tag-release VERSION=$(VERSION)\n' \
		| gh pr create --title "chore: bump version to $(VERSION)" --body-file -
	@echo "PR created. After merge, run: make tag-release VERSION=$(VERSION)"

# Tag a release after the version bump PR is merged
tag-release:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION is required. Usage: make tag-release VERSION=x.y.z"; \
		exit 1; \
	fi
	@if ! echo "$(VERSION)" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?(\+[A-Za-z0-9.-]+)?$$'; then \
		echo "Error: VERSION '$(VERSION)' is not a valid semver string (e.g., 1.2.3 or 1.2.3-rc.1)"; \
		exit 1; \
	fi
	@CURRENT_BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$CURRENT_BRANCH" != "main" ]; then \
		echo "Error: Must be on main branch to tag. Currently on $$CURRENT_BRANCH"; \
		echo "Run: git checkout main && git pull"; \
		exit 1; \
	fi
	@git fetch origin main
	@LOCAL=$$(git rev-parse --verify main); \
	REMOTE=$$(git rev-parse --verify origin/main); \
	if [ "$$LOCAL" != "$$REMOTE" ]; then \
		echo "Error: Local main is out of sync with origin/main. Run: git pull"; \
		exit 1; \
	fi
	@PKG_VERSION=$$(devbox run -- jq -r '.version' package.json); \
	if [ "$$PKG_VERSION" != "$(VERSION)" ]; then \
		echo "Error: package.json version ($$PKG_VERSION) does not match VERSION=$(VERSION)."; \
		echo "Did you merge and pull the version bump PR first?"; \
		exit 1; \
	fi
	@MANIFEST_VERSION=$$(devbox run -- jq -r '.version' manifest.json); \
	if [ "$$MANIFEST_VERSION" != "$(VERSION)" ]; then \
		echo "Error: manifest.json version ($$MANIFEST_VERSION) does not match VERSION=$(VERSION)."; \
		echo "Did version-bump.mjs run correctly?"; \
		exit 1; \
	fi
	@if git tag -l "v$(VERSION)" | grep -q .; then \
		echo "Error: Local tag v$(VERSION) already exists. Run: git tag -d v$(VERSION)"; \
		exit 1; \
	fi
	@if git ls-remote --tags origin "refs/tags/v$(VERSION)" | grep -q .; then \
		echo "Error: Tag v$(VERSION) already exists on origin."; \
		exit 1; \
	fi
	@git tag -a "v$(VERSION)" -m "Release v$(VERSION)"
	@git push origin "v$(VERSION)"
	@echo ""
	@echo "Tag v$(VERSION) pushed successfully!"
	@echo "Monitor the release workflow with: gh run watch"
