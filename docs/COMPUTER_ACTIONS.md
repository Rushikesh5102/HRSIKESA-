# HṚṢĪKEŚA — Structured Computer Actions

## Supported Action Types (21 Actions)

| Action Type | Parameters | Preconditions | Verification Default |
|---|---|---|---|
| `MOVE` | `x`, `y` coordinates | Target within screen bounds | Screen cursor position |
| `CLICK` | Target / coordinates | Target visible & enabled | `ELEMENT_PRESENT` / `UI_TREE_CHANGED` |
| `DOUBLE_CLICK` | Target / coordinates | Target visible & enabled | `UI_TREE_CHANGED` |
| `RIGHT_CLICK` | Target / coordinates | Target visible & enabled | Context menu opened |
| `TYPE` | `text`, optional target | Target focused & enabled | `TEXT_PRESENT` / `ELEMENT_VALUE` |
| `KEYPRESS` | `key` (`Enter`, `Tab`, `Escape`) | Active window focused | Key action event completed |
| `HOTKEY` | `keys` (`Ctrl+S`, `Alt+F4`) | Active window focused | Expected window/tree change |
| `SCROLL` | `deltaX`, `deltaY`, target | Target scrollable | Scroll position shifted |
| `DRAG` | `source`, `target` | Source/Target visible | Position shifted |
| `SELECT` | `value`, target dropdown | ComboBox/List visible | Item selected |
| `FOCUS` | Target window / element | Window exists | `FOCUS_CHANGED` |
| `OPEN` | `path` | Path exists | Window matching path opened |
| `CLOSE` | Application / window | Window exists | `WINDOW_ABSENT` |
| `MINIMIZE` | Window handle | Window is visible | `isMinimized = true` |
| `MAXIMIZE` | Window handle | Window is visible | `isMaximized = true` |
| `RESTORE` | Window handle | Window is minimized | `isForeground = true` |
| `WAIT` | `durationMs` | None | Time elapsed |
| `LAUNCH` | `appName`, `args` | Executable in allowlist | `PROCESS_RUNNING` / `WINDOW_PRESENT` |
| `TERMINATE` | `processName`, `pid` | Not protected process | `PROCESS_EXITED` |
| `COPY` | Target element | Element selectable | Clipboard populated |
| `PASTE` | Target element | Target editable | `TEXT_PRESENT` in target |
