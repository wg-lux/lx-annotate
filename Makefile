SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c

.DEFAULT_GOAL := help

# Repository / deployment configuration (override at invocation time)
REPO_DIR ?= $(CURDIR)
BRANCH ?= main
GIT_URL ?= https://github.com/wg-lux/lx-annotate.git
REMOTE ?= origin

# Tooling
DEVENV_PROFILE ?=
DEVENV ?= devenv
GIT ?= git
MKDIR_P ?= mkdir -p
CACHE_DIR ?= $(REPO_DIR)/.make-cache
FRONTEND_HASH_FILE ?= $(CACHE_DIR)/frontend-src.sha256
MIGRATIONS_HASH_FILE ?= $(CACHE_DIR)/migrations.sha256
FRONTEND_NIX ?= $(REPO_DIR)/frontend/default.nix

# Helper: run commands directly if inside an active devenv shell, otherwise wrap in subshell
ifneq ($(strip $(DEVENV_PROFILE)$(DEVENV_ROOT)$(DEVENV_STATE)),)
DEVENV_RUN ?=
else
DEVENV_RUN ?= $(DEVENV) shell --
endif


.PHONY: help doctor check-tools check-repo ensure-repo-dir ensure-git-repo \
	setup bootstrap update submodules reset-branch migrate load-base-data static \
	deploy-prod deploy start-app start-watcher start-export shell django-check \
	test lint frontend-build frontend-build-force backend-server docs-build docs-publish \
	migrate-force verify-vite-artifacts verify-vite-manifest package package-check package-upload

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

make-migrations: check-repo check-tools
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py makemigrations

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
	cd "$(REPO_DIR)" && $(DEVENV_RUN) python manage.py collectstatic --noinput --clear

docs-build: check-repo check-tools ## Build Sphinx HTML docs
	cd "$(REPO_DIR)" && $(DEVENV_RUN) uv run --extra docs make -C docs html

docs-publish: docs-build ## Publish docs for the /documentation app route
	cd "$(REPO_DIR)" && $(MKDIR_P) static/docs
	cd "$(REPO_DIR)" && rsync -a --delete docs/_build/html/ static/docs/
	cd "$(REPO_DIR)" && $(MKDIR_P) staticfiles/docs
	cd "$(REPO_DIR)" && rsync -a --delete docs/_build/html/ staticfiles/docs/

verify-vite-artifacts: check-repo check-tools frontend-build-force ## Fail if frontend build changes committed staticfiles artifacts
	@set -e; \
	if ! cd "$(REPO_DIR)" && "$(GIT)" diff --quiet -- staticfiles; then \
		echo "staticfiles changed after vue-build. Commit updated frontend artifacts."; \
		cd "$(REPO_DIR)" && "$(GIT)" diff --name-only -- staticfiles; \
		exit 1; \
	fi

verify-vite-manifest: check-repo check-tools frontend-build-force ## Fail if the built Vite manifest is empty, invalid, or missing src/main.ts
	@cd "$(REPO_DIR)" && $(DEVENV_RUN) python -c 'import json; from pathlib import Path; fail=lambda msg: (_ for _ in ()).throw(SystemExit(msg)); static_root=Path("staticfiles"); manifest_path=static_root/".vite"/"manifest.json"; manifest_path.exists() or fail(f"missing Vite manifest: {manifest_path}"); raw=manifest_path.read_text(encoding="utf-8"); raw.strip() or fail(f"empty Vite manifest: {manifest_path}"); manifest=json.loads(raw); entry=manifest.get("src/main.ts"); isinstance(entry, dict) or fail("Vite manifest is missing the src/main.ts entry required by {% vite_asset '\''src/main.ts'\'' %}"); entry_file=entry.get("file"); entry_file or fail("Vite manifest src/main.ts entry is missing its file mapping"); entry_path=static_root/entry_file; entry_path.exists() or fail(f"Vite manifest src/main.ts points to a missing asset: {entry_path}"); print(f"verified Vite manifest: src/main.ts -> {entry_file}")'

