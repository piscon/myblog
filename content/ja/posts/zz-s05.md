+++
lang = 'ja'
title = '静的ブログに、邪魔にならない読書進捗バーを追加する'
date = '2026-11-05'
draft = false
source_hash = '58bef8e9ae5f12851c5046e34b13e93df45e580dcdaa1e0974a45c4b849896a3'
source_fields_hash = '82e5966b11031f15ca03909bdc62a712c74a541fcc26ce3054e232fb7d5ec41a'
description = '40行足らずのCSSとわずかなJavaScriptを使って、記事ページに読書進捗バーを追加する方法を紹介します。外部ライブラリは使わず、テーマ本体も変更せず、JSが無効な場合でも自動的にフォールバックする設計です。実装における試行錯誤と、陥りやすかった2つの落とし穴についても記録しています。'
categories = ['技術']
tags = ['Hugo', 'CSS', 'JavaScript']

[cover]
  image = '/images/grass.jpg'
  alt = 'ページ上部の細い線'
  caption = 'ほとんど目立たない進捗バー'
+++
> 本記事はAIによる自動翻訳です。表現が不自然な場合は[中国語の原文](/zh/posts/zz-s05/)をご参照ください。

## 一、要件はたったの一行です

**読者がどこまで読み進めたかに合わせて、上部のラインが動くようにします。** 数字もパーセンテージも表示せず、通知も出さず、マウスホバーで太くなることもありません。これだけです。

ブログは Hugo + PaperMod を使用しており、テーマが毎週更新されるため、作業前に自分の中でルールを決めました。** submodule 本体には絶対に手を加えない**。サイト層で対応できることはすべてサイト層で行う、ということです。

>  テーマは変更されやすい依存関係であるため、そこにロジックを組み込んでしまうと、毎週の weekly PR ごとに手動で diff を確認しなければならなくなります。

## 二、どのレイヤーで行うか

| 方針案 | 変更箇所置 | アップグレード時本 | 結論 |
|---|---|---|---|
| テーマの header テンプレート板 を修正| submodule 内 | 毎週修正が必要突 | ✗ 対象外 |
| オーバーライド `extend_head.html` | サイト層 `layouts/_partials/` | 低 | ✓ CSS/JS を注入 |
| 独自の shortcodee を作成| 各記事の本文文 | 高 | ✗ CMS が構文を壊す可能性がある |
| 純粋な CSS `scroll-timeline` | サイトの CSSS | 最も低 | △ 互換性が不十分 |

最終的に、2番目の方法と短いネイティブ JS を採用することにしました。CSS は `assets/css/extended/` を使い、JS は `assets/js/site.js` を使い、どちらもテーマの `extend_head` フックを通じてフィンガープリント付きで読み込みます。

- [x]  サイト層の拡張ポイントを使用
- [x]  サードパーティの依存関係はゼロ
- [ ]  IE 互換性は考慮していません（とっくにやめています）
- [ ]  prefers-reduced-motion のスイッチは未実装（メモしておく）

## 三、その30数行

核心となる部分は、実はたった一行です。`scrollY / (scrollHeight - innerHeight)`。

```js
function updateProgress() {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
  document.querySelector('.reading-progress')
    ?.style.setProperty('--p', String(p));
}
```
CSS側で `--p` を使って `scaleX` を制御すると、`width` を変更するよりもリフローの回数が1回少なくて済みます。

```css
.reading-progress {
  position: fixed; inset: 0 0 auto; height: 2px;
  transform: scaleX(var(--p, 0)); transform-origin: left;
  background: var(--primary); pointer-events: none;
}
```

** 注意点は `pointer-events: none` です。** 初版では追加し忘れており、プログレスバーがヘッダーの最上部に重なってしまい、テーマ切り替えボタンのクリック領域を1ピクセル分覆ってしまっていました。30分ほど調査してようやく原因を突き止めました。

##  四、JSが無効な場合はどうするか

プログレスバー自体は「機能拡張」であり「コンテンツ」ではないため、JSが動作しないのであれば、空の線が表示されるべきではありません。やり方は、** をデフォルトで `display: none` にしておき、JSでクラスを追加した時だけ ** が表示されるようにすることです。

```css
.reading-progress { display: none; }
html.has-js .reading-progress { display: block; }
```

`site.js` 最初の行に `document.documentElement.classList.add('has-js')` を追加します。こうすることで、スクリプトが読み込まれなかったり、ブロックされたり、エラーで途中で終了したりしても、ページの状態はそのまま維持されます。

>  機能拡張は ** 自ら動作可能であることを ** 証明する必要があり、読者に不具合のフォローをさせてはいけません。

##  五、2つの小さな落とし穴
1. **トップページには `.post-single`** がないので、リストページでもレンダリングしないでください。`site.js` でまずこのセレクターをチェックし、見つからない場合はそのまま return してください。
2. ** 長い目次があるとページが ** に伸びてしまい、スクロールの分母が変化するため、プログレスバーが中盤でわずかに戻ってしまう現象があります。最終的に `document.body.scrollHeight` で一度基準を取るようにしており、動的な再計算は行っていません。—** これで十分です**

| 坑 | 現状象 | 対応 |
|---|---|---|
| pointer-events  が不足 | ボタンが 到  | CSSを一行追加 |
| リストページでも 示  | トップページ上部に 线  が増える | セレクターによるガード |
| 目次が 高  | 中盤でわずかに 退  | 許容 |

##  六、まとめ

今回の変更はわずか2ファイル、30行程度で、テーマには触れず、パッケージの追加もしていません。`hugo --gc --minify` の後の線はほとんど見えず、まさに理想通りの状態です。

>  **「ほとんど見えないこと」** が、この機能における唯一のデザイン目標です。これが実現できたら、これ以上機能を追加しないでください。

[^1]: `scroll-timeline` Chrome 115以降で利用可能です。Safariが対応した後は、このJSセクションを丸ごと削除できます。
