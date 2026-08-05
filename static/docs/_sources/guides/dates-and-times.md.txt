# Dates and Times

Date and time fields must be typed and timezone-aware at the model boundary.
Pydantic V2 provides the validation tools, but the project convention is to
reject ambiguous datetime values before they reach persistence or workflow
logic.

## 1. Always Use Strong Typing

Never define a date field as a `str`, even if the input is a string from a JSON payload. Use Python’s standard library types. Pydantic will automatically parse ISO 8601 strings into these objects.

- **`datetime.date`**: For birthdays, holidays, or specific calendar days (no time component).
- **`datetime.datetime`**: For timestamps, log events, or scheduled appointments.
- **`datetime.time`**: For opening hours or recurring daily events.

## 2. Enforce Timezone Awareness

The most common backend error is mixing naive datetimes, which have no timezone
metadata, with aware datetimes, which include timezone metadata.

Project rules:

- Store everything in **UTC**.
- Reject naive datetimes at the API boundary.
- Use Pydantic's `AwareDatetime` type (introduced in V2).

```python
from datetime import datetime, timezone
from pydantic import BaseModel, AwareDatetime

class Event(BaseModel):
    # Bad: accepts naive datetimes and defaults to local time.
    # created_at: datetime

    # Good: requires timezone metadata.
    start_time: AwareDatetime

# Usage
try:
    # Fails validation because no timezone is provided.
    Event(start_time=datetime(2023, 1, 1, 12, 0))
except Exception:
    print("Validation Error: Timezone required")

# Passes validation.
Event(start_time=datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc))
```

## 3. Stick to ISO 8601 Standards

Pydantic is optimized to parse ISO 8601 formats (e.g., `YYYY-MM-DDTHH:MM:SSZ`).

- **Input:** Encourage clients to send ISO strings.
- **Output:** Pydantic serializes to ISO strings by default.
- **Avoid Custom Formats:** Avoid configuring Pydantic to parse format strings like `DD/MM/YYYY`. It makes the API brittle and region-dependent. If a legacy format is unavoidable, use a `BeforeValidator`.

## 4. Validate Business Logic

Use the `@field_validator` decorator to enforce logical constraints, such as ensuring a birth date is in the past or a scheduled task is in the future.

```python
from datetime import date, timedelta
from pydantic import BaseModel, field_validator

class UserProfile(BaseModel):
    birth_date: date

    @field_validator('birth_date')
    @classmethod
    def must_be_18(cls, v: date) -> date:
        today = date.today()
        # Calculate age roughly
        age = (today - v).days / 365.25
        if age < 18:
            raise ValueError('User must be 18 or older')
        return v
```

## 5. Handle "Now" and Defaults

**Never** set a mutable default (like `datetime.now()`) directly in the field definition. Python evaluates default arguments once at definition time, not at instantiation time.

Bad:

```python
class Log(BaseModel):
    timestamp: datetime = datetime.now()  # Fixed to when the server started.
```

Good:

```python
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class Log(BaseModel):
    # Evaluated every time a model is created.
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

## 6. Serialization

When you convert your model to JSON (e.g., sending a response in FastAPI), Pydantic converts datetime objects to strings.

If you need a specific output format (that isn't standard ISO), strictly separate your **Internal Model** from your **Response Model**, or use a serialization serializer.

```python
from pydantic import BaseModel, field_serializer

class Meeting(BaseModel):
    when: datetime

    @field_serializer('when')
    def serialize_dt(self, dt: datetime, _info):
        # Custom format only for outgoing JSON
        return dt.strftime('%Y-%m-%d %H:%M')
```

## Summary Checklist

| Feature | Recommendation | Why? |
| --- | --- | --- |
| **Type** | `AwareDatetime` | Prevents timezone confusion. |
| **Defaults** | `Field(default_factory=...)` | Prevents stale timestamps. |
| **Validation** | `@field_validator` | Enforces logic (e.g., "date must be future"). |
| **Format** | ISO 8601 | Universal standard, reduces parsing errors. |
| **Storage** | UTC | Standardizes database entries. |

## 7. Complete Example

Here is a complete, production-ready example using Pydantic V2 features.

```python
from datetime import datetime, timezone
from pydantic import BaseModel, Field, AwareDatetime, field_validator

class Appointment(BaseModel):
    # Enforce timezone metadata.
    start_time: AwareDatetime

    # Use default_factory for creation times.
    created_at: AwareDatetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    description: str

    # Business validation.
    @field_validator('start_time')
    @classmethod
    def validate_future_date(cls, v: datetime) -> datetime:
        # Ensure comparison is timezone-aware.
        if v < datetime.now(timezone.utc):
            raise ValueError('Appointment must be in the future')
        return v

# Valid input: ISO string with timezone.
data = {
    "start_time": "2030-12-01T14:00:00Z",
    "description": "Dentist"
}
appt = Appointment(**data)
print(f"Success: {appt.start_time.isoformat()}")

# Invalid input: naive datetime.
try:
    Appointment(start_time=datetime(2030, 12, 1, 14, 0), description="Fail")
except Exception as e:
    print(f"\nCaught Expected Error: {e}")
```
