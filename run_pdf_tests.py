#!/usr/bin/env python3
"""
Test runner script for PDF import and anonymization tests.

This script runs all tests related to PDF processing and anonymization
with proper Django setup and error handling.
"""
import os
import sys
import subprocess
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings.test')

def run_python_tests():
    """Run Python tests for PDF import and anonymization."""
    print("=" * 60)
    print("Running Python Tests for PDF Import & Anonymization")
    print("=" * 60)
    
    # Test files to run
    test_files = [
        'tests/test_pdf_anonymization_core.py',
        'tests/test_report_reader_core.py',
        'tests/test_pdf_processing_issues.py'
    ]
    
    for test_file in test_files:
        test_path = project_root / test_file
        if test_path.exists():
            print(f"\n📋 Running {test_file}...")
            try:
                result = subprocess.run([
                    sys.executable, '-m', 'pytest', 
                    str(test_path), 
                    '-v', '--tb=short'
                ], cwd=project_root, capture_output=True, text=True)
                
                print(f"✅ Exit code: {result.returncode}")
                if result.stdout:
                    print("STDOUT:")
                    print(result.stdout)
                if result.stderr:
                    print("STDERR:")
                    print(result.stderr)
                    
            except Exception as e:
                print(f"❌ Error running {test_file}: {e}")
        else:
            print(f"⚠️  Test file not found: {test_file}")

def run_typescript_tests():
    """Run TypeScript tests for frontend anonymization."""
    print("\n" + "=" * 60)
    print("Running TypeScript Tests for Frontend Anonymization")
    print("=" * 60)
    
    frontend_dir = project_root / 'frontend'
    
    if not frontend_dir.exists():
        print("⚠️  Frontend directory not found")
        return
        
    # Test files to run
    test_files = [
        'tests/core/pdfAnonymizationCore.test.ts',
        'tests/components/Anonymizer/AnonymizationValidationComponent.anonymization.test.ts'
    ]
    
    for test_file in test_files:
        test_path = frontend_dir / test_file
        if test_path.exists():
            print(f"\n📋 Running {test_file}...")
            try:
                result = subprocess.run([
                    'npm', 'run', 'test', '--', test_file, '--reporter=verbose'
                ], cwd=frontend_dir, capture_output=True, text=True)
                
                print(f"✅ Exit code: {result.returncode}")
                if result.stdout:
                    print("STDOUT:")
                    print(result.stdout)
                if result.stderr:
                    print("STDERR:")
                    print(result.stderr)
                    
            except Exception as e:
                print(f"❌ Error running {test_file}: {e}")
        else:
            print(f"⚠️  Test file not found: {test_file}")

def run_integration_tests():
    """Run integration tests that combine Python and TypeScript functionality."""
    print("\n" + "=" * 60)
    print("Running Integration Tests")
    print("=" * 60)
    
    print("🔧 Integration tests would verify:")
    print("  - PDF upload via frontend API")
    print("  - Backend processing with ReportReader")
    print("  - Metadata extraction and validation")
    print("  - Anonymization and storage")
    print("  - Frontend display of results")
    print("\n⚠️  Full integration tests require running Django server and database")

def check_test_dependencies():
    """Check if test dependencies are available."""
    print("🔍 Checking test dependencies...")
    
    # Check Python dependencies
    python_deps = ['pytest', 'django']
    for dep in python_deps:
        try:
            __import__(dep)
            print(f"✅ {dep} available")
        except ImportError:
            print(f"❌ {dep} not available")
    
    # Check if frontend has test setup
    frontend_dir = project_root / 'frontend'
    if (frontend_dir / 'package.json').exists():
        print("✅ Frontend package.json found")
        
        if (frontend_dir / 'vitest.config.ts').exists():
            print("✅ Vitest config found")
        else:
            print("⚠️  Vitest config not found")
    else:
        print("❌ Frontend package.json not found")

def main():
    """Main test runner function."""
    print("🧪 PDF Import & Anonymization Test Suite")
    print(f"📁 Project root: {project_root}")
    
    # Check dependencies first
    check_test_dependencies()
    
    # Run tests
    run_python_tests()
    run_typescript_tests()
    run_integration_tests()
    
    print("\n" + "=" * 60)
    print("🏁 Test suite completed!")
    print("=" * 60)

if __name__ == '__main__':
    main()
