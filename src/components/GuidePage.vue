<script setup>
import { ref, onMounted } from 'vue'
import { ui } from '../core/ui.js'

const contentEl = ref(null)
const navEl     = ref(null)

// ── 例示用のミニ・ドット図 ──────────────────
// パターン文字列（1文字=1セル）を SVG に変換して OK/NG を見比べられるようにする。
const EX = { b: '#c8743a', s: '#7a3b28', h: '#f0c070', a: '#f0a030' }

function svgGrid(rows, cell = 12) {
  const w = rows[0].length, h = rows.length
  let r = ''
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const f = EX[rows[y][x]]
      if (f) r += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${f}"/>`
    }
  }
  return `<svg class="exsvg" width="${w * cell}" height="${h * cell}" viewBox="0 0 ${w * cell} ${h * cell}" shape-rendering="crispEdges">${r}</svg>`
}

function okng(okRows, okCap, ngRows, ngCap) {
  return `<div class="exrow">
    <figure class="ex ok"><div class="extag">OK</div>${svgGrid(okRows)}<figcaption>${okCap}</figcaption></figure>
    <figure class="ex ng"><div class="extag">NG</div>${svgGrid(ngRows)}<figcaption>${ngCap}</figcaption></figure>
  </div>`
}

// 光源を左上に固定した球（OK）と、中心だけ明るい同心円（NG=ピロー）
const PILLOW_OK = ['..hhhhb..', '.hhhhbbb.', 'hhhhbbbbb', 'hhhbbbbbs', 'hhbbbbbss', 'hbbbbbsss', 'bbbbbssss', '.bbbssss.', '..bssss..']
const PILLOW_NG = ['..sssss..', '.sssssss.', 'ssbbbbbss', 'ssbhhhbss', 'ssbhhhbss', 'ssbhhhbss', 'ssbbbbbss', '.sssssss.', '..sssss..']
// 段の長さがそろった斜め線（OK）と不揃いの線（NG=ジャギー）
const JAG_OK = ['aa.........', '..aa.......', '....aa.....', '......aa...', '........aa.']
const JAG_NG = ['aaa........', '...a.......', '....aaa....', '.......a...', '........aa.']
// ひとつながりのシルエット（OK）と孤立ドットつき（NG）
const STRAY_OK = ['..aaaa....', '.aaaaaa...', '.aaaaaa...', '..aaaa....', '..........']
const STRAY_NG = ['..aaaa..a.', '.aaaaaa...', '.aaaaaa...', '..aaaa....', '.......a..']