package: verify-vite-artifacts verify-vite-manifest docs-publish make-migrations ## Build sdist and wheel only after frontend artifacts and Sphinx docs are valid
	cd "$(REPO_DIR)" && $(DEVENV_RUN) uv run --with build python -m build

package-check: ## Validate built sdist and wheel metadata
	cd "$(REPO_DIR)" && $(DEVENV_RUN) uv run --with twine python -m twine check dist/*

package-upload: package-check ## Upload built distributions with twine
	cd "$(REPO_DIR)" && $(DEVENV_RUN) uv run --with twine python -m twine upload dist/* --skip-existing --verbose

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
	@set -e; \
	LOG_FILE=$$(mktemp); \
	trap 'rm -f "$$LOG_FILE"' EXIT; \
	FRONTEND_NIX="$(FRONTEND_NIX)"; \
	restore_nix_hash() { \
		new_hash="$$1"; \
		if [ "$$new_hash" = "lib.fakeHash" ]; then \
			sed -i 's|^[[:space:]]*npmDepsHash[[:space:]]*=.*;|  npmDepsHash = lib.fakeHash;|' "$$FRONTEND_NIX"; \
		else \
			sed -i "s|^[[:space:]]*npmDepsHash[[:space:]]*=.*;|  npmDepsHash = \\\"$$new_hash\\\";|" "$$FRONTEND_NIX"; \
		fi; \
	}; \
	ORIG_HASH="$$(sed -n 's/^[[:space:]]*npmDepsHash[[:space:]]*= *lib.fakeHash;.*/lib.fakeHash/p' "$$FRONTEND_NIX" | head -n 1)"; \
	if [ -z "$$ORIG_HASH" ]; then \
		ORIG_HASH="$$(sed -n 's/^[[:space:]]*npmDepsHash[[:space:]]*= *\"\\([^\"]*\\)\";.*/\\1/p' "$$FRONTEND_NIX" | head -n 1)"; \
	fi; \
	USED_FAKE=0; \
	if [ "$$ORIG_HASH" != "lib.fakeHash" ]; then \
		restore_nix_hash "lib.fakeHash"; \
		USED_FAKE=1; \
	fi; \
	if cd "$(REPO_DIR)" && $(DEVENV_RUN) vue-build 2>&1 | tee "$$LOG_FILE"; then \
		echo "Frontend build succeeded with npmDepsHash already valid."; \
		if [ "$$USED_FAKE" = "1" ]; then \
			if [ -n "$$ORIG_HASH" ]; then restore_nix_hash "$$ORIG_HASH"; fi; \
		fi; \
	else \
		if grep -q "npmDepsHash is out of date" "$$LOG_FILE" && grep -q "got: sha256-" "$$LOG_FILE"; then \
			NEW_HASH="$$(grep -oE 'got: sha256-[A-Za-z0-9+/=]+' "$$LOG_FILE" | head -n 1 | cut -d' ' -f2)"; \
			restore_nix_hash "$$NEW_HASH"; \
			echo "Updated npmDepsHash in $$FRONTEND_NIX to $$NEW_HASH"; \
			if cd "$(REPO_DIR)" && $(DEVENV_RUN) vue-build; then \
				echo "Frontend build succeeded after updating npmDepsHash."; \
			else \
				echo "Frontend build still failing after npmDepsHash update."; \
				cat "$$LOG_FILE"; \
				if [ -n "$$ORIG_HASH" ]; then restore_nix_hash "$$ORIG_HASH"; fi; \
				exit 1; \
			fi; \
		else \
			if [ -n "$$ORIG_HASH" ]; then restore_nix_hash "$$ORIG_HASH"; fi; \
			echo "vue-build failed for a reason other than npmDepsHash mismatch."; \
			cat "$$LOG_FILE"; \
			exit 1; \
		fi; \
	fi
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

test-real: check-repo check-tools ## Run backend tests through devenv print-dev-env and the repo venv
	cd "$(REPO_DIR)" && ./scripts/run-backend-checks.sh

lint: check-repo check-tools ## Run frontend lint (best-effort if configured)
	cd "$(REPO_DIR)/frontend" && $(DEVENV_RUN) npm run lint
