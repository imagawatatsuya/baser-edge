# ADR-0018: Plugins use immutable releases, explicit capability grants and isolated execution

- Status: Accepted
- Date: 2026-07-25

## Context

baserCMS gains much of its value from plugins, including standard Blog, Mail and Custom Content modules and third-party extensions such as BurgerEditor. Directly porting the PHP plugin model would allow arbitrary code, filesystem mutation, direct SQL, protection bypass and request-global behavior inside the CMS process.

Removing plugins entirely would also stop this from being a serious baserCMS migration. EmDash and Cloudflare Workers for Platforms demonstrate useful generic patterns: manifests, requested capabilities, versioned packages and isolated Workers. Those mechanisms may be adopted without replacing the baserCMS product model.

## Decision

1. Plugin remains a first-class Workspace domain object.
2. every executable version is an immutable PluginRelease with Manifest, Bundle descriptor and release hash.
3. Manifest capabilities and network hosts are requests, not grants.
4. a Human principal explicitly activates a requested subset for a Workspace or Site.
5. Agents cannot register releases or activate plugins under the default policy.
6. first-party Trusted releases execute only pre-registered host handlers.
7. third-party Sandboxed releases use a Workers for Platforms dispatch adapter.
8. network-enabled sandbox execution fails closed unless an Outbound Worker enforcement boundary is configured.
9. hooks and routes receive minimal typed payloads, not direct D1/R2 bindings or CMS internals.
10. pre-commit hooks may block; post-commit hooks must continue and only report failure.
11. PluginRelease rows are immutable in both API shape and D1 triggers.
12. existing baserCMS plugins are diagnosed and decomposed; PHP is never executed by the migration tool.

## Consequences

### Positive

- preserves the baserCMS plugin/module concept.
- separates package requests from operator consent.
- permits Site-specific activation and later rollback history.
- gives third-party code a process and resource boundary.
- keeps AI-created code from silently entering the trusted host.
- supports audit of exactly which release and grant handled an operation.
- makes unsafe baserCMS plugin assumptions visible during migration.

### Negative

- existing PHP plugins cannot run without conversion.
- Trusted adapters still require host review and deployment.
- Workers for Platforms and Outbound Workers add operational complexity.
- declared storage and frontend extensions need additional host services.
- package signing, registry and supply-chain scanning remain future work.

## Rejected alternatives

### Execute existing PHP plugins through a compatibility runtime

Rejected because it would preserve filesystem, SQL and arbitrary-code assumptions and create a large untrusted runtime inside the CMS.

### Treat every plugin as a normal npm dependency

Rejected because install-time scripts, transitive dependencies and full host authority conflict with explicit consent and supply-chain isolation.

### Use only Trusted plugins

Rejected because third-party and AI-generated extensions need stronger isolation than code review alone.

### Trust the plugin to obey `allowedHosts`

Rejected because a JSON allowlist is advisory. Actual egress must be intercepted by an Outbound Worker or equivalent host boundary.

### Allow post-publish hooks to block

Rejected because publication has already committed. Returning a blocking error would misrepresent state and encourage unsafe rollback assumptions.
