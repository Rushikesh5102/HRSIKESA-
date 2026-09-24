# HṚṢĪKEŚA — Computer Observation Engine

## Perception Architecture
The Observation Engine transforms complex Windows desktop state into a structured, bounded, queryable hierarchy.

```
Desktop Root
├── ScreenMetrics { width: 1920, height: 1080 }
├── Active Window (Foreground)
│   ├── Window Observation (hwnd, title, processName, PID, bounds)
│   └── Control Hierarchy (bounded to maxDepth=3, maxNodes=100)
│       ├── MenuBar (File, Edit, View, Help)
│       ├── Edit / Text Area
│       └── Toolbars / Buttons
├── Visible Background Windows
└── State DOM Hash (MD5)
```

## Bounded Traversal Parameters
- **`maxDepth`**: Limits recursive UI Automation child descent (default: `3`).
- **`maxNodes`**: Caps total elements collected per observation to avoid memory bloat (default: `100`).
- **`maxTextLength`**: Truncates lengthy control text values (default: `200` chars).
- **`captureScreenshot`**: Ephemeral capture stored only during active verification.

## Deterministic DOM Hashing
Every observation computes a deterministic hash of the active control tree:
$$\text{DOM Hash} = \text{MD5}\Big(\sum_{e \in \text{Controls}} \text{name} + \text{type} + \text{enabled} + \text{bounds}\Big)$$
This enables instant change detection and runaway loop prevention.
