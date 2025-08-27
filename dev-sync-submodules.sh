#!/usr/bin/env bash
set -euo pipefail

# Behavior controls
: "${SUBMODULE_FORCE:=0}"      # 1 = reset even with dirty worktrees
: "${SUBMODULE_DEFAULT_BRANCH:=main}"  # fallback if no branch configured

fail=0

# Enumerate submodules from .gitmodules for name/path pairs
while IFS= read -r line; do
  name="${line%%.path*}"
  name="${name#submodule.\"}"
  name="${name%\"}"
  path="$(git config --file .gitmodules "submodule.\"$name\".path")"

  # Skip if missing
  [[ -d "$path/.git" ]] || { echo "⚠️  Skipping $name (not initialized at $path)"; continue; }

  # Branch to follow: prefer local config, then .gitmodules, then default
  branch="$(git config "submodule.$name.branch" \
        || git config --file .gitmodules "submodule.$name.branch" \
        || echo "$SUBMODULE_DEFAULT_BRANCH")"

  echo "🔄 $name @ $path -> origin/$branch"

  # Safety: skip dirty submodule unless forced
  if [[ "$SUBMODULE_FORCE" != "1" ]] && ! git -C "$path" diff --quiet; then
    echo "   ⚠️  Dirty worktree in $path — skipping (set SUBMODULE_FORCE=1 to override)"
    fail=1
    continue
  fi

  # Fetch and fast-forward to remote branch tip
  git -C "$path" fetch --prune --quiet origin || { echo "   ❌ fetch failed"; fail=1; continue; }

  if ! git -C "$path" rev-parse --verify --quiet "origin/$branch" >/dev/null; then
    echo "   ❌ origin/$branch not found in $name"
    fail=1
    continue
  fi

  # Create or switch to local branch tracking origin/$branch
  if git -C "$path" rev-parse --verify --quiet "$branch" >/dev/null; then
    git -C "$path" switch --quiet "$branch"
  else
    git -C "$path" switch --quiet --create "$branch" --track "origin/$branch"
  fi

  # Fast-forward (or hard reset if forced)
  if [[ "$SUBMODULE_FORCE" == "1" ]]; then
    git -C "$path" reset --hard "origin/$branch"
  else
    # Try fast-forward; if not possible, advise user
    if ! git -C "$path" merge --ff-only "origin/$branch" >/dev/null 2>&1; then
      echo "   ⚠️  Non-FF update needed in $path — resolve manually or set SUBMODULE_FORCE=1"
      fail=1
    fi
  fi

  # Optional: prune stale remote branches locally
  git -C "$path" remote prune origin >/dev/null 2>&1 || true
done < <(git config --file .gitmodules --name-only --get-regexp '^submodule\..*\.path$')

exit "$fail"
