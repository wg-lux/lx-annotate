#!/usr/bin/env python3
"""
Repository cleanup and consistency checker for lx-annotate project.
This script identifies and helps resolve inconsistencies in the repository structure.
"""

import os
import sys
from pathlib import Path
import logging
import subprocess
import shutil
from typing import List, Dict, Tuple, Set
import re
import json

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class RepositoryCleanup:
    """Repository cleanup and consistency checker"""
    
    def __init__(self, repo_root: Path):
        self.repo_root = Path(repo_root)
        self.issues = []
        self.fixes_applied = []
        
    def log_issue(self, category: str, description: str, path: Path = None, severity: str = "WARN"):
        """Log an issue found in the repository"""
        issue = {
            'category': category,
            'description': description,
            'path': str(path) if path else None,
            'severity': severity
        }
        self.issues.append(issue)
        logger.log(
            logging.ERROR if severity == "ERROR" else logging.WARNING,
            f"[{category}] {description}" + (f" in {path}" if path else "")
        )
    
    def log_fix(self, description: str):
        """Log a fix that was applied"""
        self.fixes_applied.append(description)
        logger.info(f"FIXED: {description}")
    
    def check_duplicate_imports(self):
        """Check for duplicate or inconsistent imports"""
        logger.info("Checking for duplicate imports...")
        
        python_files = list(self.repo_root.rglob("*.py"))
        
        for py_file in python_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find all import statements
                import_lines = []
                for line_no, line in enumerate(content.split('\n'), 1):
                    line = line.strip()
                    if line.startswith(('import ', 'from ')) and not line.startswith('#'):
                        import_lines.append((line_no, line))
                
                # Check for duplicates
                seen_imports = set()
                for line_no, import_line in import_lines:
                    if import_line in seen_imports:
                        self.log_issue(
                            "DUPLICATE_IMPORT",
                            f"Duplicate import found at line {line_no}: {import_line}",
                            py_file
                        )
                    seen_imports.add(import_line)
                
            except Exception as e:
                self.log_issue(
                    "FILE_READ_ERROR",
                    f"Could not read file: {e}",
                    py_file,
                    "ERROR"
                )
    
    def check_outdated_phi4_references(self):
        """Check for outdated Phi-4 references that should be replaced with Ollama"""
        logger.info("Checking for outdated Phi-4 references...")
        
        phi4_patterns = [
            r'phi[_-]?4',
            r'llm_phi4',
            r'initialize_phi4',
            r'analyze.*phi4',
            r'cleanup_model',
            r'model_init_result'
        ]
        
        text_files = list(self.repo_root.rglob("*.py")) + list(self.repo_root.rglob("*.md"))
        
        for file_path in text_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                for pattern in phi4_patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        line_no = content[:match.start()].count('\n') + 1
                        self.log_issue(
                            "OUTDATED_PHI4_REFERENCE",
                            f"Outdated Phi-4 reference found at line {line_no}: {match.group()}",
                            file_path
                        )
                        
            except Exception as e:
                self.log_issue(
                    "FILE_READ_ERROR",
                    f"Could not read file: {e}",
                    file_path,
                    "ERROR"
                )
    
    def check_missing_dependencies(self):
        """Check for missing dependencies in requirements files"""
        logger.info("Checking for missing dependencies...")
        
        # Find all requirements files
        req_files = list(self.repo_root.rglob("requirements*.txt")) + \
                   list(self.repo_root.rglob("pyproject.toml"))
        
        # Essential dependencies for Ollama integration
        required_deps = {
            'ollama': 'ollama',
            'pytesseract': 'pytesseract', 
            'pillow': 'Pillow',
            'numpy': 'numpy'
        }
        
        for req_file in req_files:
            try:
                with open(req_file, 'r', encoding='utf-8') as f:
                    content = f.read().lower()
                
                for dep_name, package_name in required_deps.items():
                    if dep_name not in content:
                        self.log_issue(
                            "MISSING_DEPENDENCY",
                            f"Missing dependency '{package_name}' in requirements",
                            req_file
                        )
                        
            except Exception as e:
                self.log_issue(
                    "FILE_READ_ERROR",
                    f"Could not read requirements file: {e}",
                    req_file,
                    "ERROR"
                )
    
    def check_test_structure_consistency(self):
        """Check test structure consistency"""
        logger.info("Checking test structure consistency...")
        
        # Find test directories
        test_dirs = []
        for path in self.repo_root.rglob("test*"):
            if path.is_dir():
                test_dirs.append(path)
        
        # Check for test files without proper structure
        for test_dir in test_dirs:
            python_files = list(test_dir.rglob("*.py"))
            
            for py_file in python_files:
                if 'test_' not in py_file.name and py_file.name != '__init__.py':
                    self.log_issue(
                        "TEST_NAMING",
                        f"Test file doesn't follow naming convention (test_*.py): {py_file.name}",
                        py_file
                    )
                
                # Check if test files have proper imports
                try:
                    with open(py_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if 'unittest' not in content and 'pytest' not in content and '__init__' not in py_file.name:
                        self.log_issue(
                            "TEST_FRAMEWORK",
                            f"Test file missing test framework import",
                            py_file
                        )
                        
                except Exception as e:
                    continue
    
    def check_unused_files(self):
        """Check for potentially unused files"""
        logger.info("Checking for unused files...")
        
        # Common patterns for potentially unused files
        unused_patterns = [
            "*.bak",
            "*.tmp",
            "*~",
            "*.orig",
            "*.swp",
            ".DS_Store",
            "Thumbs.db"
        ]
        
        for pattern in unused_patterns:
            for file_path in self.repo_root.rglob(pattern):
                self.log_issue(
                    "UNUSED_FILE",
                    f"Potentially unused file: {file_path.name}",
                    file_path
                )
    
    def check_documentation_consistency(self):
        """Check documentation consistency"""
        logger.info("Checking documentation consistency...")
        
        # Find README files
        readme_files = list(self.repo_root.rglob("README.md")) + \
                      list(self.repo_root.rglob("readme.md"))
        
        for readme in readme_files:
            try:
                with open(readme, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for outdated references
                if 'phi-4' in content.lower() or 'phi4' in content.lower():
                    self.log_issue(
                        "OUTDATED_DOCUMENTATION",
                        "README contains outdated Phi-4 references",
                        readme
                    )
                
                # Check for broken internal links
                links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
                for link_text, link_url in links:
                    if not link_url.startswith('http') and not link_url.startswith('#'):
                        # Check if local file exists
                        link_path = readme.parent / link_url
                        if not link_path.exists():
                            self.log_issue(
                                "BROKEN_LINK",
                                f"Broken link to '{link_url}' in documentation",
                                readme
                            )
                            
            except Exception as e:
                self.log_issue(
                    "FILE_READ_ERROR",
                    f"Could not read README: {e}",
                    readme,
                    "ERROR"
                )
    
    def fix_missing_ollama_dependency(self):
        """Fix missing Ollama dependency in requirements files"""
        logger.info("Fixing missing Ollama dependency...")
        
        req_files = list(self.repo_root.rglob("requirements*.txt"))
        
        for req_file in req_files:
            try:
                with open(req_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'ollama' not in content.lower():
                    # Add ollama dependency
                    with open(req_file, 'a', encoding='utf-8') as f:
                        f.write('\n# Ollama LLM integration\nollama>=0.1.0\n')
                    
                    self.log_fix(f"Added Ollama dependency to {req_file}")
                    
            except Exception as e:
                logger.error(f"Could not fix requirements file {req_file}: {e}")
    
    def fix_test_structure(self):
        """Fix test structure issues"""
        logger.info("Fixing test structure...")
        
        # Create missing __init__.py files in test directories
        test_dirs = []
        for path in self.repo_root.rglob("test*"):
            if path.is_dir():
                test_dirs.append(path)
        
        for test_dir in test_dirs:
            init_file = test_dir / "__init__.py"
            if not init_file.exists():
                init_file.touch()
                self.log_fix(f"Created missing __init__.py in {test_dir}")
    
    def clean_unused_files(self, confirm: bool = False):
        """Clean unused files"""
        logger.info("Cleaning unused files...")
        
        unused_patterns = [
            "*.bak",
            "*.tmp", 
            "*~",
            "*.orig",
            "*.swp",
            ".DS_Store",
            "Thumbs.db"
        ]
        
        files_to_remove = []
        for pattern in unused_patterns:
            files_to_remove.extend(self.repo_root.rglob(pattern))
        
        if files_to_remove:
            if confirm:
                for file_path in files_to_remove:
                    try:
                        file_path.unlink()
                        self.log_fix(f"Removed unused file: {file_path}")
                    except Exception as e:
                        logger.error(f"Could not remove {file_path}: {e}")
            else:
                logger.info(f"Found {len(files_to_remove)} unused files. Use --fix to remove them.")
    
    def generate_report(self) -> Dict:
        """Generate a comprehensive report"""
        report = {
            'repository_root': str(self.repo_root),
            'total_issues': len(self.issues),
            'total_fixes_applied': len(self.fixes_applied),
            'issues_by_category': {},
            'issues': self.issues,
            'fixes_applied': self.fixes_applied
        }
        
        # Group issues by category
        for issue in self.issues:
            category = issue['category']
            if category not in report['issues_by_category']:
                report['issues_by_category'][category] = 0
            report['issues_by_category'][category] += 1
        
        return report
    
    def run_full_check(self, apply_fixes: bool = False):
        """Run all consistency checks"""
        logger.info("Starting repository consistency check...")
        
        # Run all checks
        self.check_duplicate_imports()
        self.check_outdated_phi4_references()
        self.check_missing_dependencies()
        self.check_test_structure_consistency()
        self.check_unused_files()
        self.check_documentation_consistency()
        
        # Apply fixes if requested
        if apply_fixes:
            logger.info("Applying automatic fixes...")
            self.fix_missing_ollama_dependency()
            self.fix_test_structure()
            self.clean_unused_files(confirm=True)
        
        # Generate and return report
        return self.generate_report()


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Repository cleanup and consistency checker")
    parser.add_argument("--repo-root", type=Path, default=".", 
                       help="Repository root directory (default: current directory)")
    parser.add_argument("--fix", action="store_true",
                       help="Apply automatic fixes where possible")
    parser.add_argument("--output", type=Path,
                       help="Output report to JSON file")
    parser.add_argument("--verbose", action="store_true",
                       help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize cleanup
    cleanup = RepositoryCleanup(args.repo_root)
    
    # Run checks
    report = cleanup.run_full_check(apply_fixes=args.fix)
    
    # Print summary
    print("\n" + "="*50)
    print("REPOSITORY CLEANUP SUMMARY")
    print("="*50)
    print(f"Repository: {report['repository_root']}")
    print(f"Total issues found: {report['total_issues']}")
    print(f"Total fixes applied: {report['total_fixes_applied']}")
    
    if report['issues_by_category']:
        print("\nIssues by category:")
        for category, count in report['issues_by_category'].items():
            print(f"  {category}: {count}")
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"\nDetailed report saved to: {args.output}")
    
    # Exit with appropriate code
    exit_code = 0 if report['total_issues'] == 0 else 1
    if args.fix and report['total_fixes_applied'] > 0:
        exit_code = 0  # Fixes were applied
    
    return exit_code


if __name__ == "__main__":
    exit(main())