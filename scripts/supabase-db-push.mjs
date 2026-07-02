#!/usr/bin/env node
/*
 * 本番 Supabase へのマイグレーション「誤適用」を防ぐためのガード付き db push。
 *   npm run db:push       … 確認つきで本番（リンク先）へ適用
 *   npm run db:push:dry   … 適用せず差分のみ表示（ガード不要）
 *
 * 防止の仕組み:
 *   1. リンク先（= 実際の適用先 project ref）を特定。未リンクなら中止。
 *   2. SUPABASE_PROD_REF が設定されていれば、リンク先と一致するか照合（取り違え検知）。
 *   3. 必ず dry-run を表示して「何が適用されるか」を見せる。
 *   4. project ref をそのまま入力させ、一致したときだけ実際に push する。
 *      （= 無意識・取り違えでの本番適用を止める。生の `supabase db push` は使わない運用にする）
 */
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const sx = (cmd) => { try { return execSync(cmd, { encoding: 'utf8' }).trim() } catch { return '' } }
const supa = (args) => spawnSync('npx', ['supabase', ...args], { stdio: 'inherit', shell: true })

// .env から KEY を読む（このスクリプトは Vite を通らないので自前で読む）
function fromDotenv(key) {
  if (!existsSync('.env')) return ''
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '').trim()
  }
  return ''
}

// supabase link が書く内部ファイル（= 実際の push 先）
const LINK_FILE = 'supabase/.temp/project-ref'
const linkedRef = existsSync(LINK_FILE) ? readFileSync(LINK_FILE, 'utf8').trim() : ''
const expected = (process.env.SUPABASE_PROD_REF || fromDotenv('SUPABASE_PROD_REF') || '').trim()

if (!linkedRef) {
  console.error('✖ Supabase プロジェクトにリンクされていません。')
  console.error('  `npx supabase link --project-ref <ref>` を実行してから再度お試しください。')
  process.exit(1)
}
if (expected && expected !== linkedRef) {
  console.error(`✖ リンク先 (${linkedRef}) が SUPABASE_PROD_REF (${expected}) と一致しません。`)
  console.error('  意図しないプロジェクトにリンクされている可能性があります。`npx supabase link` を確認してください。')
  process.exit(1)
}

// 健全性チェック（警告のみ。確認は必須）
const branch = sx('git rev-parse --abbrev-ref HEAD')
const dirty = sx('git status --porcelain')
console.log(`\n⚠  本番 Supabase (${linkedRef}) にマイグレーションを適用しようとしています。`)
if (branch && branch !== 'main') console.log(`   ・現在のブランチ: ${branch}（通常は main からの適用を推奨）`)
if (dirty) console.log('   ・作業ツリーに未コミットの変更があります')

// 何が適用されるかを必ず提示
console.log('\n— 適用予定（dry-run）—')
if ((supa(['db', 'push', '--dry-run']).status ?? 1) !== 0) {
  console.error('✖ dry-run に失敗しました。リンク状態やネットワークを確認してください。中止します。')
  process.exit(1)
}

// project ref をそのまま入力させて、一致したときだけ適用
const rl = createInterface({ input: process.stdin, output: process.stdout })
rl.question(`\n上記を確認しました。適用するには project ref「${linkedRef}」をそのまま入力してください。\n中止する場合は何も入力せず Enter。\n> `, (ans) => {
  rl.close()
  if (ans.trim() !== linkedRef) {
    console.error('✖ 入力が一致しませんでした。中止しました（本番には何も適用していません）。')
    process.exit(1)
  }
  console.log('\n本番へ適用します…')
  process.exit(supa(['db', 'push']).status ?? 0)
})
