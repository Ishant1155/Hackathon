"""Small, dependency-free helpers shared by every layer."""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from statistics import pstdev
from typing import Iterable, Optional, Sequence

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ------------------------------------------------------------------ numbers
def is_missing(value) -> bool:
    return value is None or (isinstance(value, float) and math.isnan(value))


def rnd(value: Optional[float], digits: int = 1) -> Optional[float]:
    """Round half away from zero (like JavaScript's Math.round for positives)."""
    if is_missing(value):
        return None
    factor = 10**digits
    return math.floor(abs(value) * factor + 0.5) / factor * (1 if value >= 0 else -1)


def mean(values: Iterable[Optional[float]]) -> Optional[float]:
    vals = [v for v in values if not is_missing(v)]
    return sum(vals) / len(vals) if vals else None


def total(values: Iterable[Optional[float]]) -> float:
    return float(sum(v for v in values if not is_missing(v)))


def std(values: Sequence[Optional[float]], min_count: int = 3) -> Optional[float]:
    vals = [v for v in values if not is_missing(v)]
    return pstdev(vals) if len(vals) >= min_count else None


def pct_change(current: Optional[float], previous: Optional[float]) -> float:
    if is_missing(current) or is_missing(previous) or previous == 0:
        return 0.0
    return (current - previous) / abs(previous) * 100


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


# -------------------------------------------------------------------- dates
def to_date(value) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    return date.fromisoformat(str(value)[:10])


def iso(d: date) -> str:
    return d.isoformat()


def add_days(iso_date: str, n: int) -> str:
    return (to_date(iso_date) + timedelta(days=n)).isoformat()


def is_weekend(iso_date: str) -> bool:
    return to_date(iso_date).weekday() >= 5


def format_date(iso_date: Optional[str], weekday: Optional[str] = None, month: bool = True, year: bool = False) -> str:
    """Mirror the frontend's Intl formatting: 'Oct 30', 'Sat, Oct 24', 'Monday', 'Oct 30, 2026'."""
    if not iso_date:
        return "–"
    d = to_date(iso_date)
    if weekday == "long" and not month:
        return WEEKDAYS_LONG[d.weekday()]
    if weekday == "short" and not month:
        return WEEKDAYS_SHORT[d.weekday()]
    text = f"{MONTHS[d.month - 1]} {d.day}"
    if year:
        text += f", {d.year}"
    if weekday == "short":
        text = f"{WEEKDAYS_SHORT[d.weekday()]}, {text}"
    elif weekday == "long":
        text = f"{WEEKDAYS_LONG[d.weekday()]}, {text}"
    return text


def format_range(start: Optional[str], end: Optional[str]) -> str:
    if not start or not end:
        return "–"
    return f"{format_date(start)} – {format_date(end, year=True)}"


def parse_datetime(value) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))


def parse_optional_float(value) -> Optional[float]:
    if value in (None, "", "None", "nan", "NaN"):
        return None
    return float(value)


def parse_optional_int(value) -> Optional[int]:
    if value in (None, "", "None", "nan", "NaN"):
        return None
    return int(float(value))


def parse_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def compare(current: Optional[float], previous: Optional[float], digits: int = 1) -> dict:
    """Frontend `Comparison` object."""
    change = None if is_missing(current) or is_missing(previous) else current - previous
    return {
        "current": rnd(current, digits),
        "previous": rnd(previous, digits),
        "change": rnd(change, digits),
        "changePct": rnd(pct_change(current, previous), 1),
    }
