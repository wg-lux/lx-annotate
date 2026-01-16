Here is a comprehensive Pydantic V2 Cheat Sheet. It consolidates our previous discussions on strict typing, date handling, and validation into reusable patterns.

-----

### The Pydantic V2 Lifecycle

Understanding *when* things happen is key to using the tools below.

-----

### 1. The "Golden Standard" Base Model

Start every project with this. It handles string hygiene and configuration globally, so you don't have to repeat it.

```python
from pydantic import BaseModel, ConfigDict

class AppBaseModel(BaseModel):
    model_config = ConfigDict(
        # 1. Strips leading/trailing whitespace automatically ("  val  " -> "val")
        str_strip_whitespace=True,
        # 2. Rejects extra fields not defined in the model (Security/Strictness)
        extra='forbid',
        # 3. Validates default values (ensures your defaults aren't broken)
        validate_default=True,
        # 4. Allows population by alias (e.g. accepting "camelCase" input)
        populate_by_name=True,
    )
```

-----

### 2. DateTime & Timezones (Strict Mode)

Never use naive datetimes. Always use `AwareDatetime` and `default_factory`.

```python
from datetime import datetime, timezone
from pydantic import Field, AwareDatetime

class TimestampModel(AppBaseModel):
    # ✅ CORRECT: Enforces timezone info in input
    event_time: AwareDatetime

    # ✅ CORRECT: Dynamic default (calculated at runtime)
    # Stores as UTC, ensuring database consistency
    created_at: AwareDatetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # ❌ WRONG: Static default (calculated at server startup)
    # created_at: datetime = datetime.now()
```

-----

### 3. Reusable Fields (Mixins)

Use Mixins for fields that appear across multiple models (like your `name_de`/`name_en` requirement).

```python
from typing import Optional
from pydantic import BaseModel, model_validator

class LocalizedNameMixin(BaseModel):
    name: str
    name_de: Optional[str] = None
    name_en: Optional[str] = None

    @model_validator(mode='after')
    def fallback_translations(self) -> 'LocalizedNameMixin':
        """Autofill missing translations with the primary name."""
        if not self.name_en:
            self.name_en = self.name
        if not self.name_de:
            self.name_de = self.name
        return self

# Usage
class Product(LocalizedNameMixin, AppBaseModel):
    sku: str
    price: float
```

-----

### 4. Advanced Validation Patterns

#### A. Sorting & Uniqueness (Lists)

Enforce that a list is unique and sorted upon creation.

```python
from typing import List
from pydantic import field_validator

class TaggedItem(AppBaseModel):
    tags: List[str]

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        # 1. Deduplicate (set)
        # 2. Sort (sorted)
        # 3. Return (must return the value)
        return sorted(list(set(v)))
```

#### B. The "Best of Both Worlds" (Dict vs List)

Store data as a **Dict** (for O(1) performance), but accept and return **Lists** (for API standards).

```python
from typing import Dict, List, Any
from pydantic import BaseModel, field_validator, field_serializer, ValidationInfo

class Inventory(BaseModel):
    # Internal storage is a Dict
    items: Dict[str, Any]

    # 1. INPUT: Accept a List, convert to Dict
    @field_validator('items', mode='before')
    @classmethod
    def parse_list_to_dict(cls, v: Any) -> Dict[str, Any]:
        if isinstance(v, list):
            # Assumes items have a 'name' key; converts list to dict
            return {item['name']: item for item in v}
        return v

    # 2. OUTPUT: Convert Dict back to List for JSON
    @field_serializer('items')
    def serialize_dict_to_list(self, v: Dict[str, Any], _info) -> List[Any]:
        return list(v.values())
```

-----

### 5. Computed Fields (Derived Data)

Use this for fields that shouldn't be saved to the DB, but should appear in the API response.

```python
from pydantic import computed_field

class Rectangle(AppBaseModel):
    width: int
    height: int

    @computed_field
    def area(self) -> int:
        return self.width * self.height

# JSON Output: { "width": 10, "height": 5, "area": 50 }
```

-----

### 6. Managing Aliases (Frontend vs Backend)

Handle `camelCase` (JS frontend) vs `snake_case` (Python backend).

```python
from pydantic import Field

class User(AppBaseModel):
    # Python sees: first_name
    # JSON input/output can be: firstName
    first_name: str = Field(alias="firstName")

# Usage
# User(firstName="John") -> sets user.first_name to "John"
```

-----

### 7. Path Objects & Filesystems

Prefer `pathlib` types over raw strings whenever a model touches the filesystem. This preserves cross-platform semantics and lets Pydantic validate early.

```python
from pathlib import Path
from pydantic import BaseModel, FilePath, DirectoryPath, ConfigDict, field_validator


class FileInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    # ✅ Use the specialized validators for existing files/dirs
    template_path: FilePath
    output_dir: DirectoryPath

    # ✅ Accept strings, but normalize to absolute Paths
    @field_validator('template_path', 'output_dir', mode='after')
    @classmethod
    def resolve_paths(cls, value: Path) -> Path:
        return value.expanduser().resolve()


class LazyPathModel(BaseModel):
    # ✅ When the resource might not exist yet, fall back to plain Path
    export_path: Path = Path('exports/report.json')

    @field_validator('export_path', mode='before')
    @classmethod
    def default_suffix(cls, value: str | Path) -> Path:
        """Ensure the path carries the correct extension."""
        path = Path(value)
        return path if path.suffix else path.with_suffix('.json')
```

Best practices:
- Normalize inputs with `expanduser()`/`resolve()` so downstream services never see `~` or relative segments.
- Use `FilePath`/`DirectoryPath` when the path must already exist; use plain `Path` for lazily created artifacts.
- Keep path defaults inside `Path` objects (not strings) to avoid OS-specific separators.
- Add validators when business rules apply (extensions, allowed roots, etc.) and document the behavior in docstrings.

-----

### 8. YAML Fixtures & Sample Data

Treat YAML fixtures like immutable contracts: load them through your models so drift is caught immediately.

```python
import yaml
from pathlib import Path
from typing import Iterable


def load_fixtures(path: Path, model) -> Iterable:
    raw = yaml.safe_load(path.read_text())
    for item in raw:
        yield model.model_validate(item)

# Usage
# for person in load_fixtures(Path('data/sample_people.yaml'), PersonModel):
#     ...
```

Best practices:
- Co-locate fixtures next to the consuming models/tests (e.g. `tests/fixtures/*.yaml`) and treat them as versioned assets.
- Always validate after loading (`model_validate`) so schema changes fail fast instead of producing silent runtime bugs.
- Keep human-friendly anchors/comments, but avoid executable YAML features (tags, !!python) for security.
- Store metadata (`version`, `generated_at`, `source`) at the document root to help migrations.
- Split sensitive overrides into separate files (`fixture.local.yaml`) and load them explicitly to avoid leaking secrets.
- Wire fixtures into unit tests to guarantee they stay in sync with production schemas.

-----

### Summary Table: Validator Modes

| Decorator | Mode | Use Case |
| --- | --- | --- |
| `@field_validator` | `after` (default) | Validating business logic (e.g., "age > 18"). Data is already Python types. |
| `@field_validator` | `before` | Pre-processing raw data (e.g., parsing a comma-separated string into a list). |
| `@model_validator` | `after` | Multi-field logic (e.g., "start_date must be before end_date"). |
| `@model_validator` | `before` | Reshaping the entire incoming JSON structure before Pydantic touches it. |

### Next Step

Would you like me to show you how to generate **Environment Configuration** (loading `.env` files) using `pydantic-settings`, which is the standard way to handle secrets like database URLs alongside these models?
