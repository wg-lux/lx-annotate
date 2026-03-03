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

# Helper: run commands inside the devenv environment
DEVENV_RUN = $(DEVENV) shell --

.PHONY: help doctor check-tools check-repo ensure-repo-dir ensure-git-repo \
	setup bootstrap update submodules reset-branch migrate load-base-data static \
	deploy-prod deploy start-app start-watcher start-export shell django-check \
	test lint frontend-build backend-server docs-build docs-publish

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

migrate: check-repo check-tools ## Apply database migrations
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py migrate --noinput

load-base-data: check-repo check-tools ## Load baseline application data
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py load_base_db_data

static: check-repo check-tools ## Collect static files
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py collectstatic --noinput --clear

docs-build: check-repo check-tools ## Build Sphinx HTML docs
	cd "$(REPO_DIR)" && $(DEVENV_RUN) uv run --extra docs make -C docs html

docs-publish: docs-build ## Publish docs to static/docs for the /documentation app route
	cd "$(REPO_DIR)" && $(MKDIR_P) static/docs
	cd "$(REPO_DIR)" && rsync -a --delete docs/_build/html/ static/docs/

deploy-prod: update submodules migrate load-base-data static ## Update code and prepare prod assets
	@echo "Production deploy steps completed."

deploy: deploy-prod ## Alias for deploy-prod
	@true

frontend-build: check-repo check-tools ## Build frontend assets via devenv script
	cd "$(REPO_DIR)" && $(DEVENV_RUN) vue-build

backend-server: check-repo check-tools ## Start backend server via devenv script
	cd "$(REPO_DIR)" && $(DEVENV_RUN) run-server

start-app: check-repo check-tools ## Build frontend then start app server
	cd "$(REPO_DIR)" && $(DEVENV_RUN) bash -lc 'vue-build && run-server'

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
