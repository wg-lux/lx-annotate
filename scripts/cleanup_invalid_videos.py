#!/usr/bin/env python
"""
Video Database Cleanup Script

Removes videos from the database that have insufficient frames or are corrupted.
This prevents streaming errors and ensures data integrity.

Created: October 15, 2025
Author: System
Issue: Videos with <10 frames cause streaming failures
"""

import os
import sys
import django
from pathlib import Path
from typing import List, Tuple

# Setup Django environment
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings.development')
django.setup()

from django.db import transaction
from endoreg_db.models import VideoFile, Frame, LabelVideoSegment
from endoreg_db.utils.paths import STORAGE_DIR

# Minimum viable frame count (videos with fewer frames are considered invalid)
MIN_FRAME_COUNT = 10

# Minimum file size in bytes (videos smaller are likely corrupted)
MIN_FILE_SIZE = 1024 * 100  # 100 KB


class VideoCleanupReport:
    """Track cleanup statistics"""
    
    def __init__(self):
        self.total_videos = 0
        self.invalid_videos: List[Tuple[int, str, str]] = []
        self.deleted_videos: List[int] = []
        self.preserved_videos: List[int] = []
        self.errors: List[str] = []
    
    def print_summary(self):
        """Print cleanup summary"""
        print("\n" + "="*80)
        print("VIDEO CLEANUP SUMMARY")
        print("="*80)
        print(f"Total videos checked:     {self.total_videos}")
        print(f"Invalid videos found:     {len(self.invalid_videos)}")
        print(f"Videos deleted:           {len(self.deleted_videos)}")
        print(f"Videos preserved:         {len(self.preserved_videos)}")
        print(f"Errors encountered:       {len(self.errors)}")
        
        if self.invalid_videos:
            print("\n" + "-"*80)
            print("INVALID VIDEOS DETAILS:")
            print("-"*80)
            for video_id, uuid, reason in self.invalid_videos:
                print(f"  ID: {video_id:4d} | UUID: {uuid} | Reason: {reason}")
        
        if self.errors:
            print("\n" + "-"*80)
            print("ERRORS:")
            print("-"*80)
            for error in self.errors:
                print(f"  ❌ {error}")
        
        print("="*80 + "\n")


def check_video_validity(video: VideoFile, report: VideoCleanupReport) -> Tuple[bool, str]:
    """
    Check if a video is valid for streaming.
    
    Returns:
        Tuple of (is_valid, reason_if_invalid)
    """
    # Check 1: Frame count
    try:
        frame_count = Frame.objects.filter(video_file=video).count()
        if frame_count < MIN_FRAME_COUNT:
            return False, f"Insufficient frames ({frame_count} < {MIN_FRAME_COUNT})"
    except Exception as e:
        report.errors.append(f"Video {video.id}: Failed to count frames - {e}")
        return False, f"Frame count error: {e}"
    
    # Check 2: File existence and size (raw file)
    if hasattr(video, 'active_raw_file') and video.active_raw_file:
        try:
            file_name = video.active_raw_file.name
            if file_name.startswith('/'):
                file_path = Path(file_name)
            else:
                file_path = STORAGE_DIR / file_name
            
            if not file_path.exists():
                return False, f"Raw file not found: {file_path}"
            
            file_size = file_path.stat().st_size
            if file_size < MIN_FILE_SIZE:
                return False, f"File too small ({file_size} bytes < {MIN_FILE_SIZE})"
                
        except Exception as e:
            report.errors.append(f"Video {video.id}: File check error - {e}")
            return False, f"File validation error: {e}"
    else:
        return False, "No raw file associated"
    
    # Check 3: Processed file (optional, but log if missing)
    if hasattr(video, 'processed_file') and video.processed_file:
        try:
            file_name = video.processed_file.name
            if file_name.startswith('/'):
                file_path = Path(file_name)
            else:
                file_path = STORAGE_DIR / file_name
            
            if not file_path.exists():
                print(f"  ⚠️  Video {video.id}: Processed file missing (raw still valid)")
        except Exception as e:
            print(f"  ⚠️  Video {video.id}: Processed file check error - {e}")
    
    return True, ""


