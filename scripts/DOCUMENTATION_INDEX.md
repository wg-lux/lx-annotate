# Scripts Documentation Index 📖

Welcome to the comprehensive scripts documentation for the Lx Annotate project. This index guides you to the right documentation for your needs.

## 📚 Documentation Structure

### 🏠 **Main Documentation**
- **[`README.md`](./README.md)** - **PRIMARY DOCUMENTATION** ⭐⭐⭐
  - Complete overview of all scripts and categories
  - DevEnv integration details
  - Usage examples and workflows
  - Development guidelines and best practices

### 🔍 **Detailed References**
- **[`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md)** - **COMPREHENSIVE REFERENCE** ⭐⭐⭐
  - Detailed documentation for every script
  - Command-line interface specifications
  - Configuration options and environment variables
  - Integration patterns and examples

### 📁 **Service-Specific Documentation**
- **[`README_FileWatcher.md`](./README_FileWatcher.md)** - **FILE WATCHER SERVICE** ⭐⭐
  - Complete file monitoring service documentation
  - Service management and troubleshooting
  - Processing workflows and configuration

### 🚀 **Specialized Guides**
- **[`cuda/README.md`](./cuda/README.md)** - **CUDA DIAGNOSTICS** ⭐⭐
  - Comprehensive CUDA troubleshooting suite
  - GPU diagnostic workflows
  - Performance optimization guides

### 📋 **Project Documentation**  
- **[`ANALYSIS_AND_CLEANUP_PLAN.md`](./ANALYSIS_AND_CLEANUP_PLAN.md)** - **CLEANUP DOCUMENTATION**
  - Scripts organization and cleanup history
  - Migration notes and architectural decisions
  - Consolidation achievements and results

## 🎯 Quick Navigation by Use Case

### **First Time Setup**
1. Read: [`README.md`](./README.md) - Overview and structure
2. Follow: Setup workflow in main README
3. Reference: [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) for detailed `core/setup.py` usage

### **Daily Development**
1. Primary: [`README.md`](./README.md) - Development workflows section
2. Service: [`README_FileWatcher.md`](./README_FileWatcher.md) - File monitoring
3. Reference: [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) for specific script options

### **System Troubleshooting**
1. Diagnostics: [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) - `core/system-validation.sh`
2. GPU Issues: [`cuda/README.md`](./cuda/README.md) - CUDA diagnostic suite
3. File Processing: [`README_FileWatcher.md`](./README_FileWatcher.md) - Service diagnostics

### **Production Deployment**
1. Overview: [`README.md`](./README.md) - Production deployment section
2. Services: [`README_FileWatcher.md`](./README_FileWatcher.md) - Service management
3. Validation: [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) - System validation

### **DevEnv Integration**
1. Primary: [`README.md`](./README.md) - DevEnv integration section
2. Reference: [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) - Integration patterns
3. History: [`ANALYSIS_AND_CLEANUP_PLAN.md`](./ANALYSIS_AND_CLEANUP_PLAN.md) - Migration details

## 🔧 Script Categories Quick Reference

| Category | Primary Doc | Key Scripts | Use Case |
|----------|-------------|-------------|----------|
| **Core** | [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md#core-scripts) | `environment.py`, `setup.py`, `system-validation.sh` | Environment management |
| **Database** | [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md#database-scripts) | `fetch_db_pwd_file.py`, `ensure_psql.py` | Database setup |
| **File Processing** | [`README_FileWatcher.md`](./README_FileWatcher.md) | `file_watcher.py`, `start_filewatcher.sh` | Media processing |
| **CUDA/GPU** | [`cuda/README.md`](./cuda/README.md) | `gpu-check.py`, CUDA diagnostic suite | Hardware diagnostics |
| **Utilities** | [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md#utility-scripts) | Various utility scripts | Maintenance tasks |

## 📖 Reading Order by Experience Level

### **New to Project**
1. [`README.md`](./README.md) - Start here for complete overview
2. [`README_FileWatcher.md`](./README_FileWatcher.md) - Core service understanding
3. [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) - Deep dive when needed

### **Experienced Developer**
1. [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) - Direct reference for specific needs
2. [`README.md`](./README.md) - Integration patterns and workflows
3. [`cuda/README.md`](./cuda/README.md) - GPU-specific troubleshooting

### **System Administrator**
1. [`README.md`](./README.md) - Production deployment section
2. [`README_FileWatcher.md`](./README_FileWatcher.md) - Service management
3. [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) - System validation tools

### **DevOps Engineer**
1. [`README.md`](./README.md) - DevEnv integration patterns
2. [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) - CI/CD integration examples
3. [`ANALYSIS_AND_CLEANUP_PLAN.md`](./ANALYSIS_AND_CLEANUP_PLAN.md) - Architecture decisions

## 🚀 Common Workflows Documentation

### **Environment Setup Workflow**
```
📖 README.md (Environment Management) 
→ 📖 SCRIPT_REFERENCE.md (core/setup.py details)
→ 📖 SCRIPT_REFERENCE.md (core/environment.py options)
```

### **File Processing Workflow**
```
📖 README_FileWatcher.md (Service overview)
→ 📖 SCRIPT_REFERENCE.md (file_watcher.py details)
→ 📖 README_FileWatcher.md (Troubleshooting)
```

### **GPU/CUDA Workflow**
```
📖 README.md (GPU checking quick start)
→ 📖 cuda/README.md (CUDA diagnostic workflow)
→ 📖 SCRIPT_REFERENCE.md (utilities/gpu-check.py details)
```

### **System Validation Workflow**
```
📖 README.md (System validation overview)
→ 📖 SCRIPT_REFERENCE.md (core/system-validation.sh details)
→ 📖 README_FileWatcher.md (Service validation)
```

## 💡 Tips for Effective Documentation Use

### **Search Strategy**
1. **Start broad**: Use [`README.md`](./README.md) for overview and context
2. **Go specific**: Use [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md) for detailed parameters
3. **Follow workflows**: Use service-specific docs for complete procedures

### **Quick Help**
```bash
# Most scripts support --help
python scripts/core/environment.py --help
bash scripts/core/system-validation.sh --help

# Check main documentation
cat scripts/README.md | grep "your-topic"
```

### **Integration Examples**
- **DevEnv**: Look for `devenv/scripts.nix` patterns in main README
- **CI/CD**: Check integration examples in SCRIPT_REFERENCE.md  
- **Production**: Follow deployment workflows in main README

## 📝 Documentation Maintenance

This documentation is actively maintained and reflects the current state of the scripts organization:

### **Last Updated**: October 30, 2025
### **Coverage**: 100% of active scripts documented
### **Organization**: Professional categorized structure
### **Integration**: Full DevEnv and CI/CD integration documented

### **Contributing to Documentation**
1. **Update relevant doc** when adding/modifying scripts
2. **Follow patterns** established in existing documentation
3. **Include examples** for complex workflows
4. **Update this index** when adding new documentation files

---

## 🎯 Start Here

**New to the project?** → [`README.md`](./README.md)  
**Need specific script details?** → [`SCRIPT_REFERENCE.md`](./SCRIPT_REFERENCE.md)  
**Working with file processing?** → [`README_FileWatcher.md`](./README_FileWatcher.md)  
**GPU/CUDA issues?** → [`cuda/README.md`](./cuda/README.md)

---

*This documentation index provides comprehensive guidance for all scripts in the Lx Annotate project. The documentation represents professional-grade tooling with complete coverage of functionality, integration patterns, and operational procedures.*