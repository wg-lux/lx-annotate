#!/usr/bin/env python3
"""
Comprehensive test runner for Ollama LLM integration in lx-annotate project.
Runs all tests and provides detailed reporting.
"""

import sys
import os
import subprocess
import time
from pathlib import Path
import json
import argparse
from typing import Dict, List, Tuple

# Add project paths
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "endoreg-db"))
sys.path.insert(0, str(project_root / "endoreg-db" / "lx-anonymizer"))

def run_command(cmd: List[str], cwd: Path = None, timeout: int = 300) -> Tuple[int, str, str]:
    """Run a command and return exit code, stdout, stderr"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"Command timed out after {timeout} seconds"
    except Exception as e:
        return -1, "", str(e)

def check_ollama_availability() -> bool:
    """Check if Ollama is available"""
    print("🔍 Checking Ollama availability...")
    
    # Check if ollama command is available
    exit_code, stdout, stderr = run_command(["which", "ollama"])
    if exit_code != 0:
        print("❌ Ollama command not found in PATH")
        return False
    
    # Check if Ollama service is running
    exit_code, stdout, stderr = run_command(["ollama", "list"])
    if exit_code != 0:
        print("❌ Ollama service not running or not accessible")
        print(f"   Error: {stderr}")
        return False
    
    print("✅ Ollama is available and running")
    return True

def check_dependencies() -> Dict[str, bool]:
    """Check if required dependencies are installed"""
    print("🔍 Checking Python dependencies...")
    
    dependencies = {
        'ollama': False,
        'PIL': False,
        'pytesseract': False,
        'numpy': False,
        'unittest': False,
        'pytest': False
    }
    
    for dep in dependencies:
        try:
            if dep == 'PIL':
                import PIL
            elif dep == 'unittest':
                import unittest
            elif dep == 'pytest':
                import pytest
            else:
                __import__(dep)
            dependencies[dep] = True
            print(f"✅ {dep}")
        except ImportError:
            print(f"❌ {dep} not available")
            dependencies[dep] = False
    
    return dependencies

def run_ollama_integration_tests() -> Dict:
    """Run Ollama integration tests"""
    print("\n🧪 Running Ollama integration tests...")
    
    test_file = project_root / "endoreg-db" / "lx-anonymizer" / "tests" / "test_ollama_integration.py"
    
    if not test_file.exists():
        return {
            'status': 'error',
            'message': f"Test file not found: {test_file}",
            'tests_run': 0,
            'failures': 0,
            'errors': 0
        }
    
    # Run the test
    exit_code, stdout, stderr = run_command([
        sys.executable, str(test_file)
    ], cwd=test_file.parent)
    
    # Parse output
    result = {
        'status': 'success' if exit_code == 0 else 'failed',
        'exit_code': exit_code,
        'stdout': stdout,
        'stderr': stderr,
        'tests_run': 0,
        'failures': 0,
        'errors': 0
    }
    
    # Try to extract test statistics from output
    for line in stdout.split('\n'):
        if 'Tests run:' in line:
            try:
                parts = line.split()
                for i, part in enumerate(parts):
                    if part == 'run:':
                        result['tests_run'] = int(parts[i+1])
                    elif part == 'Failures:':
                        result['failures'] = int(parts[i+1])
                    elif part == 'Errors:':
                        result['errors'] = int(parts[i+1])
            except (ValueError, IndexError):
                pass
    
    return result

def run_main_integration_tests() -> Dict:
    """Run main.py integration tests"""
    print("\n🧪 Running main.py integration tests...")
    
    test_file = project_root / "endoreg-db" / "lx-anonymizer" / "tests" / "test_main_integration.py"
    
    if not test_file.exists():
        return {
            'status': 'error',
            'message': f"Test file not found: {test_file}",
            'tests_run': 0,
            'failures': 0,
            'errors': 0
        }
    
    # Run the test
    exit_code, stdout, stderr = run_command([
        sys.executable, str(test_file)
    ], cwd=test_file.parent)
    
    # Parse output
    result = {
        'status': 'success' if exit_code == 0 else 'failed',
        'exit_code': exit_code,
        'stdout': stdout,
        'stderr': stderr,
        'tests_run': 0,
        'failures': 0,
        'errors': 0
    }
    
    # Try to extract test statistics from output
    for line in stdout.split('\n'):
        if 'Tests run:' in line:
            try:
                parts = line.split()
                for i, part in enumerate(parts):
                    if part == 'run:':
                        result['tests_run'] = int(parts[i+1])
                    elif part == 'Failures:':
                        result['failures'] = int(parts[i+1])
                    elif part == 'Errors:':
                        result['errors'] = int(parts[i+1])
            except (ValueError, IndexError):
                pass
    
    return result

def run_existing_tests() -> Dict:
    """Run existing test suite"""
    print("\n🧪 Running existing test suite...")
    
    # Find runtests.py
    runtests_script = project_root / "endoreg-db" / "runtests.py"
    
    if not runtests_script.exists():
        return {
            'status': 'error',
            'message': f"runtests.py not found: {runtests_script}",
            'tests_run': 0,
            'failures': 0,
            'errors': 0
        }
    
    # Run a subset of tests (to avoid long execution time)
    exit_code, stdout, stderr = run_command([
        sys.executable, str(runtests_script), "administration"
    ], cwd=runtests_script.parent, timeout=120)
    
    result = {
        'status': 'success' if exit_code == 0 else 'failed',
        'exit_code': exit_code,
        'stdout': stdout,
        'stderr': stderr,
        'tests_run': 0,
        'failures': 0,
        'errors': 0
    }
    
    return result

def run_repository_cleanup(fix: bool = False) -> Dict:
    """Run repository cleanup check"""
    print(f"\n🧹 Running repository cleanup {'with fixes' if fix else 'check only'}...")
    
    cleanup_script = project_root / "scripts" / "cleanup_repository.py"
    
    if not cleanup_script.exists():
        return {
            'status': 'error',
            'message': f"Cleanup script not found: {cleanup_script}"
        }
    
    cmd = [sys.executable, str(cleanup_script), "--repo-root", str(project_root)]
    if fix:
        cmd.append("--fix")
    
    exit_code, stdout, stderr = run_command(cmd, timeout=60)
    
    result = {
        'status': 'success' if exit_code == 0 else 'failed',
        'exit_code': exit_code,
        'stdout': stdout,
        'stderr': stderr
    }
    
    return result

def create_test_report(results: Dict) -> Dict:
    """Create comprehensive test report"""
    total_tests = 0
    total_failures = 0
    total_errors = 0
    
    for test_name, test_result in results.items():
        if isinstance(test_result, dict) and 'tests_run' in test_result:
            total_tests += test_result.get('tests_run', 0)
            total_failures += test_result.get('failures', 0)
            total_errors += test_result.get('errors', 0)
    
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'summary': {
            'total_tests': total_tests,
            'total_failures': total_failures,
            'total_errors': total_errors,
            'success_rate': (total_tests - total_failures - total_errors) / total_tests if total_tests > 0 else 0
        },
        'results': results
    }
    
    return report

def print_summary(report: Dict):
    """Print test summary"""
    print("\n" + "="*60)
    print("🎯 OLLAMA INTEGRATION TEST SUMMARY")
    print("="*60)
    
    summary = report['summary']
    print(f"📊 Total Tests: {summary['total_tests']}")
    print(f"❌ Failures: {summary['total_failures']}")
    print(f"💥 Errors: {summary['total_errors']}")
    print(f"📈 Success Rate: {summary['success_rate']:.1%}")
    
    print("\n📋 Test Results:")
    for test_name, result in report['results'].items():
        if isinstance(result, dict):
            status = result.get('status', 'unknown')
            if status == 'success':
                emoji = "✅"
            elif status == 'failed':
                emoji = "❌"
            else:
                emoji = "⚠️"
            
            print(f"  {emoji} {test_name}: {status}")
            
            if result.get('message'):
                print(f"     {result['message']}")
    
    print("\n" + "="*60)

def main():
    """Main test runner function"""
    parser = argparse.ArgumentParser(description="Ollama Integration Test Runner")
    parser.add_argument("--skip-ollama-check", action="store_true",
                       help="Skip Ollama availability check")
    parser.add_argument("--skip-existing-tests", action="store_true",
                       help="Skip running existing test suite")
    parser.add_argument("--fix-repository", action="store_true",
                       help="Apply repository fixes during cleanup")
    parser.add_argument("--output", type=Path,
                       help="Save detailed report to JSON file")
    parser.add_argument("--verbose", action="store_true",
                       help="Enable verbose output")
    
    args = parser.parse_args()
    
    print("🚀 Starting Ollama Integration Test Suite")
    print(f"📁 Project Root: {project_root}")
    
    # Results dictionary
    results = {}
    
    # Check dependencies
    deps = check_dependencies()
    results['dependencies'] = deps
    
    missing_deps = [dep for dep, available in deps.items() if not available]
    if missing_deps:
        print(f"\n⚠️  Missing dependencies: {', '.join(missing_deps)}")
        print("   Some tests may fail or be skipped")
    
    # Check Ollama availability
    if not args.skip_ollama_check:
        ollama_available = check_ollama_availability()
        results['ollama_available'] = ollama_available
        
        if not ollama_available:
            print("\n⚠️  Ollama not available. Integration tests may fail.")
            print("   Make sure Ollama is installed and running:")
            print("   - Install: https://ollama.ai/download")
            print("   - Start: ollama serve")
    
    # Run Ollama integration tests
    results['ollama_integration'] = run_ollama_integration_tests()
    
    # Run main integration tests
    results['main_integration'] = run_main_integration_tests()
    
    # Run existing tests (optional)
    if not args.skip_existing_tests:
        results['existing_tests'] = run_existing_tests()
    
    # Run repository cleanup
    results['repository_cleanup'] = run_repository_cleanup(fix=args.fix_repository)
    
    # Create comprehensive report
    report = create_test_report(results)
    
    # Print summary
    print_summary(report)
    
    # Save detailed report if requested
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"\n📄 Detailed report saved to: {args.output}")
    
    # Print verbose output if requested
    if args.verbose:
        print("\n🔍 DETAILED OUTPUT:")
        for test_name, result in results.items():
            if isinstance(result, dict) and 'stdout' in result:
                print(f"\n--- {test_name.upper()} OUTPUT ---")
                print(result['stdout'])
                if result.get('stderr'):
                    print(f"\n--- {test_name.upper()} ERRORS ---")
                    print(result['stderr'])
    
    # Determine exit code
    exit_code = 0
    for result in results.values():
        if isinstance(result, dict) and result.get('status') == 'failed':
            exit_code = 1
            break
    
    if exit_code == 0:
        print("\n🎉 All tests completed successfully!")
    else:
        print("\n💥 Some tests failed. Check the output above for details.")
    
    return exit_code

if __name__ == "__main__":
    exit(main())