const SECTIONS = [
  {
    id: 'intro', nav: 'はじめに', html: `
    <h2>Welcome to DOTWORK</h2>
    <p>DOTWORK は初心者でも完成度の高いドット絵が作れるようにするツールです。秘訣は<strong>選択肢を絞ること</strong>。小さいキャンバス、限定パレット、そしてこれらのツールが残りをやってくれます。</p>
    <p>プロらしいドット絵は4つの要素で決まります：<strong>陰影と光</strong>、<strong>きれいな縁取り</strong>、<strong>線のキレ</strong>、<strong>色数の節度</strong>。DOTWORKはこれらすべてに対応しています。</p>
    `,
  },
  {
    id: 'flow', nav: '制作の流れ', html: `
    <h2>制作の流れ</h2>
    <p>「どこから手をつけるか」で迷ったら、いつもこの順番で進めましょう。<strong>上から順に積み上げる</strong>のがコツです。いきなり細部を描き込まないこと。</p>
    <ol>
      <li><strong>シルエットを描く</strong> — まず1色だけでカタチを描きます。色や影はまだ。「輪郭だけで何か分かる」かが最重要です。</li>
      <li><strong>ベース色を置く</strong> — 各パーツに基本の色を1色ずつ。塗りつぶし <kbd>G</kbd> が便利です。陰影はまだつけません。</li>
      <li><strong>影と光を足す</strong> — シャドウランプで立体感を出します。光が来る向き（光源）を最初に1つ決め、最後までブレさせないこと。</li>
      <li><strong>縁取りする</strong> — <strong>Auto Outline</strong> でシルエットを縁取り、背景から浮かせます。</li>
      <li><strong>ディテールと仕上げ</strong> — 目・模様などの細部を足し、浮いた1ドットを掃除します。</li>
    </ol>
    <p>行き詰まったら一度ズームアウトして、シルエットだけを眺めてみましょう。左右対称のものは <kbd>S</kbd> の対称モードで半分だけ描けば倍速です。キャラクターは <strong>GUIDES</strong> の頭身ガイドで頭・胴・脚の比率を取れます。</p>
    `,
  },
  {
    id: 'small', nav: '① 小さく始める', html: `
    <h2>① 小さく始める</h2>
    <p>ゲームスプライトには <strong>16×16</strong> で十分です。このサイズでは1ドット1ドットが意味を持つため、悪い選択をしにくくなります。</p>
    <p>ヘッダーの <strong>SIZE</strong> ドロップダウンでキャンバスサイズを選べます。書き出しは常に16倍スケール（16×16 → 256×256 PNG）になります。</p>
    <p>まず16×16で始め、描くものが明確になったら32×32に移行しましょう。</p>
    `,
  },
  {
    id: 'palette', nav: '② 色を絞る', html: `
    <h2>② 色を絞る</h2>
    <p>プロのドット絵師はスプライト1枚に <strong>4〜8色</strong> 程度しか使いません。色が多すぎると濁った印象になります。サイドバーの <strong>PALETTE</strong> から3つのカラーセットを選べます：</p>
    <ul>
      <li><strong>PICO-8</strong> — 小さいスプライトとゲーム向けの16色</li>
      <li><strong>Sweetie16</strong> — 温かみのある自然な16色</li>
      <li><strong>グレースケール</strong> — 16段階のグレー。形を決めてから色をつける際に便利</li>
      <li><strong>画像から抽出</strong> — 参照画像の上位16色を自動抽出</li>
    </ul>
    <p>1枚のスプライトにはパレットを統一しましょう。パレットにない色は使わないのが原則です。</p>
    `,
  },
  {
    id: 'lamp', nav: '③ 影と光', html: `
    <h2>③ 影と光</h2>
    <p><strong>シャドウランプ</strong>は選択色から5段階を自動生成します：</p>
    <table>
      <tr><th>段階</th><th>説明</th></tr>
      <tr><td>Shadow 2</td><td>深い影 — 色相を寒色（青）方向にシフト</td></tr>
      <tr><td>Shadow 1</td><td>中影</td></tr>
      <tr><td>Base</td><td>選択色</td></tr>
      <tr><td>Light 1</td><td>ハイライト — 色相を暖色（黄）方向にシフト</td></tr>
      <tr><td>Light 2</td><td>明るいハイライト</td></tr>
    </table>
    <p>この寒暖の色相シフトがアマチュアとプロの陰影を分けるポイントです。影は単に暗くするのではなく少し青くなり、ハイライトは少し暖かくなります。</p>
    <p><strong>操作：</strong>ベース色を選択 → Shadow 1/2 で影を塗り、Light 1/2 でハイライトを塗る</p>
    `,
  },
  {
    id: 'dither', nav: '④ ディザリング', html: `
    <h2>④ ディザリング</h2>
    <p><strong>ディザツール</strong> <kbd>D</kbd> は市松模様で現在の色を配置し、奇数セルは既存のピクセルをそのままにします。これにより2色だけで中間調を視覚的に表現できます。</p>
    <p><strong>操作手順：</strong></p>
    <ol>
      <li>色Aでペンを使ってエリアを塗る</li>
      <li>色Bを選択する</li>
      <li>ディザツールに切り替えて境界エリアを塗る</li>
    </ol>
    <p>結果として2色だけを使いながら視覚的なグラデーションが得られます。8ビット時代から使われてきたクラシックな技法です。</p>
    <h2 style="margin-top:24px">こんな時に使う</h2>
    <ul>
      <li><strong>少ない色でグラデーション</strong> — 空・地面・背景など広い面を、色を増やさずになめらかに変化させたいとき</li>
      <li><strong>2色の境目をつなぐ</strong> — 明るい色と暗い色の境界をぼかして、段差を自然になじませたいとき</li>
      <li><strong>質感を出す</strong> — 金属・ガラス・煙・霧などのザラっとした質感やテカリ</li>
    </ul>
    <h2 style="margin-top:24px">使わない方がいい時</h2>
    <ul>
      <li><strong>小さいスプライト（16×16 程度）</strong> — 点がノイズに見えやすく、ベタ塗り＋陰影の方がくっきり映えます</li>
      <li><strong>顔など情報量が欲しい部分</strong> — ディザでぼかすと締まりがなくなります</li>
    </ul>
    <p><strong>コツ：</strong>広い面に薄く、境目には1段だけ。かけすぎると全体が砂っぽくなります。</p>
    `,
  },
  {
    id: 'outline', nav: '⑤ Auto Outline', html: `
    <h2>⑤ Auto Outline</h2>
    <p>ドット絵の最も効果的なテクニックの一つ：スプライトのシルエットを <strong>1ドットの黒縁取り</strong> で囲むことで、どんな背景色でも読みやすくなります。ゲームスプライトには必須です。</p>
    <p><strong>操作手順：</strong></p>
    <ol>
      <li>スプライトを描き終える</li>
      <li><strong>ENHANCE</strong> パネルで縁取り色を選ぶ（黒 <code>#000000</code> が定番）</li>
      <li><strong>Auto Outline</strong> をクリック</li>
    </ol>
    <p>透明セルのうち非透明セルに隣接するものが縁取り色で塗られます。<strong>Remove Outline</strong> で他の描画を変えずに縁取りだけを消せます。</p>
    `,
  },
  {
    id: 'mistakes', nav: 'よくある失敗', html: `
    <h2>よくある失敗</h2>
    <p>初心者がつまずきやすいポイントです。<strong>OK と NG を見比べる</strong>だけで一気に垢抜けます。</p>

    <h2 style="margin-top:24px">影は片側に寄せる（ピロー・シェーディング）</h2>
    ${okng(PILLOW_OK, '光源を左上に固定。影が右下に寄って球に見える', PILLOW_NG, '中心だけ明るく周囲を均等に暗く。クッション状で平面的')}
    <p>輪郭から内側へ均等に明るくすると、クッションのように膨らんで見えます（NG）。<strong>光が来る向きを1つ決め、影を反対側へ寄せる</strong>と立体に見えます（OK）。</p>

    <h2 style="margin-top:24px">斜め線の段をそろえる（ジャギー）</h2>
    ${okng(JAG_OK, '同じ長さの段。なめらかな線に見える', JAG_NG, '段の長さがバラバラでギザギザ')}
    <p>階段状の段の長さが不揃いだとギザギザして見えます（NG）。<strong>段の長さをそろえる</strong>となめらかな斜め線になります（OK）。</p>

    <h2 style="margin-top:24px">浮いた1ドットを残さない</h2>
    ${okng(STRAY_OK, 'シルエットがひとつながり', STRAY_NG, '孤立した点がノイズに見える')}
    <p>周囲から孤立した1ドットはノイズになります（NG）。<strong>消すか、まわりとつなげましょう</strong>（OK）。仕上げに全体を見て掃除する習慣を。</p>

    <p style="margin-top:20px">そのほかの注意点：<strong>純黒・純白の塗りすぎ</strong>（<code>#000000</code> / <code>#ffffff</code> のベタは固い。少し色を含んだ濃淡に）、<strong>色の入れすぎ</strong>（1枚 4〜8色が目安）、<strong>バンディング</strong>（同じ太さの色帯が平行に並ぶと縞に見える。帯幅を崩す）。</p>
    `,
  },
  {
    id: 'tips', nav: '上達のコツ', html: `
    <h2>上達のコツ</h2>
    <ul>
      <li><strong>参照画像を使う</strong> — <strong>REFERENCE</strong> パネルに写真やお手本を読み込み、薄く重ねて下絵にできます。形や色の置き方の「正解」が見えます。</li>
      <li><strong>明暗を先に決める</strong> — 色より先に明るさ（明度）を決めると破綻しにくくなります。<strong>PALETTE</strong> のグレースケールで形と陰影を固めてから色をのせるのがおすすめ。</li>
      <li><strong>シルエットで読めるか</strong> — 真っ黒に塗りつぶしても何か分かる形が理想です。輪郭が弱いと、中をどれだけ描き込んでも弱く見えます。</li>
      <li><strong>光源を1つに固定</strong> — 光がどこから来るかを最初に決め、最後までブレさせないこと。</li>
      <li><strong>引いて見る</strong> — 拡大したまま描くと全体が崩れます。ときどきズームアウト（ホイールや <kbd>−</kbd>）して実寸で確認しましょう。</li>
      <li><strong>少し寝かせる</strong> — 完成したと思っても、時間を置いて見ると粗が見えます。</li>
      <li><strong>上手い作品を観察する</strong> — 好きなゲームのドット絵を拡大し、どこに影とハイライトを置いているか真似てみましょう。模写は最速の上達法です。</li>
    </ul>
    `,
  },
  {
    id: 'shortcuts', nav: 'ショートカット', html: `
    <h2>キーボードショートカット</h2>
    <table>
      <tr><th>キー</th><th>操作</th></tr>
      <tr><td><kbd>B</kbd></td><td>ペン</td></tr>
      <tr><td><kbd>E</kbd></td><td>消しゴム</td></tr>
      <tr><td><kbd>L</kbd></td><td>直線</td></tr>
      <tr><td><kbd>G</kbd></td><td>塗りつぶし</td></tr>
      <tr><td><kbd>I</kbd></td><td>スポイト</td></tr>
      <tr><td><kbd>D</kbd></td><td>ディザ</td></tr>
      <tr><td><kbd>S</kbd></td><td>対称トグル</td></tr>
      <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>Undo（60手）</td></tr>
      <tr><td><kbd>Ctrl</kbd>+<kbd>Y</kbd></td><td>Redo</td></tr>
    </table>
    <h2 style="margin-top:24px">Tips</h2>
    <ul>
      <li>ペン・消しゴム・ディザはドラッグ中の隙間を Bresenham 補間で埋めます</li>
      <li>直線ツールはドラッグ中プレビューし、離すと確定します</li>
      <li>補助線は書き出し PNG に含まれません</li>
      <li>書き出しは常に16倍スケール・背景透過です</li>
      <li>対称モードはすべての描画ツールで機能します</li>
    </ul>
    `,
  },
]

onMounted(() => {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return
      navEl.value?.querySelectorAll('.gnav-link').forEach(a => a.classList.remove('active'))
      navEl.value?.querySelector(`a[href="#gs-${en.target.dataset.sec}"]`)?.classList.add('active')
    })
  }, { root: contentEl.value, threshold: 0.15 })

  contentEl.value?.querySelectorAll('.gsec').forEach(el => io.observe(el))
})

function scrollTo(id) {
  document.getElementById('gs-' + id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div id="gpage" :class="{ open: ui.guidePageOpen }">
    <nav ref="navEl" id="gnav">
      <div id="gnav-logo">GUIDE</div>
      <a
        v-for="s in SECTIONS"
        :key="s.id"
        class="gnav-link"
        :href="'#gs-' + s.id"
        @click.prevent="scrollTo(s.id)"
      >{{ s.nav }}</a>
    </nav>

    <div ref="contentEl" id="gcontent">
      <div
        v-for="s in SECTIONS"
        :key="s.id"
        :id="'gs-' + s.id"
        :data-sec="s.id"
        class="gsec"
        v-html="s.html"
      ></div>
    </div>

    <button id="gclose" @click="ui.guidePageOpen = false">✕ Close</button>
  </div>
</template>
