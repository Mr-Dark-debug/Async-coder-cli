# Sharing sessions

```sh
async-coder share SESSION_ID --output session.html
async-coder share SESSION_ID --format json --output session.json
async-coder share-view session.json > view.html
```

HTML is self-contained and read-only. Versioned JSON preserves messages, tool calls, usage and diffs. Import validates its schema without creating a runnable session or executing tools. HTML escapes transcript markup. Existing destination files are refused.

Exports include the selected transcript, possibly private file/command content. Review before distribution. Existing hosted sharing depends on its upstream service; no `share.async-coder.dev` service is provisioned by this release.
