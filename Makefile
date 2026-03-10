SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c

.DEFAULT_GOAL := help

# Repository / deployment configuration (override at invocation time)
REPO_DIR ?= $(CURDIR)
BRANCH ?= main
GIT_URL ?= https://github.com/wg-lux/lx-annotate.git
REMOTE ?= origin

# Tooling
DEVENV ?= devenv
GIT ?= git
MKDIR_P ?= mkdir -p
CACHE_DIR ?= $(REPO_DIR)/.make-cache
FRONTEND_HASH_FILE ?= $(CACHE_DIR)/frontend-src.sha256
MIGRATIONS_HASH_FILE ?= $(CACHE_DIR)/migrations.sha256

# Helper: run commands inside the devenv environment
DEVENV_RUN = $(DEVENV) shell --

.PHONY: help doctor check-tools check-repo ensure-repo-dir ensure-git-repo \
	setup bootstrap update submodules reset-branch migrate load-base-data static \
	deploy-prod deploy start-app start-watcher start-export shell django-check \
	test lint frontend-build frontend-build-force backend-server docs-build docs-publish \
	migrate-force verify-vite-artifacts

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*## "}; /^[a-zA-Z0-9_.-]+:.*## / {printf "%-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST) | sort

doctor: ## Print effective configuration
	@printf "REPO_DIR=%s\n" "$(REPO_DIR)"
	@printf "BRANCH=%s\n" "$(BRANCH)"
	@printf "GIT_URL=%s\n" "$(GIT_URL)"
	@printf "REMOTE=%s\n" "$(REMOTE)"
	@printf "DEVENV=%s\n" "$(DEVENV)"

check-tools: ## Verify required host tools exist (git, devenv)
	@command -v "$(GIT)" >/dev/null
	@command -v "$(DEVENV)" >/dev/null

check-repo: ## Verify this looks like an lx-annotate repo checkout
	@test -f "$(REPO_DIR)/manage.py"

ensure-repo-dir: ## Create repo directory if missing
	@$(MKDIR_P) "$(REPO_DIR)"

