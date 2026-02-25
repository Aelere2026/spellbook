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
    close_time: Optional[datetime]
    
    # --- Outcomes ---
    outcomes: list[str]              # ["Yes", "No"] or ["Trump wins", ...]
    
    # --- Grouping / hierarchy ---
    event_title: Optional[str]       # parent event label
    series_title: Optional[str]      # recurring series label
    
    # --- Raw passthrough (for debugging) ---
    raw: dict = field(default_factory=dict, repr=False)