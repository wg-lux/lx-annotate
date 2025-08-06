#!/usr/bin/env python3
"""
Test script to verify luxnix compatibility features.
"""
import os
import sys
from pathlib import Path

def test_luxnix_detection():
    """Test if the application can detect luxnix environment."""
    print("Testing luxnix environment detection...")
    
    # Check if local_settings.py exists (luxnix managed)
    local_settings_exists = Path("local_settings.py").exists()
    print(f"local_settings.py exists: {local_settings_exists}")
    
    # Check for luxnix environment variables
    luxnix_vars = [
        "CENTRAL_NODE",
        "DJANGO_SETTINGS_MODULE_CENTRAL", 
        "DB_CONFIG_FILE"
    ]
    
    for var in luxnix_vars:
        value = os.environ.get(var)
        print(f"{var}: {value if value else 'Not set'}")
    
    return local_settings_exists

def test_central_node_detection():
    """Test central node detection."""
    print("\nTesting central node detection...")
    
    central_node = os.environ.get("CENTRAL_NODE", "false").lower() == "true"
    print(f"Central node detected: {central_node}")
    
    return central_node

def test_environment_variables():
    """Test that all required environment variables are available."""
    print("\nTesting environment variables...")
    
    required_vars = [
        "DJANGO_HOST",
        "DJANGO_PORT",
        "DATA_DIR",
        "CONF_DIR",
        "DJANGO_MODULE"
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            print(f"✓ {var}: {value}")
        else:
            print(f"✗ {var}: Not set")
            missing_vars.append(var)
    
    return len(missing_vars) == 0

def main():
    """Run all luxnix compatibility tests."""
    print("=== Luxnix Compatibility Test ===\n")
    
    # Test detection
    is_luxnix = test_luxnix_detection()
    is_central = test_central_node_detection()
    has_env_vars = test_environment_variables()
    
    print("\n=== Summary ===")
    print(f"Luxnix environment detected: {is_luxnix}")
    print(f"Central node: {is_central}")
    print(f"Environment variables available: {has_env_vars}")
    
    if is_luxnix:
        print("\n✓ Application is running in luxnix managed environment")
        print("  - Configuration will be managed via local_settings.py")
        print("  - Database credentials loaded from luxnix vault")
        print("  - Security settings managed by deployment system")
    else:
        print("\n! Application is running in development/manual environment")
        print("  - Using local .env file for configuration")
        print("  - Manual database configuration required")
        
    return 0

if __name__ == "__main__":
    sys.exit(main())
