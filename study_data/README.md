# Study data outputs

This directory holds derived datasets that are generated as part of experiments and analysis. The actual CSV exports (e.g., `knowledge_base_lookup_tracker.csv`) are produced at runtime by the Django middleware and are deliberately **not** checked in so that repeated runs do not clobber the repository history.

The middleware ensures the directory structure exists before writing to the CSV file, so simply creating this README is enough to keep the folder in version control.
