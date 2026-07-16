from django.db import migrations


class Migration(migrations.Migration):
    """
    Compatibility node for deployments that already use the lx-annotate override
    migration chain.

    The custom 0010 override already performs the center_key and UploadJob field
    work that upstream endoreg_db.0011_hub_ingest_metadata would normally do.
    This migration therefore exists only to bridge the graph so later upstream
    migrations (0012, 0013) have the parent node they expect.
    """

    dependencies = [
        ("endoreg_db", "0010_remove_requirementset_reqset_exam_links_and_more"),
    ]

    operations = []
