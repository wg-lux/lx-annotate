#!/usr/bin/env python3
"""
Diagnostic script to analyze file_watcher CPU issues.

This script checks for the specific problems mentioned in the CPU analysis:
1. Watchdog logging levels
2. Observer type (inotify vs polling)
3. inotify limits
4. Event volume estimation
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from watchdog.observers import Observer

def check_observer_type():
    """Check if we're using InotifyObserver or PollingObserver."""
    print("🔍 Checking Observer Type:")
    observer = Observer()
    observer_type = type(observer).__name__
    print(f"   Observer type: {observer_type}")
    
    if observer_type == "InotifyObserver":
        print("   ✅ Using inotify (good for performance)")
    elif observer_type == "PollingObserver":
        print("   ⚠️  Using polling (causes high CPU!)")
    else:
        print(f"   ❓ Unknown observer type: {observer_type}")
    
    observer.stop()
    return observer_type

def check_inotify_limits():
    """Check inotify system limits."""
    print("\n🔍 Checking inotify Limits:")
    
    try:
        # Check max_user_watches
        with open('/proc/sys/fs/inotify/max_user_watches', 'r') as f:
            max_watches = int(f.read().strip())
        print(f"   max_user_watches: {max_watches}")
        
        if max_watches < 50000:
            print("   ⚠️  Low watch limit - consider increasing")
        else:
            print("   ✅ Watch limit looks good")
            
        # Check max_user_instances
        with open('/proc/sys/fs/inotify/max_user_instances', 'r') as f:
            max_instances = int(f.read().strip())
        print(f"   max_user_instances: {max_instances}")
        
    except (FileNotFoundError, PermissionError) as e:
        print(f"   ❌ Cannot read inotify limits: {e}")

def check_watchdog_logging():
    """Check current watchdog logging levels."""
    print("\n🔍 Checking Watchdog Logging:")
    
    watchdog_loggers = [
        "watchdog",
        "watchdog.observers", 
        "watchdog.observers.inotify_buffer"
    ]
    
    for logger_name in watchdog_loggers:
        logger = logging.getLogger(logger_name)
        level = logger.getEffectiveLevel()
        level_name = logging.getLevelName(level)
        print(f"   {logger_name}: {level_name}")
        
        if level <= logging.DEBUG:
            print(f"     ⚠️  DEBUG level will log every event!")
        elif level <= logging.INFO:
            print(f"     ℹ️  INFO level may be chatty")
        else:
            print(f"     ✅ {level_name} level should be quiet")

def estimate_event_volume():
    """Estimate potential event volume from storage directories."""
    print("\n🔍 Estimating Event Volume:")
    
    project_root = Path(__file__).parent.parent
    storage_paths = [
        project_root / 'storage',
        project_root / 'data' / 'videos',
        project_root / 'endoreg-db' / 'storage'
    ]
    
    for storage_path in storage_paths:
        if storage_path.exists():
            print(f"\n   📁 {storage_path}:")
            
            # Count files in subdirectories
            subdirs = [d for d in storage_path.iterdir() if d.is_dir()]
            for subdir in subdirs[:5]:  # Limit to first 5
                try:
                    file_count = len(list(subdir.rglob('*')))
                    print(f"     {subdir.name}: {file_count} files")
                    
                    if 'tmp' in subdir.name or 'transcoding' in subdir.name:
                        print(f"       ⚠️  Temp directory - high event volume expected!")
                        
                except (PermissionError, OSError) as e:
                    print(f"     {subdir.name}: Cannot access ({e})")
        else:
            print(f"   📁 {storage_path}: Not found")

def check_running_processes():
    """Check for running file_watcher processes."""
    print("\n🔍 Checking Running Processes:")
    
    try:
        result = subprocess.run(
            ['ps', 'aux'], 
            capture_output=True, 
            text=True
        )
        
        watcher_processes = []
        for line in result.stdout.splitlines():
            if 'file_watcher' in line:
                watcher_processes.append(line)
        
        if watcher_processes:
            print(f"   Found {len(watcher_processes)} file_watcher process(es):")
            for proc in watcher_processes:
                # Extract CPU and memory info
                parts = proc.split()
                if len(parts) >= 11:
                    cpu = parts[2]
                    mem = parts[3]
                    print(f"     CPU: {cpu}%, Memory: {mem}%")
                    
                    if float(cpu) > 100:
                        print(f"       ⚠️  High CPU usage detected!")
        else:
            print("   No file_watcher processes found")
            
    except (subprocess.SubprocessError, FileNotFoundError) as e:
        print(f"   ❌ Cannot check processes: {e}")

def check_log_files():
    """Analyze recent log files for event volume."""
    print("\n🔍 Checking Log Files:")
    
    project_root = Path(__file__).parent.parent
    log_file = project_root / 'logs' / 'file_watcher.log'
    
    if log_file.exists():
        print(f"   📄 {log_file}:")
        
        try:
            # Read last 100 lines
            result = subprocess.run(
                ['tail', '-100', str(log_file)],
                capture_output=True,
                text=True
            )
            
            lines = result.stdout.splitlines()
            
            # Count event types
            event_counts = {}
            debug_lines = 0
            
            for line in lines:
                if 'DEBUG' in line:
                    debug_lines += 1
                
                # Look for specific event patterns
                if 'IN_OPEN' in line:
                    event_counts['IN_OPEN'] = event_counts.get('IN_OPEN', 0) + 1
                elif 'IN_CLOSE' in line:
                    event_counts['IN_CLOSE'] = event_counts.get('IN_CLOSE', 0) + 1
                elif 'created' in line.lower():
                    event_counts['created'] = event_counts.get('created', 0) + 1
            
            print(f"     Last 100 lines analyzed")
            print(f"     DEBUG lines: {debug_lines}")
            
            if debug_lines > 50:
                print(f"       ⚠️  High DEBUG volume - check logging levels!")
            
            if event_counts:
                print(f"     Event counts: {event_counts}")
                total_events = sum(event_counts.values())
                if total_events > 20:
                    print(f"       ⚠️  High event volume detected!")
            
        except (subprocess.SubprocessError, FileNotFoundError) as e:
            print(f"     ❌ Cannot analyze log: {e}")
    else:
        print("   📄 No file_watcher.log found")

def main():
    """Run all diagnostic checks."""
    print("🚀 File Watcher CPU Diagnostic")
    print("=" * 50)
    
    check_observer_type()
    check_inotify_limits()
    check_watchdog_logging()
    estimate_event_volume()
    check_running_processes()
    check_log_files()
    
    print("\n" + "=" * 50)
    print("🏁 Diagnostic Complete")
    print("\nNext steps:")
    print("1. If using PollingObserver, install inotify support")
    print("2. If DEBUG logging is enabled, reduce to WARNING")
    print("3. If high event volume in temp dirs, add ignore patterns")
    print("4. If high CPU, restart with the updated file_watcher.py")

if __name__ == '__main__':
    main()