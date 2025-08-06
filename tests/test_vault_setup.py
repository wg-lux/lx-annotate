#!/usr/bin/env python3
"""
Test script to verify the improved fetch_db_pwd_file.py behavior.
This test validates the error handling and success scenarios.
"""
import os
import sys
import tempfile
import subprocess
from pathlib import Path

def run_fetch_script(**env_vars):
    """Run the fetch_db_pwd_file.py script with given environment variables."""
    script_path = Path(__file__).parent.parent / "scripts" / "fetch_db_pwd_file.py"
    
    # Set up environment
    test_env = os.environ.copy()
    test_env.update(env_vars)
    
    # Run the script
    result = subprocess.run(
        [sys.executable, str(script_path)],
        env=test_env,
        capture_output=True,
        text=True
    )
    
    return result

def test_missing_env_vars():
    """Test behavior when environment variables are missing."""
    print("Testing missing environment variables...")
    
    result = run_fetch_script()
    
    assert result.returncode == 1, "Should exit with error code 1"
    assert "Missing required environment variables" in result.stderr
    assert "DB_PWD_FILE: ✗ Missing" in result.stderr
    assert "LX_MAINTENANCE_PASSWORD_FILE: ✗ Missing" in result.stderr
    assert "luxnix vault system" in result.stderr
    print("✓ Missing environment variables test passed")

def test_nonexistent_vault_file():
    """Test behavior when vault file doesn't exist."""
    print("Testing nonexistent vault file...")
    
    with tempfile.NamedTemporaryFile() as temp_target:
        result = run_fetch_script(
            DB_PWD_FILE=temp_target.name,
            LX_MAINTENANCE_PASSWORD_FILE="/nonexistent/vault/file"
        )
        
        assert result.returncode == 1, "Should exit with error code 1"
        assert "LX maintenance password file not found" in result.stderr
        assert "luxnix vault system" in result.stderr
        assert "system administrator" in result.stderr
        print("✓ Nonexistent vault file test passed")

def test_permission_denied():
    """Test behavior when vault file has no read permissions."""
    print("Testing permission denied...")
    
    with tempfile.NamedTemporaryFile() as temp_vault, \
         tempfile.NamedTemporaryFile() as temp_target:
        
        # Create vault file but remove read permissions
        temp_vault.write(b"test-password")
        temp_vault.flush()
        os.chmod(temp_vault.name, 0o000)
        
        result = run_fetch_script(
            DB_PWD_FILE=temp_target.name,
            LX_MAINTENANCE_PASSWORD_FILE=temp_vault.name
        )
        
        assert result.returncode == 1, "Should exit with error code 1"
        assert "Permission denied reading LX maintenance password file" in result.stderr
        assert "permissions issue with the luxnix vault system" in result.stderr
        print("✓ Permission denied test passed")

def test_successful_copy():
    """Test successful vault file copy."""
    print("Testing successful vault file copy...")
    
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp_vault, \
         tempfile.NamedTemporaryFile(delete=False) as temp_target:
        
        # Create vault file with test password
        temp_vault.write("test-password-123")
        temp_vault.flush()
        vault_path = temp_vault.name
        target_path = temp_target.name
    
    try:
        result = run_fetch_script(
            DB_PWD_FILE=target_path,
            LX_MAINTENANCE_PASSWORD_FILE=vault_path
        )
        
        assert result.returncode == 0, f"Should succeed, but got: {result.stderr}"
        assert "Successfully copied database password" in result.stdout
        
        # Verify file was copied correctly
        with open(target_path, 'r') as f:
            content = f.read()
        assert content == "test-password-123", f"Content mismatch: {content}"
        
        # Verify permissions are set correctly (600)
        stat_info = os.stat(target_path)
        permissions = oct(stat_info.st_mode)[-3:]
        assert permissions == "600", f"Wrong permissions: {permissions}"
        
        print("✓ Successful copy test passed")
        
    finally:
        # Clean up
        for path in [vault_path, target_path]:
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass

def main():
    """Run all tests."""
    print("=== Testing fetch_db_pwd_file.py improvements ===\n")
    
    try:
        test_missing_env_vars()
        test_nonexistent_vault_file()
        test_permission_denied()
        test_successful_copy()
        
        print("\n✅ All tests passed!")
        print("The fetch_db_pwd_file.py script correctly handles all error scenarios")
        print("and provides helpful error messages for vault access issues.")
        return 0
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())