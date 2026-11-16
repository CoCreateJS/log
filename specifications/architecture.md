# Architecture

`@cocreate/log` provides separate client and server implementations selected
by package export conditions. The Node and default exports resolve to
`src/server.js`; browser bundlers resolve to `src/client.js`. Explicit
`@cocreate/log/server` and `@cocreate/log/client` subpaths are also available.

The server implementation preserves the logger previously owned by Cluster.
It captures console output, relays worker entries to the primary process, and
persists a bounded recent-log buffer through server CRUD.

The client implementation is opt-in and is not initialized by CoCreate Client.
It filters reports by configured stack path fragments, captures error-level
events, and hands batches to a caller-provided transport. This keeps browser
transport and database schema decisions outside the logger package until a
client integration is selected.

The two implementations currently share package-level purpose and log-entry
fields, while transport, configuration, lifecycle, and runtime integrations
remain environment-specific.
