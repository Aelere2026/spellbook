# models.py
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

@dataclass
class NormalizedMarket:
    # --- Identity ---
    platform: str                    # "polymarket" | "kalshi"
    platform_id: str                 # conditionId / ticker
    
    # --- Core text (used for matching) ---
    title: str                       # canonical question title
    description: str                 # full description text
    
    # --- Time ---
    close_time: Optional[datetime]   # when trading stops (platform-specific)

    # --- Outcomes ---
    outcomes: list[str]              # ["Yes", "No"] or ["Trump wins", ...]

    # --- Grouping / hierarchy ---
    event_title: Optional[str]       # parent event label (Polymarket only; None for Kalshi)
    series_title: Optional[str]      # recurring series label

    # --- Market type flags ---
    neg_risk: bool = False           # Polymarket negRisk sub-leg (one option in a multi-choice group)
    resolution_date: Optional[datetime] = None  # when the market actually resolves (vs close_time = trading stop)
    slug: Optional[str] = None       # URL slug (Polymarket only)
    category: Optional[str] = None
    fee_rate: float = 0.04
    
    # --- Raw passthrough (for debugging) ---
    raw: dict = field(default_factory=dict, repr=False)