ensure-git-repo: ensure-repo-dir ## Clone repo if missing; otherwise validate git checkout
	@if [ ! -d "$(REPO_DIR)/.git" ]; then \
		if [ -n "$$(find "$(REPO_DIR)" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then \
			echo "Refusing to clone into non-empty non-git directory: $(REPO_DIR)" >&2; \
			exit 1; \
		fi; \
		echo "Cloning $(GIT_URL) (branch $(BRANCH)) into $(REPO_DIR)"; \
		"$(GIT)" clone --branch "$(BRANCH)" --single-branch "$(GIT_URL)" "$(REPO_DIR)"; \
	else \
		"$(GIT)" -C "$(REPO_DIR)" rev-parse --is-inside-work-tree >/dev/null; \
	fi

bootstrap: ensure-git-repo ## First-time clone only (safe for empty dir)
	@true

setup: ensure-git-repo ## Ensure checkout exists and branch is selected locally
	@echo "Preparing repository at $(REPO_DIR)"
	@"$(GIT)" -C "$(REPO_DIR)" fetch --prune "$(REMOTE)"
	@"$(GIT)" -C "$(REPO_DIR)" checkout "$(BRANCH)"

update: setup ## Fast-forward branch from remote
	@echo "Updating source ($(BRANCH))"
	@"$(GIT)" -C "$(REPO_DIR)" pull --ff-only "$(REMOTE)" "$(BRANCH)"

submodules: ensure-git-repo ## Sync and update submodules
	@"$(GIT)" -C "$(REPO_DIR)" submodule sync --recursive
	@"$(GIT)" -C "$(REPO_DIR)" submodule update --init --recursive

reset-branch: setup ## Hard-reset local branch to remote (destructive; use carefully)
	@"$(GIT)" -C "$(REPO_DIR)" reset --hard "$(REMOTE)/$(BRANCH)"

django-check: check-repo check-tools ## Run Django checks in devenv
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py check

migrate: check-repo check-tools ## Apply database migrations (only when migration files changed)
	@$(MKDIR_P) "$(CACHE_DIR)"
	@set -e; \
	new_hash="$$(cd "$(REPO_DIR)" && { find . -type f -path '*/migrations/*.py' ! -name '__init__.py' -print0 | sort -z | xargs -0 -r sha256sum; } | sha256sum | awk '{print $$1}')"; \
	old_hash="$$(cat "$(MIGRATIONS_HASH_FILE)" 2>/dev/null || true)"; \
	if [ "$$new_hash" != "$$old_hash" ]; then \
		echo "Migration files changed; applying migrations."; \
		cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py migrate --noinput; \
		printf '%s\n' "$$new_hash" > "$(MIGRATIONS_HASH_FILE)"; \
	else \
		echo "Migration files unchanged; skipping migrate."; \
	fi

migrate-force: check-repo check-tools ## Force-apply database migrations and refresh migration cache
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py migrate --noinput
	@$(MKDIR_P) "$(CACHE_DIR)"
	@cd "$(REPO_DIR)" && { find . -type f -path '*/migrations/*.py' ! -name '__init__.py' -print0 | sort -z | xargs -0 -r sha256sum; } | sha256sum | awk '{print $$1}' > "$(MIGRATIONS_HASH_FILE)"

load-base-data: check-repo check-tools ## Load baseline application data
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py load_base_db_data

static: check-repo check-tools ## Collect static files
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py collectstatic

docs-build: check-repo check-tools ## Build Sphinx HTML docs
	cd "$(REPO_DIR)" && $(DEVENV_RUN) uv run --extra docs make -C docs html

docs-publish: docs-build ## Publish docs to static/docs for the /documentation app route
	cd "$(REPO_DIR)" && $(MKDIR_P) static/docs
	cd "$(REPO_DIR)" && rsync -a --delete docs/_build/html/ static/docs/

verify-vite-artifacts: check-repo check-tools frontend-build-force ## Fail if frontend build changes committed static artifacts
	@set -e; \
	if ! cd "$(REPO_DIR)" && "$(GIT)" diff --quiet -- static; then \
		echo "static changed after vue-build. Commit updated frontend artifacts."; \
		cd "$(REPO_DIR)" && "$(GIT)" diff --name-only -- static; \
		exit 1; \
	fi

deploy-prod: update submodules verify-vite-artifacts migrate load-base-data static ## Update code and prepare prod assets
	@echo "Production deploy steps completed."

deploy: deploy-prod ## Alias for deploy-prod
	@true

frontend-build: check-repo check-tools ## Build frontend assets only when frontend/src changed
	@$(MKDIR_P) "$(CACHE_DIR)"
	@set -e; \
	new_hash="$$(cd "$(REPO_DIR)" && { find frontend/src -type f -print0 | sort -z | xargs -0 -r sha256sum; } | sha256sum | awk '{print $$1}')"; \
	old_hash="$$(cat "$(FRONTEND_HASH_FILE)" 2>/dev/null || true)"; \
	if [ "$$new_hash" != "$$old_hash" ]; then \
		echo "frontend/src changed; building frontend assets."; \
		cd "$(REPO_DIR)" && $(DEVENV_RUN) vue-build; \
		printf '%s\n' "$$new_hash" > "$(FRONTEND_HASH_FILE)"; \
	else \
		echo "frontend/src unchanged; skipping frontend build."; \
	fi

frontend-build-force: check-repo check-tools ## Force-build frontend assets and refresh frontend cache
	cd "$(REPO_DIR)" && $(DEVENV_RUN) vue-build
	@$(MKDIR_P) "$(CACHE_DIR)"
	@cd "$(REPO_DIR)" && { find frontend/src -type f -print0 | sort -z | xargs -0 -r sha256sum; } | sha256sum | awk '{print $$1}' > "$(FRONTEND_HASH_FILE)"

backend-server: check-repo check-tools
	cd "$(REPO_DIR)" && $(DEVENV_RUN) run-server

start-app: check-repo check-tools
	cd "$(REPO_DIR)" && exec $(DEVENV_RUN) run-server

start-watcher: check-repo check-tools ## Start file watcher process
	cd "$(REPO_DIR)" && $(DEVENV_RUN) run-filewatcher

start-export: check-repo check-tools ## Run frame export worker
	cd "$(REPO_DIR)" && $(DEVENV_RUN) export-frames

shell: check-repo check-tools ## Open interactive devenv shell in repo
	cd "$(REPO_DIR)" && $(DEVENV) shell

test: check-repo check-tools ## Run backend tests (pytest)
	cd "$(REPO_DIR)" && $(DEVENV_RUN) pytest

lint: check-repo check-tools ## Run frontend lint (best-effort if configured)
	cd "$(REPO_DIR)/frontend" && $(DEVENV_RUN) npm run lint
