# One-shot watcher discovery

`lx-annotate-watch --once` retains Django startup, database connectivity and
runtime readiness validation. Only OCR preloading is deferred until supported
intake is found. The resident watcher still preloads on its main thread before
starting event workers. Neither mode changes backend handoff or durable state.

Preflight and submission share recursive discovery and the handler's format and
ignore rules. Roots missing at discovery time and unreadable subtrees fail
explicitly. Existing Django settings provision canonical directories before
discovery; the optimization preserves that behavior. Protected mount readiness
remains a deployment prerequisite. Symlink subtrees are excluded. Discovery does not claim, delete or mark files complete;
endoreg-db owns settling, claims, deduplication and Rust-authoritative state.
The intake is rescanned after OCR initialization. Arrivals after an empty decision
and unstable/unclaimed files require the existing arrival trigger or periodic
retry. Deployment acceptance must verify both triggers and the retry interval;
these application changes do not alter LuxNix units.

## Local performance comparison

Use an isolated development checkout, never a production environment. This
comparison retains actual Django/module/OCR imports but replaces database and
runtime readiness checks **in the measurement process only**, equally for both
modes. It isolates preload cost, not full packaged production startup. Baseline
mode restores the previous eager preload order; both use current discovery.
Test settings provision a temporary root; no documents are imported. The code
prints aggregate timings and peak process RSS, without document paths/content.

Set `ENDOREG_DB_CHECKOUT` and `LX_DATA_MODELS_CHECKOUT` to compatible local
source checkouts. From the repository root run each mode three times in fresh
processes:

```sh
for mode in baseline optimized baseline optimized baseline optimized; do
  PYTHONPATH="${ENDOREG_DB_CHECKOUT:?}:${LX_DATA_MODELS_CHECKOUT:?}:$PWD" .devenv/state/venv/bin/python - "$mode" <<'PY'
import json, os, resource, sys, time
start_wall, start_cpu = time.perf_counter(), time.process_time()
os.environ['DJANGO_SETTINGS_MODULE'] = 'lx_annotate.settings.settings_test'
import django
django.setup()
from lx_annotate import file_watcher as watcher
from endoreg_db.utils.file_operations import ensure_directory
for root in (watcher.INTAKE_VIDEO_DIR, watcher.INTAKE_REPORT_DIR,
             watcher.INTAKE_PREANONYMIZED_DIR):
    ensure_directory(root)
    if any(root.iterdir()):
        raise RuntimeError("Benchmark requires empty test intake")
watcher.FileWatcherService._validate_django_setup = lambda self: None
mode = sys.argv[1]
if mode == 'baseline':
    watcher._preload_processing_stack()
watcher.run_file_watcher(process_existing_once=True)
result = dict(mode=mode, cold_wall=time.perf_counter()-start_wall,
              cold_cpu=time.process_time()-start_cpu,
              rss_kib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
              preloaded=watcher.processing_stack_preloaded)
start_wall, start_cpu = time.perf_counter(), time.process_time()
for _ in range(20):
    if mode == 'baseline':
        watcher._preload_processing_stack()
    watcher.run_file_watcher(process_existing_once=True)
result.update(warm_wall=(time.perf_counter()-start_wall)/20,
              warm_cpu=(time.process_time()-start_cpu)/20)
print(json.dumps(result))
PY
done
```

Cold means a new interpreter, not a dropped OS page cache. Warm means repeated
in-process scans; systemd one-shot invocations always incur cold interpreter
startup. Compare only runs with successful baseline OCR preload. Peak RSS is
process-wide high water, so warm scans do not have an independent peak RSS.
Shared development workloads can distort wall time. Record results and remaining
packaged/deployment acceptance gaps in the feature criterion, not as a release
approval.

## Installed candidate acceptance

The unreleased application candidate is `1.5.8`, with coordinated local
`endoreg-db==1.5.8.dev1`, `lx-anonymizer==1.0.9.dev1` and
`lx-dtypes>=0.5.4.dev1`. The application version follows the existing shared
Python/frontend semantic-version policy. These artifacts are unpublished; the
registry-backed `uv.lock` must be reconciled before release. The historical
`CHANGELOG.yml` describes committed history and is not an unreleased tracker.

Install the four reviewed candidate wheels in an isolated interpreter. The
opt-in acceptance test rejects application/native modules outside that
interpreter and verifies their wheel RECORD hashes. Existing third-party
runtime dependencies may be shared read-only; this is not a dependency resolver
or full reproducible release-build test.

