---
name: write-tests
description: Write meaningful tests for observable behavior with the project's existing framework.
---

Inspect existing tests, fixtures, scripts, and repository instructions before choosing a test approach.
Exercise the actual implementation with representative inputs, edge cases, and meaningful regression scenarios.
Prefer real temporary filesystem or protocol fixtures. Mock external services only when necessary.
Avoid tests that restate implementation logic. Run the affected package's tests and report exact outcomes.
