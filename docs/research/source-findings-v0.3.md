> **履歴（調査メモ v0.3）:** 当時のソース調査です。製品の正本は [product-requirements-v0.4.md](../requirements/product-requirements-v0.4.md) と [relationship-to-basercms.md](../compatibility/relationship-to-basercms.md)。以下の「baserCMS remains the product source of truth」は **v0.3 時点の記述** で、現行方針ではありません。

# Source findings v0.3

## baserCMS

baserCMS remains the product and domain source of truth **(v0.3 snapshot only; superseded by ADR-0021 / v0.4).** v0.3 preserves its Content Manager-centered model while replacing file-path media references and session-dependent previews with Asset IDs and Revision-pinned PreviewSessions.

## BurgerEditor

BurgerEditor remains the main editing-behavior and migration-format reference. v0.3 does not redistribute its source. Structured Document Asset references are an original replacement for BurgerEditor's embedded file paths.

## EmDash

EmDash remains a generic implementation reference. Its use of Cloudflare-native media, revision and agent infrastructure informed the adoption matrix, but no EmDash source file is copied in v0.3.

## Cloudflare platform

v0.3 defines adapters for D1 and the R2 Worker binding. The implemented upload path is a baserEdge signed Worker endpoint that writes through the R2 binding. It is not a copied EmDash implementation and is not yet an S3-compatible direct presigned upload.

## Code provenance

No baserCMS, BurgerEditor or EmDash source file is copied into v0.3. The implementation is original and uses those projects as behavioral and architectural references.
