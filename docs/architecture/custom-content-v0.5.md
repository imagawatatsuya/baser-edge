# Custom Content architecture v0.5

## Goal

Migrate baserCMS Custom Content as a standard site-tree module without turning the shared Content Kernel into a schema-specific database engine.

The baserCMS domain remains recognizable:

```text
Custom Field master
        ↓
Custom Table + linked fields
        ↓
Custom Content placed in the site tree
        ↓
Custom Entries
        ↓
List and detail routes
```

The Content Kernel owns the Custom Content root item, route, tree position, root Revision, approval and publication. `custom-content-kernel` owns field definitions, table schemas, entry Revisions, validation, entry approval and public projections.

## Domain split

```text
Content Kernel
  Folder
    Custom Content root
      route, root document, Revision, approval, publication

Custom Content Kernel
  CustomFieldDefinition
  CustomTableDefinition
  CustomTableField
  CustomContentDefinition
  CustomEntry
  CustomEntryRevision
  CustomEntryApproval
```

A content table may be bound to one or more Custom Content roots. A master table can be defined, but v0.5 does not yet expose independent master-entry management.

## Field types

v0.5 defines typed contracts for:

- text
- textarea
- integer
- decimal
- boolean
- date
- datetime
- email
- tel
- select
- multiselect
- asset
- richtext

Validation happens before a Revision is committed. Unknown fields, missing required fields, invalid options and duplicate unique values are rejected.

`richtext` stores the same Structured Document format used by Page and Article. `asset` stores an Asset ID rather than a file path.

## Schema evolution

Attaching a field increments `custom_tables.schema_version`. Every entry Revision records the schema version used for validation.

v0.5 intentionally supports additive field attachment only. Rename, detach, reordering updates, type conversion and data migration require an explicit schema-change workflow and are not represented as complete.

## Revision and publication model

Custom Entry values are immutable Revision data:

```text
CustomEntry
  workingRevisionId
  publishedRevisionId
  lockVersion

CustomEntryRevision
  basedOnRevisionId
  schemaVersion
  values
  contentHash
```

A stale `baseRevisionId` or `expectedLockVersion` is rejected. Publication requires an approved request bound to the exact Revision ID and hash. Agent principals may create and request publication but are denied direct publication by the default authorization policy.

## D1 storage

The original baserCMS approach creates physical data columns for linked Custom Fields. v0.5 adapts this to the shared immutable-Revision model:

```text
custom_entry_revisions.values_json
  authoritative immutable value set

custom_entry_values
  typed projection rows for field-oriented indexing
```

The JSON value set is the source of truth. Projection rows contain text, numeric, integer, boolean, timestamp or JSON representations and can be rebuilt from Revisions.

The current public query implementation still reconstructs entry snapshots and filters them in the service layer. A later D1 query planner will use `custom_entry_values` directly for large datasets.

## Public routes

```text
/custom-path
/custom-path?q=keyword
/custom-path?field.price=1000
/custom-path?page=2
/custom-path/view/:slug
/custom-path/view/:entryId
```

Only active entries with a published Revision appear. Numeric-only slugs are rejected so that ID and slug lookup remain unambiguous.

## Safety limitations

- Generic Content Manager copy rejects Custom Content roots because copying only the tree would lose schema binding and entries.
- Master table definitions exist, but master entry CRUD and hierarchy UI are not complete.
- Schema mutation beyond additive field attachment is not complete.
- Relation fields between entries or master tables are not implemented.
- Typed D1 projection rows are stored, but server-side projection query planning is not yet complete.
- Custom Entry trash, restore, hard delete, scheduling and expiration are not complete.
