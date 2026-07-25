# Plugin architecture v0.8

## Objective

Preserve the baserCMS idea that CMS functionality is divided into plugins, without restoring arbitrary PHP execution, mutable installation scripts or unrestricted access to the application process.

A Plugin is a versioned capability request. Human activation converts a requested subset into an explicit grant. Execution occurs either through a first-party Trusted adapter or a separately isolated sandbox runtime.

## Domain model

```text
Plugin
  Workspace-owned identity
  key, name, trust classification, state

PluginRelease
  immutable semantic version
  exact Manifest
  exact Bundle descriptor
  release hash and source provenance

PluginActivation
  Workspace or Site scope
  granted Capability subset
  allowed network Host subset
  activation/deactivation history

PluginInvocation
  Release and Activation
  Hook or Route
  request ID, result, duration, error code
```

Manifest is not authorization. It describes the maximum access a release requests. Activation stores the actual authority granted by a human.

## Trust classes

### Trusted

Trusted plugins are first-party or manually migrated adapters reviewed as part of the host application. Their handlers must already be registered in the host runtime. A PluginRelease cannot make the host dynamically import arbitrary code.

Use Trusted only when a baserCMS plugin cannot be decomposed into declarative blocks, routes and isolated tasks without losing required platform behavior.

### Sandboxed

Sandboxed plugins use a `worker-module` bundle and the Workers for Platforms dispatch adapter. The host chooses the dispatch script name and supplies CPU and subrequest limits.

The sandbox protocol receives only:

- handler name
- bounded event or route payload
- request ID
- Workspace/Site scope
- granted capabilities
- granted network hosts

The plugin does not receive D1, R2, session secrets or the CMS service graph directly.

## Egress policy

Passing `allowedHosts` in JSON is not a security boundary. A production dispatch namespace must attach an Outbound Worker that intercepts plugin `fetch()` calls and applies the actual allowlist.

The v0.8 adapter therefore fails closed for network-enabled invocations unless `networkPolicyEnforced` is true. The API Worker derives this from `PLUGIN_OUTBOUND_POLICY_ENFORCED=true`. Operators must never set it without a real Outbound Worker.

## Lifecycle ordering

```text
publish command
  -> normal authorization and exact Approval validation
  -> content.beforePublish plugin hooks
  -> publication commit and outbox
  -> content.afterPublish plugin hooks
```

`content.beforePublish` may block. `content.afterPublish` cannot block because the content is already committed. A manifest that declares a blocking post-commit hook is rejected.

Mail and Theme hooks are reserved in the Manifest contract but are not automatically dispatched by their kernels in v0.8.

## API route boundary

Plugin API routes are registered declaratively and invoked through the host path. The host:

- re-authorizes the calling principal
- resolves the active release for the Workspace/Site
- verifies `api:route` was granted
- matches exact method/path from the Manifest
- strips credentials and hop-by-hop headers
- strips cookie-setting and other unsafe response headers
- records Invocation history

## D1 storage

Migration `0008_plugins.sql` adds Plugin, Release, Activation and Invocation tables. PluginRelease rows are immutable through UPDATE and DELETE triggers. Activation inserts a new history row and closes the previous active release for the same Plugin and scope.

Plugin-owned data storage is only declared in v0.8. Direct arbitrary SQL is never granted. A later Host-managed storage service will map declarations to bounded namespaces or collections.

## baserCMS migration

Existing baserCMS plugins are statically analyzed and split into:

```text
Domain behavior
  preserve or adapt into baser Kernel services

Admin UI
  declarative admin page/widget or first-party UI module

Controller/API
  typed Plugin route or host Command

Event Listener
  typed lifecycle hook

Database/file access
  Host storage and Asset adapters

Theme/block behavior
  Component Manifest, Theme component or importer

Unsafe arbitrary execution
  reject or manually redesign
```

The supplied BurgerEditor report demonstrates why migration is not a mechanical PHP-to-JavaScript conversion: its filesystem, SQL, protection bypass and arbitrary HTML behavior require separate redesigns.

## Known incomplete areas

- real dispatch namespace deployment and upload pipeline
- Outbound Worker implementation
- registry, signatures, SBOM and provenance
- Plugin storage service
- UI bundle isolation
- Mail/Theme hook wiring
- Component and Content Type registrations
- upgrade, rollback and staged activation
