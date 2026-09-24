# HṚṢĪKEŚA — Computer Verification Engine

## Deterministic Verification Framework
HṚṢĪKEŚA adheres to the **Strict Non-Fabrication Rule**: an action is NEVER assumed to be successful until concrete observable evidence confirms the state change.

### Verification Strategies (13 Strategies)

1. **`WINDOW_PRESENT`**: Verifies that a window matching title or process name is visible.
2. **`WINDOW_ABSENT`**: Verifies that a window has closed.
3. **`ELEMENT_PRESENT`**: Verifies that a specific UI element exists in the active hierarchy.
4. **`ELEMENT_ABSENT`**: Verifies that an element has disappeared.
5. **`ELEMENT_VALUE`**: Verifies that an Edit control contains the expected text.
6. **`FOCUS_CHANGED`**: Verifies that the focused element or active window changed.
7. **`TITLE_MATCH`**: Verifies that active window title matches an expected regex or substring.
8. **`TEXT_PRESENT`**: Confirms that expected text appears in the UI subtree.
9. **`TEXT_ABSENT`**: Confirms that text is no longer present.
10. **`PROCESS_RUNNING`**: Checks operating system process table for running executable.
11. **`PROCESS_EXITED`**: Confirms process termination in OS process table.
12. **`UI_TREE_CHANGED`**: Validates that DOM tree hash differed between pre and post observation.
13. **`SCREEN_REGION_CHANGED`**: Verifies bounding box visual pixel delta.