def cleanup_invalid_videos(dry_run: bool = True) -> VideoCleanupReport:
    """
    Main cleanup function.
    
    Args:
        dry_run: If True, only report issues without deleting
    
    Returns:
        VideoCleanupReport with statistics
    """
    report = VideoCleanupReport()
    
    print("\n🔍 Starting video database cleanup...")
    print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE (will delete invalid videos)'}")
    print(f"Minimum frame count: {MIN_FRAME_COUNT}")
    print(f"Minimum file size: {MIN_FILE_SIZE} bytes\n")
    
    # Get all videos
    videos = VideoFile.objects.all().order_by('id')
    report.total_videos = videos.count()
    
    print(f"Found {report.total_videos} videos in database\n")
    
    for video in videos:
        video_uuid = getattr(video, 'uuid', 'unknown')
        
        # Check validity
        is_valid, reason = check_video_validity(video, report)
        
        if not is_valid:
            print(f"❌ Invalid: Video {video.id} ({video_uuid})")
            print(f"   Reason: {reason}")
            report.invalid_videos.append((video.id, str(video_uuid), reason))
            
            if not dry_run:
                try:
                    # Delete associated segments first
                    segment_count = LabelVideoSegment.objects.filter(video_file=video).count()
                    if segment_count > 0:
                        LabelVideoSegment.objects.filter(video_file=video).delete()
                        print(f"   Deleted {segment_count} associated segments")
                    
                    # Delete frames
                    frame_count = Frame.objects.filter(video_file=video).count()
                    if frame_count > 0:
                        Frame.objects.filter(video_file=video).delete()
                        print(f"   Deleted {frame_count} associated frames")
                    
                    # Delete video file from disk (if exists)
                    if hasattr(video, 'active_raw_file') and video.active_raw_file:
                        try:
                            file_name = video.active_raw_file.name
                            if file_name.startswith('/'):
                                file_path = Path(file_name)
                            else:
                                file_path = STORAGE_DIR / file_name
                            
                            if file_path.exists():
                                file_path.unlink()
                                print(f"   Deleted file: {file_path}")
                        except Exception as e:
                            report.errors.append(f"Video {video.id}: Failed to delete file - {e}")
                    
                    # Delete video record
                    video.delete()
                    report.deleted_videos.append(video.id)
                    print(f"   ✅ Video {video.id} deleted from database")
                    
                except Exception as e:
                    report.errors.append(f"Video {video.id}: Deletion failed - {e}")
                    print(f"   ❌ Deletion failed: {e}")
        else:
            report.preserved_videos.append(video.id)
    
    return report


def main():
    """Entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Cleanup invalid videos from database')
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Execute deletion (default is dry-run)'
    )
    parser.add_argument(
        '--min-frames',
        type=int,
        default=MIN_FRAME_COUNT,
        help=f'Minimum frame count (default: {MIN_FRAME_COUNT})'
    )
    
    args = parser.parse_args()
    
    # Update global minimum if provided
    global MIN_FRAME_COUNT
    MIN_FRAME_COUNT = args.min_frames
    
    # Run cleanup
    dry_run = not args.execute
    
    if not dry_run:
        confirm = input("\n⚠️  This will DELETE invalid videos from the database. Continue? (yes/no): ")
        if confirm.lower() != 'yes':
            print("❌ Aborted by user")
            return
    
    with transaction.atomic():
        report = cleanup_invalid_videos(dry_run=dry_run)
        
        if not dry_run and report.errors:
            print("\n⚠️  Errors occurred during cleanup. Rolling back transaction...")
            raise Exception("Cleanup failed - transaction rolled back")
    
    report.print_summary()
    
    if dry_run:
        print("💡 To execute deletion, run with --execute flag")
        print("   Example: python scripts/cleanup_invalid_videos.py --execute\n")


if __name__ == '__main__':
    main()
