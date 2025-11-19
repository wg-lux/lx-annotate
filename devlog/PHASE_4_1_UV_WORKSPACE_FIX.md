# Phase 4.1 - UV Workspace Fix for lx-anonymizer

**Date:** October 9, 2025  
**Priority:** CRITICAL  
**Status:** ⏳ PENDING  
**Effort:** 30 minutes  
**GitHub Issue:** [wg-lux/endoreg-db#265](https://github.com/wg-lux/endoreg-db/issues/265)

---

## 🎯 Problem Statement

UV workspace resolver fails with two critical errors:

1. **Error #1:** "Package `lx-anonymizer` is listed in `tool.uv.sources` but references a path in `tool.uv.sources`"
2. **Error #2:** "`libs/endoreg-db/lx-anonymizer` does not appear to be a Python project"

### Root Cause Analysis

```
Current State:
┌──────────────────────────────────────────────────────────────┐
│ libs/endoreg-db/pyproject.toml                               │
│   [tool.uv.sources]                                          │
│   lx-anonymizer = { path = "lx-anonymizer" }  ❌ PATH PIN    │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│ libs/endoreg-db/lx-anonymizer/                               │
│   ❌ NO pyproject.toml                                       │
│   ❌ NO src/lx_anonymizer/__init__.py                        │
│   → UV sees this as "not a Python package"                   │
└──────────────────────────────────────────────────────────────┘

Result: UV cannot resolve lx-anonymizer as workspace member
```

**Why This Matters:**
- Blocks `uv sync` in CI/CD pipelines
- Prevents local development setup
- Breaks dependency resolution for `endoreg-db` package
- Causes confusion between workspace members and external packages

---

## ✅ Solution: 4-Step Fix

### Step 1: Create Package Metadata

**File:** `libs/endoreg-db/lx-anonymizer/pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=69", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "lx-anonymizer"
version = "0.0.0"
description = "Workspace package for lx_anonymizer (monorepo member)"
authors = [{ name = "WG Lux" }]
requires-python = ">=3.11"
dependencies = []

[tool.setuptools]
package-dir = { "" = "src" }

[tool.setuptools.packages.find]
where = ["src"]
include = ["lx_anonymizer*"]
```

**Key Points:**
- **Distribution name:** `lx-anonymizer` (hyphen) - what you install with `pip install lx-anonymizer`
- **Import name:** `lx_anonymizer` (underscore) - what you use in `import lx_anonymizer`
- **Version:** `0.0.0` indicates placeholder/stub package
- **Dependencies:** Empty for now (can add later)

---

### Step 2: Create Importable Module

**File:** `libs/endoreg-db/lx-anonymizer/src/lx_anonymizer/__init__.py`

```python
"""
lx-anonymizer workspace package (monorepo member)

Note: Distribution name is 'lx-anonymizer' (hyphen)
      Import name is 'lx_anonymizer' (underscore)
      This matches Python packaging conventions (PEP 8).
"""
__all__ = []
__version__ = "0.0.0"
```

**Directory Structure Created:**
```
libs/endoreg-db/lx-anonymizer/
├── pyproject.toml           # NEW
└── src/                      # NEW
    └── lx_anonymizer/        # NEW (underscore!)
        └── __init__.py       # NEW
```

---

### Step 3: Update endoreg-db Dependency

**File:** `libs/endoreg-db/pyproject.toml`

**Before (WRONG):**
```toml
[tool.uv.sources]
lx-anonymizer = { path = "lx-anonymizer" }  # ❌ Path pin causes error
```

**After (CORRECT) - Choose ONE option:**

#### Option A: Simple String Form (Recommended)
```toml
[project]
dependencies = [
  # ... other deps
  "lx-anonymizer",  # ✅ Resolves as workspace member
]
```

#### Option B: UV Table Form
```toml
[tool.uv.dependencies]
lx-anonymizer = { workspace = true }  # ✅ Explicit workspace reference
```

#### Option C: Source Override (If Needed)
```toml
[tool.uv.sources]
lx-anonymizer = { workspace = true }  # ✅ Remove any path = "..."
```

**Action Required:**
1. ❌ **Remove** any `path = "..."` for `lx-anonymizer`
2. ✅ **Add** `{ workspace = true }` or use string form

---

### Step 4: Update Root Workspace Members

**File:** Root `pyproject.toml` (or `uv.toml` if separate)

**Before (MAY BE WRONG):**
```toml
[tool.uv.workspace]
members = [
  "libs/endoreg-db",
  "libs/lx-anonymizer",  # ❌ Old/stale path?
]
```

**After (CORRECT):**
```toml
[tool.uv.workspace]
members = [
  "libs/endoreg-db",
  "libs/endoreg-db/lx-anonymizer",  # ✅ Correct nested path
  # ... other members
]
```

**Action Required:**
1. ✅ Ensure `"libs/endoreg-db/lx-anonymizer"` is present
2. ❌ Remove any stale entries like `"libs/lx-anonymizer"`
3. ❌ Remove duplicate entries for same package

---

## 🧪 Verification Steps

### 1. Root Workspace Sync
```bash
cd /home/admin/dev/lx-annotate
uv sync

# Expected: No errors, lx-anonymizer resolved as workspace member
```

### 2. Build Stub Package
```bash
cd libs/endoreg-db/lx-anonymizer
python -m build

# Expected: dist/lx_anonymizer-0.0.0-py3-none-any.whl created
```

### 3. Test Import
```bash
python -c "import lx_anonymizer; print(lx_anonymizer.__version__)"

# Expected output: 0.0.0
```

### 4. Nested Workspace Sync
```bash
cd libs/endoreg-db
uv sync

# Expected: lx-anonymizer resolved from ../lx-anonymizer (workspace), not PyPI
```

### 5. Verbose Dependency Resolution (Debug)
```bash
cd /home/admin/dev/lx-annotate
uv sync -v

# Check output for:
# ✅ "Resolved lx-anonymizer @ workspace://libs/endoreg-db/lx-anonymizer"
# ❌ NOT "Resolved lx-anonymizer from PyPI"
```

---

## ✅ Acceptance Criteria

| Criteria | Check | Command |
|----------|-------|---------|
| No "path in tool.uv.sources" error | ✅ | `uv sync` |
| No "does not appear to be Python project" error | ✅ | `uv sync` |
| Root workspace sync succeeds | ✅ | `cd /home/admin/dev/lx-annotate && uv sync` |
| Package builds successfully | ✅ | `cd libs/endoreg-db/lx-anonymizer && python -m build` |
| Import works | ✅ | `python -c "import lx_anonymizer"` |
| Version accessible | ✅ | `python -c "print(lx_anonymizer.__version__)"` → `0.0.0` |
| Nested workspace sync succeeds | ✅ | `cd libs/endoreg-db && uv sync` |
| Workspace resolution (not PyPI) | ✅ | `uv sync -v` shows `workspace://` |

---

## 📝 Implementation Checklist

### Pre-Implementation
- [ ] Review current `pyproject.toml` files for conflicting `lx-anonymizer` references
- [ ] Backup existing UV lock files (`uv.lock`)
- [ ] Check for existing `lx-anonymizer` installations in virtual environments

### Implementation
- [ ] Create `libs/endoreg-db/lx-anonymizer/pyproject.toml`
- [ ] Create `libs/endoreg-db/lx-anonymizer/src/lx_anonymizer/__init__.py`
- [ ] Update `libs/endoreg-db/pyproject.toml` (remove path, add workspace reference)
- [ ] Update root `pyproject.toml` workspace members
- [ ] Remove stale/duplicate workspace member entries

### Verification
- [ ] Run `uv sync` at root (should succeed)
- [ ] Run `python -m build` in `libs/endoreg-db/lx-anonymizer` (should succeed)
- [ ] Test `import lx_anonymizer` (should work)
- [ ] Run `uv sync` in `libs/endoreg-db` (should succeed)
- [ ] Check `uv sync -v` output (should show workspace resolution)

### Post-Implementation
- [ ] Commit changes with descriptive message
- [ ] Update CI/CD pipeline if needed
- [ ] Document in ANONYMIZER.md (already done ✅)
- [ ] Close GitHub issue #265

---

## 🚨 Common Pitfalls

### 1. Hyphen vs Underscore Confusion
**Wrong:**
```python
import lx-anonymizer  # ❌ Syntax error (hyphen not allowed in import)
```

**Correct:**
```python
import lx_anonymizer  # ✅ Underscore is the import name
```

**Explanation:**
- **Distribution name** (PyPI, UV): `lx-anonymizer` (hyphen allowed)
- **Import name** (Python): `lx_anonymizer` (underscore required by PEP 8)

### 2. Path vs Workspace Reference
**Wrong:**
```toml
[tool.uv.sources]
lx-anonymizer = { path = "lx-anonymizer" }  # ❌ Mixing workspace and path
```

**Correct:**
```toml
[tool.uv.sources]
lx-anonymizer = { workspace = true }  # ✅ Workspace reference only
```

### 3. Missing src/ Directory
**Wrong:**
```
libs/endoreg-db/lx-anonymizer/
└── lx_anonymizer/       # ❌ Missing src/ parent
    └── __init__.py
```

**Correct:**
```
libs/endoreg-db/lx-anonymizer/
└── src/                 # ✅ src-layout (recommended)
    └── lx_anonymizer/
        └── __init__.py
```

### 4. Stale Workspace Members
**Wrong:**
```toml
[tool.uv.workspace]
members = [
  "libs/lx-anonymizer",            # ❌ Old path
  "libs/endoreg-db/lx-anonymizer", # ✅ New path
]
# UV gets confused by two paths for same package
```

**Correct:**
```toml
[tool.uv.workspace]
members = [
  "libs/endoreg-db/lx-anonymizer",  # ✅ Only the correct path
]
```

---

## 📦 Package Structure After Fix

```
/home/admin/dev/lx-annotate/
├── pyproject.toml                           # Root workspace config
│   └── [tool.uv.workspace]
│       └── members = ["libs/endoreg-db", "libs/endoreg-db/lx-anonymizer"]
│
└── libs/
    └── endoreg-db/
        ├── pyproject.toml                   # endoreg-db package
        │   └── [project]
        │       └── dependencies = ["lx-anonymizer"]  # ✅ Workspace ref
        │
        └── lx-anonymizer/                   # NEW: Workspace member
            ├── pyproject.toml               # ✅ Package metadata
            └── src/
                └── lx_anonymizer/           # ✅ Importable module
                    └── __init__.py
```

---

## 🔧 Troubleshooting

### Error: "Package not found in workspace"
**Cause:** Workspace members list doesn't include `libs/endoreg-db/lx-anonymizer`

**Fix:**
```toml
# Root pyproject.toml
[tool.uv.workspace]
members = [
  "libs/endoreg-db",
  "libs/endoreg-db/lx-anonymizer",  # Add this
]
```

### Error: "No module named 'lx_anonymizer'"
**Cause:** Missing `src/lx_anonymizer/__init__.py`

**Fix:**
```bash
mkdir -p libs/endoreg-db/lx-anonymizer/src/lx_anonymizer
echo '__all__ = []; __version__ = "0.0.0"' > libs/endoreg-db/lx-anonymizer/src/lx_anonymizer/__init__.py
```

### Error: "build backend 'setuptools.build_meta' is unavailable"
**Cause:** Missing `pyproject.toml` or invalid build-system section

**Fix:**
```toml
# Ensure this is in libs/endoreg-db/lx-anonymizer/pyproject.toml
[build-system]
requires = ["setuptools>=69", "wheel"]
build-backend = "setuptools.build_meta"
```

---

## 📚 References

- **PEP 621:** Python Project Metadata (`pyproject.toml` standard)
- **PEP 8:** Style Guide (hyphen in distribution, underscore in import)
- **UV Workspace Docs:** https://github.com/astral-sh/uv/blob/main/docs/workspaces.md
- **Setuptools src-layout:** https://setuptools.pypa.io/en/latest/userguide/package_discovery.html#src-layout
- **GitHub Issue:** https://github.com/wg-lux/endoreg-db/issues/265

---

## 🎯 Success Metrics

After implementing this fix:

1. ✅ `uv sync` runs without errors
2. ✅ CI/CD pipelines pass
3. ✅ Local development setup works for new developers
4. ✅ Package can be built with `python -m build`
5. ✅ No confusion between workspace and external packages
6. ✅ Future-proof for adding actual lx-anonymizer code

---

## 🚀 Next Steps After Completion

1. **Commit changes:**
   ```bash
   git add libs/endoreg-db/lx-anonymizer/pyproject.toml
   git add libs/endoreg-db/lx-anonymizer/src/lx_anonymizer/__init__.py
   git add libs/endoreg-db/pyproject.toml
   git add pyproject.toml  # If root was modified
   git commit -m "fix: Add minimal packaging for lx-anonymizer workspace member (#265)"
   ```

2. **Create PR** (use template from ANONYMIZER.md)

3. **Verify CI/CD** passes

4. **Close GitHub Issue #265**

5. **Consider future enhancements:**
   - Add actual lx-anonymizer code to `src/lx_anonymizer/`
   - Add dependencies to `pyproject.toml` as needed
   - Add tests to `tests/` directory
   - Update version from `0.0.0` to `0.1.0` when ready

---

**Status:** ⏳ Ready for implementation  
**Estimated Time:** 30 minutes  
**Risk Level:** 🟢 Low (minimal package with no runtime impact)
