# CoCreate Log

`@cocreate/log` provides separate server and browser logging implementations
behind one package contract. The server implementation preserves the existing
Cluster logger, including console capture, worker relay, and server-state
persistence. The browser implementation is opt-in and is not initialized by
CoCreate Client.

See the [architecture](specifications/architecture.md) and [API contract](specifications/api.md).

## Package entry points

```js
// Node.js
import Log from '@cocreate/log';
```

Browser bundlers resolve the same package import to the client entry:

```js
// Browser
import Log from '@cocreate/log';
```

Explicit subpath imports are available as `@cocreate/log/server` and
`@cocreate/log/client`.

## Server

Cluster initializes the server implementation with its server instance:

```js
this.log = await Log.init(this);
```

This retains the current server behavior and configuration. The server logger
captures console output, relays worker entries to the primary process, batches
them, and persists the recent log ring buffer through the server CRUD service.

## Client (available, not yet consumed)

The browser logger does nothing until `start()` is called. It accepts only
errors whose stack contains a configured module path. `sendLogs` is an
injected batch transport so the eventual client integration can choose its
CRUD/API route without coupling the logger to a database schema now.

```js
import Log from '@cocreate/log/client';

const clientLog = Log.init({
    includeModules: ['/src/components/'],
    sendLogs: async entries => {
        // Connect this to the selected client CRUD/API flow when adopted.
    }
});

clientLog.start();
```

The client implementation listens for uncaught errors and unhandled promise
rejections, and wraps `console.error` to capture error values. Calls to
`capture(error)` are available for selected component catch blocks. It does
not capture informational logs or errors without a matching module path.

Options:

| Option | Default | Purpose |
| --- | --- | --- |
| `includeModules` | `[]` | Stack path fragments allowed into the queue. |
| `sendLogs` | `undefined` | Async callback that receives each batch. |
| `maxBatchSize` | `20` | Maximum entries sent in one batch. |
| `maxQueueSize` | `1000` | Maximum entries held in memory. |
| `flushIntervalMs` | `1500` | Interval between flush attempts. |

Call `stop()` to remove listeners and flush the remaining queue. If sending a
batch fails, its entries are returned to the in-memory queue.

The browser data model, transport, and production stack format still need
review before the client logger is enabled in an application.
