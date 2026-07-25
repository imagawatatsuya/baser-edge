# Blog architecture v0.4

## Goal

Migrate baserCMS Blog without creating an isolated second CMS. Blog and Article remain ordinary site-tree content while collection, taxonomy, listing and feed concerns live in `blog-kernel`.

## Domain split

```text
Content Kernel
  Folder
    Blog content item
      Article content item

Blog Kernel
  BlogCollection
  BlogArticleRecord
  Taxonomy
  Term
  RevisionTaxonomyValue
```

The Content Kernel owns identity, route, tree position, Revision, approval and publication. The Blog Kernel owns Blog-specific grouping and classification.

## Parent rules

- Page, Folder, Alias and Blog may be placed at the root or below a Folder.
- Article must be directly below a Blog.
- A Blog may contain Article only.
- An Article cannot be reparented to another Blog through the generic Content Manager.

These rules are enforced by both service code and D1 integrity checks.

## Revision-bound classification

Category and Tag values belong to a Revision. A newer Revision without an explicit taxonomy value inherits from its `basedOnRevisionId`. An explicit empty array removes all terms for that taxonomy.

This ensures that the public listing and RSS reflect the classification approved with the exact published Revision.

## Public projections

```text
/blog-path                         Blog listing
/blog-path/category/:slug          Category listing
/blog-path/tag/:slug               Tag listing
/blog-path/rss.xml                 RSS 2.0
/blog-path/article-slug            Article page
```

Only active Content Items with a `publishedRevisionId` enter these projections.

## Safety limitations

Generic copying of Blog/Article content is currently rejected. Copying only the Content Tree would omit Collection, Taxonomy and classification metadata. Cross-Blog Article moves are rejected for the same reason. A later module-aware operation must duplicate or migrate all metadata atomically.
