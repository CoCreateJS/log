# API

## Server entry

The server default export exposes `init(serverInstance)`. Initialization
preserves Cluster's current behavior: it attaches `server.log`, loads logger
configuration, starts console capture, relays worker logs, and flushes recent
logs through server CRUD.

## Client entry

The browser default export exposes `init(options)`. Initialization creates a
logger without installing listeners. Capture begins only after `start()`.

Options:

| Option | Default | Description |
| --- | --- | --- |
| `includeModules` | `[]` | Stack path fragments that must match for an entry to be queued. |
| `sendLogs` | unset | Async callback invoked with each batch. |
| `maxBatchSize` | `20` | Maximum entries passed to the sender at once. |
| `maxQueueSize` | `1000` | Maximum in-memory entries retained. |
| `flushIntervalMs` | `1500` | Interval between batch flush attempts. |

The returned logger exposes:

| Method or property | Behavior |
| --- | --- |
| `start()` | Installs `console.error`, `error`, and `unhandledrejection` capture. |
| `stop()` | Removes capture hooks and attempts to flush remaining entries. |
| `capture(error, metadata)` | Reports a selected caught error if its stack matches. |
| `flush()` | Sends the next queued batch when a sender is configured. |
| `queue` | In-memory queue of accepted entries. |

Entries without a stack matching `includeModules` are ignored. Failed sends
return that batch to the queue. No client transport is selected by this package.
