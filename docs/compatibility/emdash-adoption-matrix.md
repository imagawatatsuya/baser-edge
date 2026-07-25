# EmDash採用マトリクス v0.2

EmDashは汎用実装の参照元であり、製品ドメインの正本ではない。

| EmDash領域 | 判断 | baserEdge での扱い |
|---|---|---|
| TypeScript monorepo | Adopt | Package境界とstrict TypeScriptを採用 |
| D1 / SQLite adapter | Adapt | baser domain向けRepositoryへ変換 |
| R2 / S3 signed upload | Adopt候補 | Asset pipelineで採用予定 |
| Revision token / optimistic locking | Adopt | `baseRevisionId` と `lockVersion` で実装 |
| Passkey / WebAuthn | Adopt候補 | Human認証の第一候補 |
| MCP server | Adapt | baserCMS domain commandだけを公開 |
| CLI | Adapt | Site Tree、Page、Blog、Migration中心にする |
| Agent Skills | Adapt | baserEdge 運用 Skill（レガシー baserCMS 移行 Skill は baserEdge コア外） |
| Portable Text | Adapt | Structured Documentの参考。独自Block契約を維持 |
| Plugin capability manifest | Adapt | 任意の認可上書きや無制限migrationを禁止 |
| Dynamic Worker sandbox | Adopt候補 | v0.5以降の隔離Extensionに検討 |
| Collection中心モデル | Reject as core | Blog/Custom Contentの内部部品には利用可能 |
| Astro integration | Adopt as renderer option | 唯一の製品形態にはしない |
| AI/CLIから直接publish | Reject by default | Approval必須ポリシーを強制 |
| 管理画面で即時schema ALTER | Reject by default | Proposal、影響分析、承認を要求 |
| WordPress importer | Reference | baserCMS importerを別途実装 |

## Code adoption gate

EmDashコードをコピーする前に次を満たす。

1. baserCMS不変条件と衝突しない。
2. 同等品質の独自実装より保守コストを下げる。
3. MIT noticeと出典をファイル単位で残せる。
4. 上流更新を取り込む方針がある。
5. Cloudflare以外のDomain層へ依存を漏らさない。
