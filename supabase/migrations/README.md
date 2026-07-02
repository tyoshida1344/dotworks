# supabase/migrations

DOTWORK の DB スキーマは、このディレクトリのマイグレーションで管理する（**唯一の正**）。
Supabase CLI が `*.sql` を**ファイル名の昇順**で適用し、適用済みは
`supabase_migrations.schema_migrations` テーブルで追跡する。`.md` は適用対象外。

## 命名規則

`YYYYMMDDHHMMSS_<ddl|dml>_<name>.sql`。タイムスタンプ順がそのまま適用順になる。
`<ddl|dml>` で種別が一目で分かるようにする（DDL=スキーマ定義、DML=データ投入。原則この2つは別ファイルに分ける）。
`npx supabase migration new <ddl|dml>_<name>` で生成すれば命名・順序を間違えない。
各ファイルの先頭にも `-- 種別: DDL/DML` のコメントを書く。

## ルール

- **適用済みのマイグレーションは編集しない**（環境間で履歴がずれて壊れる）。変更は必ず新しいファイルを足す。
- 1 ファイル 1 目的（スキーマ変更とデータ投入は分ける）。
- 破壊的変更（`drop` / 型変更など）は既存データへの影響を確認してから入れる。

## 追加と適用

```bash
npx supabase migration new <name>   # 新規ファイルを作成 → DDL（create/alter table …）を書く
npx supabase db reset               # ローカル: 全マイグレーション再適用＋シード（破壊的）
npx supabase migration up           # ローカル: 未適用分のみ適用
npm run db:push                     # 本番: ガード付きで未適用分を適用（要 npx supabase link）
```

> 本番への適用は**必ず `npm run db:push`** を使う（生の `supabase db push` は使わない）。
> dry-run＋project ref の入力確認で誤適用を防ぐ。詳細は [`OPERATIONS.md`](../../OPERATIONS.md)「本番への適用ガード」。

## 本番とローカルの違い

| | ローカル | 本番（リンク先） |
|---|---|---|
| 主コマンド | `db reset`（全再適用＋シード・**破壊的**）／ `migration up`（未適用のみ） | `npm run db:push`（ガード付き・未適用のみ・非破壊） |
| 接続 | `supabase start`（Docker） | `supabase link`（project ref＋DB パスワード）必須 |
| 適用範囲 | reset は毎回ゼロから全再構築 | 既適用は再実行せず差分のみ |

- `db reset` はローカル DB を作り直す前提。本番に同等の操作（`db reset --linked`）はデータ全消去なので通常使わない。**本番は常に `npm run db:push`（ガード付き）**。
- **`seed.sql` はローカルの `db reset` でしか流れない**（`db push` では流れない）。本プロジェクトの既定レッスンは *マイグレーションとして* 同梱しているので本番にも入る（→「シード方針」）。
- 既適用マイグレーションを編集すると、ローカル `db reset`（ゼロから）には反映されるが本番 `db push` には反映されず**差分がずれる**。だから既適用は編集せず新規に足す。
- 反映前の確認: `npx supabase migration list`（ローカル／リモートの適用状況を比較）、`npx supabase db push --dry-run`（適用予定の確認）。

## シード方針

全環境に必要な初期データ（既定レッスン）は `seed.sql` ではなく**マイグレーションとして同梱**する。
理由は `db push` で本番にも入ること。**テーブルが空のときだけ入れる**方式で冪等にしており、
適用済みマイグレーションは再実行されないため、各環境で編集・削除した内容が後続の適用で復活することはない。

---

ローカルの起動・接続情報・利用方法は [`README.md`](../../README.md)「レッスン管理（Supabase）」、
本番セットアップ・適用・デプロイは [`OPERATIONS.md`](../../OPERATIONS.md) を参照。
