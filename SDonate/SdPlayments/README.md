# SdPlayments

SdPlayments is an original Bukkit/Spigot API plugin foundation for SDonate. It is not a repackaged copy of another plugin.

## Compatibility target

- Bukkit-compatible Spigot and Paper servers, Minecraft 1.16.5 and later.
- Built with JDK 21 and compiled to Java 8 bytecode against the 1.16.5 API to keep the plugin's API surface compatible with older server runtimes.
- Later Minecraft/server releases may require a newer Java runtime to run the server itself. The plugin does not change that server requirement.
- Compatibility with every future Minecraft version cannot be guaranteed until tested against that server release.

## Build

Install JDK 21 and Maven, then run:

```text
mvn package
```

The JAR is created in `target/`. The Spigot API dependency is provided by the Minecraft server and is not bundled.

The website's stable download is the built `0.1.0` foundation JAR. The website does not publish a beta build.

## Current state

This is a safe foundation, not a payment processor. The SDonate project currently has no backend/API, so the plugin does not poll for orders, accept payment callbacks, or grant purchases. Its commands are:

- `/sdplayments status` — show local configuration status.
- `/sdplayments reload` — reload local configuration.
- `/sdplayments test <player>` — send a clearly labelled test message; it does not create a purchase or grant anything.

All commands require the operator permission `sdplayments.admin`.

## Before real payments

Implement a server-side SDonate API with authenticated order retrieval, replay protection, and acknowledgement only after successful delivery. The API token must remain on the server. Do not trust a payment result or purchase command supplied by a player or browser. Use HTTPS for the API; the plugin rejects non-local HTTP endpoints.
