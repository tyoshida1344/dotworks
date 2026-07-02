-- 種別: DML（初期データ投入）
-- 既定の 4 レッスンのシード。全環境（ローカル / 本番）に配りたい初期データなので
-- マイグレーションとして同梱する。
-- 冪等性は「テーブルが空のときだけ入れる」で担保する（論理削除済みの行も存在扱いなので、
-- 一度データが入れば再投入されない）。適用済みマイグレーションは再実行もされないため、
-- 各環境で編集・削除した既定レッスンが後続の db push で復活することはない。
-- ref（お題画像）は管理画面（/admin）で各レッスンを編集してアップロードする。
--   元の SVG は src/assets/lessons/ にある。
insert into public.lessons (level, title, description, size, palette, sort_order)
select level, title, description, size, palette, sort_order
from (values
  (1, '描き写しに慣れる',     'まずはツールの操作に慣れましょう。お題のドットを1マスずつそのまま写します。', 16, '["#f0a830","#5b3a29"]'::jsonb, 1),
  (1, 'シンプルなキャラを写す', '頭と体だけのシンプルなキャラクターです。お題どおりに形を写してみましょう。',     24, '["#5aa66a","#f0c9a0","#3a2e2b"]'::jsonb, 2),
  (2, 'シンプルな形に光と影',   'シンプルな形に光と影をつけて立体感を出します。光源は左上です。',               16, '["#a9d2ff","#5f9be6","#3568b4","#203f73","#13284a"]'::jsonb, 3),
  (2, 'キャラに光と影',         'キャラクターに光と影をつけて立体的に見せましょう。光源は左上です。',           32, '["#ffe0bd","#f0c9a0","#cf9b6e","#7fce8d","#5aa66a","#3c7a4a","#2a2622"]'::jsonb, 4)
) as v(level, title, description, size, palette, sort_order)
where not exists (select 1 from public.lessons);
