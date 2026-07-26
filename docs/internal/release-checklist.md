# リポジトリを public にする前（公開チェックリスト）

> **Internal:** メンテナ向け。製品仕様ではない。[docs/README.md](../README.md)

未完成のまま public にすると、Watch している人へ GitHub 通知が届いたり、製品の完成度について期待値がずれることがあります。**公開のタイミングと関係者への共有**を整理するためのメモです。

## 推奨チェックリスト

1. **README** にプレビュー／未完成である旨を明記する（[relationship-to-basercms.md](../compatibility/relationship-to-basercms.md) へのリンク推奨）
2. **関係するメンテナ・組織**へ、公開予定または公開した旨を共有する（通知が届く可能性があるため）
3. 一般向けお試しは[cloudflare-one-click-trial.md](../deployment/cloudflare-one-click-trial.md)のOAuth trial-host、Queue、固定リリース、Operations削除が揃ってから案内する
4. GitHub Pagesは案内ページとして利用できるが、Deployボタンは開発者向けフォールバックとする

## public 前に private のまま進める場合

- Collaborator 招待、各自の `prove:cloudflare`、`dev:onboarding` で十分なことが多い
- public は **一般公開のお試し** が必要になった段階で切り替えてよい

## 別リポジトリにする場合

お試し用テンプレートだけ `baser-edge-trial` 等として public にし、本開発は private のまま、という運用も可能です。

## 履歴について

public 化後、読者が **旧版ドキュメントや Git 履歴** を遡ることがあります。正本は [docs/README.md](../README.md) に集約しています。

## 履歴に個人的・不適切な発言が残っている場合（必読）

コミットメッセージ、差分、Issue/PR コメント、Draft 含む **Git 履歴のどこか**に、公開したくない言葉ややりとりがあるなら:

| やること | 理由 |
|----------|------|
| **同じ repo の Visibility → Public はしない** | 公開と同時に **全コミット・（その repo の）Issue/PR が検索可能**になる |
| **履歴付きの `git push` / GitHub Import もしない** | 新 URL でも履歴は丸ごと付いてくる |
| **`npm run prepare:public-snapshot:git` で出力したツリーのみ push** | 公開されるのは **その1スナップショットのファイル内容だけ**（`release/public-snapshot/`） |
| **旧 private repo は public にしない** | Archive して **private のまま**残すか、組織ポリシーで削除 |

`git filter-repo` で文言だけ消す方法は、取りこぼし・force-push・GitHub キャッシュ・フォークの話が残りやすく、**「一切知られたくない」要件には向かない**ことが多い。履歴ごと捨てる B が現実的。

公開用コミットに **載せたくないメンテナ向け文書**（この `docs/internal/` など）は、push 前に除外するか別 private repo にだけ置く。

## 新しいリポジトリにするか、同じ repo を public にするか

**どちらも一般的。** ただし上記の「履歴に不適切な発言」がある場合は **B のみ**。

| 方式 | よく使う場面 | メリット | デメリット |
|------|----------------|----------|------------|
| **A. 同じ repo で Visibility → Public** | ずっと1本の Git 履歴でよい、Issue/PR を残したい | 設定1つ、URL 不変、CI そのまま | **全コミット履歴が公開**される。Watch している人に通知が届くことがある |
| **B. 新規 public repo（履歴なし or 1コミット）** | private 時代のコミット・メッセージを出したくない | 読者が `git log` で遡れない。旧 private の Watch には **公開通知が行かない**（別 repo だから） | Issue/PR/Stars は引き継げない。2 repo 運用 or 旧 repo は archive |
| **C. 新規 public + 履歴付き push** | フォーク公開だが org を分けたい | 履歴は残るが **別 URL・別 Watch** | 履歴は依然として公開。中身の整理は別途必要 |
| **D. public は「リリース用」だけ** | 本開発は private、お試し用サブツリーだけ | `baser-edge-trial` 等に Deploy ボタン用だけ公開 | 同期・二重メンテ |

### みんながよくやる「きれいな初回公開」（B の例）

1. 公開したいツリーの状態で作業ディレクトリを用意（`npm run check` 済み）
2. 新しい GitHub リポジトリ `baser-edge`（または製品名）を **空で** 作成
3. 履歴を捨てて1コミットで載せる例:

```bash
# 現在の作業ツリーだけを新 repo の初回コミットにする（履歴は引き継がない）
rm -rf .git
git init
git add -A
git commit -m "Initial public release (preview)"
git branch -M main
git remote add origin git@github.com:ORG/baser-edge.git
git push -u origin main
```

4. 旧 **private** repo は GitHub で **Archive** するか、README に「開発は org/private-repo へ移行」と書いて閉じる

`git filter-repo` / BFG で **履歴だけ改変**して同じ repo を public にする手もあるが、force-push と協調が必要で、B より手間が多いことが多い。

### baserEdge での実務的なおすすめ

- **private 時代の履歴を一切出したくない（コミット・Issue 等）** → **B のみ**。旧 repo は **private のまま** Archive
- **履歴・Issue をこの repo に残してよい** → **A**（public 化）+ [docs/README.md](../README.md) の正本整理
- **お試しだけ先に出す** → **D**（小さい public repo）+ 開発本体は private のまま

公開の正本ドキュメントはどの方式でも同じ: [docs/README.md](../README.md)、[relationship-to-basercms.md](../compatibility/relationship-to-basercms.md)、[product-requirements-v0.4.md](../requirements/product-requirements-v0.4.md)。

## 公開後のオープン開発（正本: public baser-edge）

開発の正本は **https://github.com/imagawatatsuya/baser-edge**（public）。Preview のままコミットを公開してよい。

| やること | やらないこと |
|----------|----------------|
| `origin` → public `baser-edge` のみ | private 時代の履歴付き `main` をそのまま `git push`（**漏洩**） |
| 通常どおり commit → push | 公開用に毎回 `prepare:public-snapshot`（履歴を捨てたいときだけ） |
| コミットメッセージは公開前提で書く | `baser-edge-private` を Public にする |

**ローカルがスナップショット公開より前の private 履歴をまだ `main` に持っている場合**（`git log` が public の1コミットより長い）:

```powershell
git fetch origin
git stash push -u -m "wip before public main"
git reset --hard origin/main
git stash pop
# 競合を直したあと
npm run check
git add -A
git commit -m "Sync open development tree after public launch"
git push origin main
```

以降はこの `main` から積み上げる。旧コミットはローカル reflog と `baser-edge-private` にだけ残る（public に push しなければ漏れない）。

