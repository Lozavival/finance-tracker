# External Interfaces Map

<!-- Replace this paragraph with a concise summary of the external integrations used or exposed by the application. -->
This document enumerates all external interfaces used or exposed by the <application name> application.

## Legend

- **Type**: The technology used for the interface (HTTP | File IO | Env Var | Storage | Other)
- **Direction**: Whether data flows in (Inbound), out (Outbound), or both ways (Bidirectional)
- **Identifier / Path**: Service name, endpoint, topic, file path, or variable
- **Payload in**: What data the app receives
- **Payload out**: What data the app sends
- **Errors**: How errors are handled (log, retry, swallow, rethrow, fallback)
- **Location**: Where in the code the interface is used
- **Purpose**: The functional purpose of the interface

## Table

| Type | Direction | Identifier / Path | Payload in | Payload out | Errors | Location | Purpose |
|------|-----------|-------------------|------------|-------------|--------|----------|---------|
| <Type> | <Direction> | <Identifier> | <Payload in> | <Payload out> | <Handling> | <File link> | <Functional purpose in one clear sentence> |

<!-- Keep rows sorted by Type and then Identifier / Path. -->
