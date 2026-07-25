# Workers for Platforms plugin runtime deployment boundary

## Status

The repository contains a typed adapter and mock-tested protocol. It has not yet been deployed to a real Cloudflare Workers for Platforms namespace.

## Required production components

```text
API Worker
  PLUGIN_DISPATCHER binding
      -> Dispatch Namespace
          -> one user Worker per PluginRelease
          -> Outbound Worker for every external fetch
```

The API Worker selects a script name derived from the immutable PluginRelease ID and supplies CPU/subrequest limits when dispatching.

## Outbound policy

A plugin receiving `network:request` must not be trusted to enforce its own Host allowlist. Configure an Outbound Worker on the dispatch namespace and reject destinations outside the Activation allowlist.

Only after that enforcement is deployed and tested may the host set:

```text
PLUGIN_OUTBOUND_POLICY_ENFORCED=true
```

Without the flag, every network-enabled sandbox invocation fails with `PLUGIN_OUTBOUND_POLICY_REQUIRED`.

## Workflows

Long-running approvals, schedules and orchestration remain in host Cloudflare Workflows. User Workers in Workers for Platforms namespaces are not the place to run the project's Workflows orchestration. Plugins should request host Commands through bounded APIs instead.

## Still required

- package upload and immutable script deployment
- release ID to script deployment registry
- Outbound Worker implementation and tests
- runtime credentials for host callbacks
- log/metric export
- invocation concurrency and rate limits
- package deletion/retention policy
- rollback and incident disable switch

## Primary references

- Cloudflare Workers for Platforms overview and architecture
- Dynamic dispatch Workers
- Outbound Workers
- Custom limits for user Workers
