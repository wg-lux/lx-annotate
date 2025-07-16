#!/usr/bin/env python3
"""
HuggingFace Cache Management Utility

This script manages the HuggingFace cache directory to prevent storage overflow.
It can clean up old models, temporary files, and manage cache size limits.

Usage:
    python scripts/hf_cache_manager.py --cleanup --max-size 50GB
    python scripts/hf_cache_manager.py --list-models
    python scripts/hf_cache_manager.py --emergency-cleanup
"""

import argparse
import shutil
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class HuggingFaceCacheManager:
    """Manages HuggingFace cache directory to prevent storage issues."""
    
    def __init__(self, cache_dir: Path = None):
        """
        Initialize cache manager.
        
        Args:
            cache_dir: Path to HuggingFace cache directory
        """
        self.cache_dir = cache_dir or Path.home() / '.cache' / 'huggingface'
        self.hub_dir = self.cache_dir / 'hub'
        self.transformers_dir = self.cache_dir / 'transformers'
        self.datasets_dir = self.cache_dir / 'datasets'
        
    def get_cache_info(self) -> Dict[str, float]:
        """Get cache directory size information."""
        try:
            total_size = 0
            hub_size = 0
            transformers_size = 0
            datasets_size = 0
            
            if self.cache_dir.exists():
                total_size = sum(
                    f.stat().st_size for f in self.cache_dir.rglob('*') 
                    if f.is_file()
                )
            
            if self.hub_dir.exists():
                hub_size = sum(
                    f.stat().st_size for f in self.hub_dir.rglob('*') 
                    if f.is_file()
                )
            
            if self.transformers_dir.exists():
                transformers_size = sum(
                    f.stat().st_size for f in self.transformers_dir.rglob('*') 
                    if f.is_file()
                )
            
            if self.datasets_dir.exists():
                datasets_size = sum(
                    f.stat().st_size for f in self.datasets_dir.rglob('*') 
                    if f.is_file()
                )
            
            return {
                'total_gb': total_size / (1024**3),
                'hub_gb': hub_size / (1024**3),
                'transformers_gb': transformers_size / (1024**3),
                'datasets_gb': datasets_size / (1024**3)
            }
            
        except Exception as e:
            logger.error(f"Failed to get cache info: {e}")
            return {'total_gb': 0, 'hub_gb': 0, 'transformers_gb': 0, 'datasets_gb': 0}
    
    def list_cached_models(self) -> List[Dict[str, any]]:
        """List all cached models with size information."""
        models = []
        
        try:
            from huggingface_hub import scan_cache_dir
            
            if not self.cache_dir.exists():
                return models
            
            cache_info = scan_cache_dir(self.cache_dir)
            
            for repo in cache_info.repos:
                models.append({
                    'repo_id': repo.repo_id,
                    'repo_type': repo.repo_type,
                    'size_gb': repo.size_on_disk / (1024**3),
                    'last_accessed': repo.last_accessed,
                    'last_modified': repo.last_modified,
                    'refs': [ref.ref_name for ref in repo.refs]
                })
            
            # Sort by size (largest first)
            models.sort(key=lambda x: x['size_gb'], reverse=True)
            
        except ImportError:
            logger.warning("huggingface_hub not available, using manual scanning")
            models = self._manual_list_models()
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
        
        return models
    
    def _manual_list_models(self) -> List[Dict[str, any]]:
        """Manual model listing when huggingface_hub is not available."""
        models = []
        
        try:
            if not self.hub_dir.exists():
                return models
            
            for model_dir in self.hub_dir.iterdir():
                if model_dir.is_dir():
                    try:
                        size = sum(
                            f.stat().st_size for f in model_dir.rglob('*') 
                            if f.is_file()
                        )
                        
                        # Get last modified time
                        try:
                            last_modified = max(
                                f.stat().st_mtime for f in model_dir.rglob('*') 
                                if f.is_file()
                            )
                            last_modified = datetime.fromtimestamp(last_modified)
                        except:
                            last_modified = datetime.now()
                        
                        models.append({
                            'repo_id': model_dir.name,
                            'repo_type': 'model',
                            'size_gb': size / (1024**3),
                            'last_accessed': last_modified,
                            'last_modified': last_modified,
                            'refs': []
                        })
                        
                    except Exception as e:
                        logger.debug(f"Failed to process {model_dir}: {e}")
            
            # Sort by size (largest first)
            models.sort(key=lambda x: x['size_gb'], reverse=True)
            
        except Exception as e:
            logger.error(f"Manual model listing failed: {e}")
        
        return models
    
    def cleanup_old_models(self, max_age_days: int = 30, preserve_models: List[str] = None) -> float:
        """
        Clean up old cached models.
        
        Args:
            max_age_days: Maximum age of models to keep
            preserve_models: List of model names to preserve
            
        Returns:
            Amount of space freed in GB
        """
        if preserve_models is None:
            preserve_models = [
                'openbmb/MiniCPM-o-2_6',  # Preserve current MiniCPM model
                'microsoft/DialoGPT-medium',  # Preserve other essential models
            ]
        
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        total_freed = 0
        
        try:
            from huggingface_hub import scan_cache_dir
            
            if not self.cache_dir.exists():
                return 0.0
            
            cache_info = scan_cache_dir(self.cache_dir)
            
            models_to_delete = []
            for repo in cache_info.repos:
                # Skip preserved models
                if any(preserve in repo.repo_id for preserve in preserve_models):
                    logger.info(f"Preserving model: {repo.repo_id}")
                    continue
                
                # Check if model is old
                if repo.last_accessed and repo.last_accessed < cutoff_date:
                    models_to_delete.append(repo)
                elif repo.size_on_disk > 15 * 1024**3:  # Large models (>15GB)
                    logger.info(f"Marking large model for deletion: {repo.repo_id} ({repo.size_on_disk / 1024**3:.1f}GB)")
                    models_to_delete.append(repo)
            
            # Delete old models
            for repo in models_to_delete:
                try:
                    size_before = repo.size_on_disk
                    repo.delete()
                    total_freed += size_before
                    logger.info(f"Deleted cached model: {repo.repo_id} ({size_before / 1024**3:.1f}GB)")
                except Exception as e:
                    logger.warning(f"Failed to delete {repo.repo_id}: {e}")
            
        except ImportError:
            logger.warning("huggingface_hub not available, using manual cleanup")
            total_freed = self._manual_cleanup_old_models(max_age_days, preserve_models)
        except Exception as e:
            logger.error(f"Model cleanup failed: {e}")
        
        return total_freed / (1024**3)  # Convert to GB
    
    def _manual_cleanup_old_models(self, max_age_days: int, preserve_models: List[str]) -> int:
        """Manual cleanup when huggingface_hub is not available."""
        total_freed = 0
        cutoff_time = (datetime.now() - timedelta(days=max_age_days)).timestamp()
        
        try:
            if not self.hub_dir.exists():
                return 0
            
            for model_dir in self.hub_dir.iterdir():
                if not model_dir.is_dir():
                    continue
                
                # Skip preserved models
                if any(preserve in model_dir.name for preserve in preserve_models):
                    logger.info(f"Preserving model directory: {model_dir.name}")
                    continue
                
                try:
                    # Check if directory is old
                    dir_mtime = model_dir.stat().st_mtime
                    
                    if dir_mtime < cutoff_time:
                        # Calculate size before deletion
                        dir_size = sum(
                            f.stat().st_size for f in model_dir.rglob('*') 
                            if f.is_file()
                        )
                        
                        # Delete the directory
                        shutil.rmtree(model_dir, ignore_errors=True)
                        total_freed += dir_size
                        
                        logger.info(f"Deleted old model directory: {model_dir.name} ({dir_size / 1024**3:.1f}GB)")
                        
                except Exception as e:
                    logger.warning(f"Failed to process {model_dir}: {e}")
        
        except Exception as e:
            logger.error(f"Manual cleanup failed: {e}")
        
        return total_freed
    
    def cleanup_temp_files(self) -> float:
        """Clean up temporary and incomplete files."""
        total_freed = 0
        
        try:
            temp_patterns = [
                '*.tmp',
                '*.temp',
                '*.incomplete',
                '**/tmp*',
                '**/temp*',
                '**/*.lock',
                '**/.locks/*'
            ]
            
            for pattern in temp_patterns:
                for file_path in self.cache_dir.rglob(pattern):
                    try:
                        if file_path.is_file():
                            file_size = file_path.stat().st_size
                            file_path.unlink()
                            total_freed += file_size
                            logger.debug(f"Deleted temp file: {file_path}")
                    except Exception as e:
                        logger.debug(f"Failed to delete {file_path}: {e}")
            
            logger.info(f"Temp file cleanup: {total_freed / 1024**3:.2f}GB freed")
            
        except Exception as e:
            logger.error(f"Temp file cleanup failed: {e}")
        
        return total_freed / (1024**3)
    
    def emergency_cleanup(self, target_size_gb: float = 50.0) -> float:
        """
        Perform emergency cleanup to reach target cache size.
        
        Args:
            target_size_gb: Target cache size in GB
            
        Returns:
            Amount of space freed in GB
        """
        logger.warning(f"🚨 EMERGENCY HuggingFace cache cleanup to reach {target_size_gb}GB")
        
        total_freed = 0
        
        # 1. Clean temp files first
        temp_freed = self.cleanup_temp_files()
        total_freed += temp_freed
        
        # 2. Get current size
        cache_info = self.get_cache_info()
        current_size = cache_info['total_gb']
        
        logger.info(f"Current cache size: {current_size:.1f}GB, target: {target_size_gb}GB")
        
        if current_size <= target_size_gb:
            logger.info("Cache size already within target")
            return total_freed
        
        # 3. Clean old models progressively
        for max_age in [7, 14, 30, 90]:  # Progressively older models
            models_freed = self.cleanup_old_models(max_age_days=max_age)
            total_freed += models_freed
            
            # Check if we've reached target
            cache_info = self.get_cache_info()
            current_size = cache_info['total_gb']
            
            logger.info(f"After {max_age}-day cleanup: {current_size:.1f}GB remaining")
            
            if current_size <= target_size_gb:
                break
        
        # 4. If still too large, remove largest models (except essential ones)
        if current_size > target_size_gb:
            logger.warning("Still above target, removing largest non-essential models")
            large_models_freed = self._cleanup_largest_models(target_size_gb)
            total_freed += large_models_freed
        
        final_cache_info = self.get_cache_info()
        logger.info(f"🔥 Emergency cleanup completed: {total_freed:.1f}GB freed, "
                   f"final size: {final_cache_info['total_gb']:.1f}GB")
        
        return total_freed
    
    def _cleanup_largest_models(self, target_size_gb: float) -> float:
        """Remove largest models until target size is reached."""
        total_freed = 0
        essential_models = [
            'openbmb/MiniCPM-o-2_6',
            'microsoft/DialoGPT-medium',
        ]
        
        try:
            models = self.list_cached_models()
            current_size = self.get_cache_info()['total_gb']
            
            for model in models:
                # Skip essential models
                if any(essential in model['repo_id'] for essential in essential_models):
                    continue
                
                if current_size <= target_size_gb:
                    break
                
                # Try to delete this model
                try:
                    from huggingface_hub import scan_cache_dir
                    cache_info = scan_cache_dir(self.cache_dir)
                    
                    for repo in cache_info.repos:
                        if repo.repo_id == model['repo_id']:
                            size_before = repo.size_on_disk
                            repo.delete()
                            total_freed += size_before / (1024**3)
                            current_size -= size_before / (1024**3)
                            
                            logger.info(f"Emergency deleted: {model['repo_id']} ({model['size_gb']:.1f}GB)")
                            break
                            
                except Exception as e:
                    logger.warning(f"Failed to emergency delete {model['repo_id']}: {e}")
        
        except Exception as e:
            logger.error(f"Emergency largest model cleanup failed: {e}")
        
        return total_freed


