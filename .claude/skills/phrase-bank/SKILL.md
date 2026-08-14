---
name: phrase-bank
description: "PhrasePop のフレーズバンクにフレーズを追加する。Use when the user asks to add phrases to PhrasePop, expand the phrase bank, 「フレーズを増やして」「接続法のフレーズを50件追加して」「スペイン語のフレーズを足して」, or wants more study material for the phrase app. Also use when adding a new verb to the conjugation table."
---

# PhrasePop フレーズバンクの追加

`data/{lang}/phrases.src.json` に手書きでフレーズを足し、ビルドし直すだけ。
オフセット計算と活用ラベルの生成はビルドがやるので、**手で書くのは意味と時制キーだけ**。

対応言語: `es`（スペイン語）、`fr`（フランス語）。訳語は常に日本語。

## 手順

```bash
# 1. data/{lang}/phrases.src.json の phrases 配列に追記する（下の書式を参照）
# 2. ビルドと検証
node scripts/build-phrases.mjs
node scripts/validate-bank.mjs
```

ビルドが通れば、活用ラベルは活用表と一致していることが保証されている。
エラーが出たら**必ず直す** — 握りつぶさない。

## 書式

```json
{
  "id": "es-0051",
  "text": "Ojalá no llueva mañana.",
  "ja": "明日雨が降らないといいな。",
  "level": "B1",
  "tags": ["接続法現在", "願望"],
  "grammar": "ojalá のあとは必ず接続法。",
  "tokens": [
    { "s": "Ojalá", "lemma": "ojalá", "pos": "間投詞", "ja": "〜だといいな", "note": "後ろは必ず接続法" },
    { "s": "no", "skip": true },
    { "s": "llueva", "lemma": "llover", "pos": "動詞", "ja": "雨が降る", "infl": "SUBJ_PRES/3sg" },
    { "s": "mañana", "lemma": "mañana", "pos": "副詞", "ja": "明日" }
  ]
}
```

| フィールド | 意味 |
|---|---|
| `id` | `{lang}-NNNN`。既存の最大値+1。重複するとビルドが落ちる |
| `text` | 学習言語の文。自然で、単独で意味が通るもの |
| `ja` | 自然な日本語訳。逐語訳しない |
| `level` | `A1` / `A2` / `B1` / `B2` |
| `tags` | 絞り込み用。時制名（「接続法現在」など）と場面（「注文」「天気」）を混ぜてよい |
| `grammar` | 一言の文法解説。特筆する点が無ければ省略 |
| `s` | 表層形。`text` に現れる**そのままの綴り**。熟語は複数語にまたがってよい |
| `skip` | `true` なら機能語（冠詞・前置詞・否定辞・人称代名詞）。意味カードを出さない |
| `lemma` | 原形・辞書形。動詞なら不定詞、名詞なら単数形 |
| `pos` | 日本語の品詞名（動詞・名詞・形容詞・副詞・慣用表現 …） |
| `ja` | 語義。1〜3 個を `・` で連結。品詞ラベルや説明は書かない |
| `infl` | `"時制キー/人称"`。活用表と照合される（後述） |
| `label` | 活用表に無い形の手書きラベル（「不定詞」「女性単数」など） |
| `idiom` | `true` で熟語バッジが付く |
| `note` | 「後ろは必ず接続法」のような補足 |

## `infl` の時制キー

**スペイン語**（`data/es/verbs.json` の `tenseLabels`）

`IND_PRES` 直説法現在 / `IND_PRET` 点過去 / `IND_IMPF` 線過去 / `IND_FUT` 未来 /
`IND_PERF` 現在完了 / `IND_PLUP` 過去完了 / `COND` 条件法現在 /
`SUBJ_PRES` 接続法現在 / `SUBJ_IMPF` 接続法過去 / `SUBJ_PERF` 接続法現在完了 /
`IMP` 命令法 / `GER` 現在分詞 / `PART` 過去分詞

**フランス語**（`data/fr/verbs.json`）

`PRES` 直説法現在 / `IMPF` 半過去 / `FUT` 単純未来 / `PC` 複合過去 / `PQP` 大過去 /
`PS` 単純過去 / `COND` 条件法現在 / `SUBJ` 接続法現在 / `IMPER` 命令法 /
`PPRES` 現在分詞 / `PPASSE` 過去分詞

人称は `1sg` `2sg` `3sg` `1pl` `2pl` `3pl`。`GER` / `PART` / `PPRES` / `PPASSE` は人称を書かない
（`"infl": "PART"`）。

## 大事なルール

1. **`infl` は活用表と照合される。** 表層形が活用表のセルと違えばビルドが落ちる。
   これが「表示される活用ラベルが必ず正しい」ことの担保なので、**照合エラーを回避するために
   `label` の手書きに逃げてはいけない。** まず綴りか時制キーを直すこと。
2. **複合時制は助動詞ごと `s` に書ける。** `"s": "he hablado", "infl": "IND_PERF/1sg"`。
   過去分詞だけを書いてもよい（`"s": "hablado"`）。
3. **`lemma` が活用表に無いとエラーになる。** その動詞を使いたいときは
   `scripts/verb-lists/{lang}.json` に `{"lemma": "...", "ja": "..."}` を足してから
   活用表を作り直す（下記）。
4. **代名動詞・接語は分割する。** スペイン語 `Dime` は `{"s":"Di","infl":"IMP/2sg"}` と
   `{"s":"me","skip":true}` の 2 トークンにする。表層形が活用表と一致しなくなるため。
5. **機能語も `skip: true` でトークンに入れる。** ハイライトの整合が保てる。
   ただし全部書く必要はなく、飛ばした部分は素通しで表示される。
6. **時制を偏らせない。** 追加するときは既存の分布を見て、手薄な時制を優先する。

## 動詞を活用表に追加する

```bash
# scripts/verb-lists/{es,fr}.json に {"lemma": "...", "ja": "..."} を足してから
python3 scripts/build_spanish_verbs.py    # スペイン語（要 pip install verbecc）
node scripts/build-verb-tables.mjs        # フランス語
node scripts/validate-bank.mjs
```

生成された活用を**必ず目視で確認する**。ライブラリは間違えることがある。
誤りがあれば `data/{lang}/overrides.json` に正しい形を手書きする（書式はファイル内のコメント参照）。

非人称動詞（llover, pleuvoir …）は `"impersonal": true`、
その動詞に存在しない形は `"omit": ["IMP"]` を付ける。

## 分量の目安

一度に 20〜40 件ずつ足して、そのつどビルドと検証を通す。
まとめて 100 件書いてから検証すると、どこで間違えたか追いにくい。