```sh
WATCHER_ACCEPTANCE_PYTHON=/path/to/candidate/bin/python \
WATCHER_ACCEPTANCE_BASELINE_PYTHON=/path/to/baseline/bin/python \
PYTHONPATH="${ENDOREG_DB_CHECKOUT:?}:${LX_DATA_MODELS_CHECKOUT:?}:$PWD" \
.devenv/state/venv/bin/pytest -s -q \
  tests/ingestion/test_packaged_watcher_acceptance.py
```

The baseline interpreter must install a separately built wheel restoring only
`lx_annotate/file_watcher.py` from the pre-optimization revision; all dependencies
and configuration remain identical. The test invokes installed
`lx-annotate-watch --once` from outside the checkout with production settings,
authentication enabled, synthetic test secret files and disposable PostgreSQL.
It retains real Django checks and runtime/database readiness. Local PostgreSQL
uses the test fixture's authentication and disables TLS only for that disposable
connection. No deployed credentials or data are used. An observational
`sitecustomize` records timing, RSS and OCR imports; it replaces no application
functions. Three fresh candidate and baseline processes measure actual empty
CLI startup, including Django and readiness.

A subsequent nested zero-byte source exercises real settling deferral twice and
must remain on disk with no UploadJob publication. This proves rediscovery on
successive trigger invocations, not successful document import. Successful
nonempty processing and candidate execution under deployed systemd units remain
separate acceptance gates. The unchanged LuxNix watcher contract provides three
canonical `PathChanged` roots, an initial two-minute timer, five-minute retry and
up to thirty seconds randomized delay. Root path monitoring does not recursively
notify for every nested write; the periodic scan is necessary for recovery.

The 2026-10-16 local candidate derives from application revision
`4937f274d7daef12439fceb006581432141de1d7` plus the reviewed working-tree
watcher changes and pre-existing user changes. It is not a clean release source.
The baseline archive contains identical entries and metadata; only
`lx_annotate/file_watcher.py` and wheel RECORD differ.

| Artifact | SHA-256 |
| --- | --- |
| Application 1.5.8 candidate | `cc939e902bf0b0ec27edb7b353089aae84b7b1c7fefdf2e35227de047cc6ad60` |
| Application 1.5.8 comparison baseline | `73fe1b6dd7b9c75e9de6ef9d1ad1b0b9cd867fab1b021562f9d215eb0f9d7ea9` |
| endoreg-db 1.5.8.dev1 | `74e317f87cbbad1382a176dc6a08317917fb7a2975c462c8f6650245210993e2` |
| lx-dtypes 0.5.4.dev1 | `94d0a5f8f95f133f9cc09ada59651052ca90127bab7706d12b9e6c896183a2ac` |
| lx-anonymizer 1.0.9.dev1 | `6b4c6a9b1cf1d2eec0d54a062e0cc99cbdd69f93e3496c71f93316692fae941f` |

LuxNix revision `cda962d31bda2811cecdeaeb413c6c84f8a0063e` with
`flake.lock` SHA-256
`62a46ed3343ceea3b65e9dc00916ef08e2db6afc08644fb5ab8d10e7d8f6664d`
passed all 19 watcher/file-mover contract tests, including actual Nix evaluation
of host trigger settings. Read-only gc-06 inspection also found the three path
roots active/waiting and the timer active/waiting with the settings above.
That inspection did not inject arrivals or execute the candidate on gc-06.

Actual installed acceptance passed on 2026-10-16: **1 test passed in 228.91 s**.
All three empty candidate invocations avoided Tesseract imports; all three
baseline invocations imported Tesseract. Medians of interleaved fresh processes:

| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| Process CPU seconds | 10.6936 | 9.9570 |
| Wall seconds | 8.1608 | 7.7466 |
| Peak RSS, KiB | 880800 | 714576 |

This is approximately 6.9% less process CPU and 18.9% less peak RSS. The larger
CPU reduction from the earlier isolated import harness is **not** the packaged
CLI improvement. CPU and wall samples varied substantially on the shared host;
no OS caches were dropped. These measurements preserve production settings,
Django schema/native capability checks and actual database/runtime readiness.
The test also passed inconsistent-root refusal and two genuine backend settle
deferrals for a nested zero-byte source, retained without UploadJob publication.
An initial harness run failed because the required protected-media URL was
omitted; supplying the canonical `/protected_media/` resolved that configuration
error without disabling a check.

The wheel used existing validated static assets and a dirty working tree;
unrelated staged frontend changes were not rebuilt or accepted. Registry lock
reconciliation and a reviewed clean release build remain open. No candidate was
deployed, no successful document was processed, and active deployed triggers were
only observed. Successful processing and bounded recovery under the actual
candidate systemd path/timer units still require operational acceptance.