def parse_size(size_str: str) -> float:
    """Parse size string like '50GB' to float in GB."""
    size_str = size_str.upper().strip()
    
    if size_str.endswith('GB'):
        return float(size_str[:-2])
    elif size_str.endswith('MB'):
        return float(size_str[:-2]) / 1024
    elif size_str.endswith('TB'):
        return float(size_str[:-2]) * 1024
    else:
        return float(size_str)  # Assume GB


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description='HuggingFace Cache Management Utility')
    
    parser.add_argument('--cache-dir', type=Path, help='HuggingFace cache directory')
    parser.add_argument('--list-models', action='store_true', help='List all cached models')
    parser.add_argument('--cleanup', action='store_true', help='Clean up old models and temp files')
    parser.add_argument('--emergency-cleanup', action='store_true', help='Emergency cleanup to free space')
    parser.add_argument('--max-age', type=int, default=30, help='Maximum age of models to keep (days)')
    parser.add_argument('--target-size', type=str, default='50GB', help='Target cache size (e.g., 50GB)')
    parser.add_argument('--preserve', nargs='*', default=['openbmb/MiniCPM-o-2_6'], 
                       help='Models to preserve during cleanup')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without deleting')
    
    args = parser.parse_args()
    
    # Initialize cache manager
    cache_manager = HuggingFaceCacheManager(args.cache_dir)
    
    # Show current cache info
    cache_info = cache_manager.get_cache_info()
    print(f"\n📊 HuggingFace Cache Status:")
    print(f"Total Size: {cache_info['total_gb']:.1f} GB")
    print(f"Hub: {cache_info['hub_gb']:.1f} GB")
    print(f"Transformers: {cache_info['transformers_gb']:.1f} GB")
    print(f"Datasets: {cache_info['datasets_gb']:.1f} GB")
    
    if args.list_models:
        print(f"\n📋 Cached Models:")
        models = cache_manager.list_cached_models()
        for model in models[:20]:  # Show top 20
            last_accessed = model['last_accessed'].strftime('%Y-%m-%d') if model['last_accessed'] else 'Unknown'
            print(f"  {model['repo_id']:50} {model['size_gb']:>8.1f} GB  Last: {last_accessed}")
        
        if len(models) > 20:
            print(f"  ... and {len(models) - 20} more models")
    
    if args.emergency_cleanup:
        target_size = parse_size(args.target_size)
        if not args.dry_run:
            freed = cache_manager.emergency_cleanup(target_size)
            print(f"\n🔥 Emergency cleanup completed: {freed:.1f} GB freed")
        else:
            print(f"\n🔍 DRY RUN: Would perform emergency cleanup to {target_size:.1f} GB")
    
    elif args.cleanup:
        if not args.dry_run:
            temp_freed = cache_manager.cleanup_temp_files()
            models_freed = cache_manager.cleanup_old_models(args.max_age, args.preserve)
            total_freed = temp_freed + models_freed
            print(f"\n🧹 Cleanup completed: {total_freed:.1f} GB freed")
        else:
            print(f"\n🔍 DRY RUN: Would clean models older than {args.max_age} days")
    
    # Show final cache info
    final_cache_info = cache_manager.get_cache_info()
    print(f"\nFinal Cache Size: {final_cache_info['total_gb']:.1f} GB")


if __name__ == '__main__':
    main()