---
name: phrase-bank
description: "PhrasePop のフレーズバンクにフレーズを追加する。Use when the user asks to add phrases to PhrasePop, expand the phrase bank, 「フレーズを増やして」「接続法のフレーズを50件追加して」「スペイン語のフレーズを足して」, or wants more study material for the phrase app. Also use when adding a new verb to the conjugation table."
---

# PhrasePop フレーズバンクの追加

フレーズ原本に手書きで足し、ビルドし直すだけ。
オフセット計算・活用ラベル・**不規則活用の説明**はビルドが自動で付けるので、
**手で書くのは意味と時制キーだけ**。

対応言語: `es`（スペイン語）、`fr`（フランス語）。訳語は常に日本語。

## 手順

```bash
# 1. 新しい原本ファイルを作って書く（既存ファイルに追記してもよい）
#    data/{lang}/phrases.src.json, phrases.src.2.json, phrases.src.3.json … は
#    すべて自動で読み込まれて結合される。1 ファイルが大きくなりすぎないよう
#    追加ぶんは新しい番号のファイルに書くこと。
# 2. ビルドと検証
node scripts/build-phrases.mjs
node scripts/validate-bank.mjs
```

## フレーズを増やすときの方針

このアプリはフレーズが多いほど価値が上がる。**遠慮せず大量に足してよい。**
ただし単調な例文を並べるのではなく、次のような「教科書に出にくいが実際に必要なもの」を
意識して混ぜること。

- **否定形** — 二重否定（no ... nada / ne ... rien）、ni、tampoco / non plus、部分否定
- **疑問形** — ¿A que...? / ¿Cómo es que...? / Et si...? / Comment ça se fait que...? など口語の型
- **熟語・慣用句・ことわざ** — 直訳では意味が取れないもの（tomar el pelo, en avoir marre, dar en el clavo）
- **形容詞** — 性数一致、位置で意味が変わる語（gran/grande, grand/homme grand）、
  ser/estar で意味が変わる語（listo, aburrido）、不規則な形（beau → bel）
- **ニュアンスが難しいもの** — a lo mejor は直説法だが quizá は接続法、
  comme si はフランス語では半過去だがスペイン語 como si は接続法過去、など言語間で食い違う点
- **口語表現** — 学校では習わないが会話に頻出するもの（¡Qué morro!, Ça ne me dit rien）

**時制と法を偏らせない。** 既存の分布を確認してから、手薄なところを優先して足す。

```bash
# 時制ごとの登場回数を数える
node -e "const b=require('./data/es/phrases.json');const c={};for(const p of b.phrases)for(const t of p.tokens){const k=t.gloss?.inflection?.tense;if(k)c[k]=(c[k]||0)+1}console.log(c)"
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
| `verb` | 熟語が動詞を含むとき、その動詞（後述）。`{ "s": "...", "lemma": "...", "infl": "..." }` |
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
   `infl` を付ければ**不規則活用の説明も自動で付く**（`label` の手書きでは付かない）。

   > 不規則活用の説明は書かなくてよい。`scripts/lib/irregularity.mjs` が
   > 「不定詞から計算した本来の規則形」と実際の形を比べて
   > 「語幹の o が ue に変わる（pod- → pued-）」のような説明を自動生成し、
   > 画面では赤い波線で目立たせる。手書きしないこと。

2. **トークンは重ねられない。熟語が動詞を含むときは `verb` を書く。**
   熟語トークンの内側にある動詞を別トークンにすることはできないが、
   熟語トークンに `verb` を持たせれば**普通の動詞と同じ活用表示になる**
   （人称マーク・時制の色・活用ラベル・不規則の説明・原形）。

   ```json
   { "s": "dieron cuenta", "lemma": "darse cuenta de", "pos": "慣用表現", "ja": "気づく",
     "idiom": true, "verb": { "s": "dieron", "lemma": "dar", "infl": "IND_PRET/3pl" } }
   ```

   `verb.s` は熟語の表層形に含まれていなければならず、`verb.infl` は普通の `infl` と
   まったく同じように活用表と照合される。**動詞を含む熟語には必ず `verb` を書くこと。**

   - 複合時制・代名動詞は、意味を担う側（分詞）を指す。
     `s'est mis à` なら `{ "s": "mis", "lemma": "mettre", "infl": "PC/3sg" }`
   - 熟語に動詞が 2 つ以上あるときは主となる 1 つだけ書く（`Sea como sea` は先頭の `Sea`）
   - 動詞を熟語の外に出せるなら、そのほうが素直（`Que yo sepa` は `Que`/`yo` を skip にして
     `sepa` を独立させ、note に決まり文句だと書く）
3. **複合時制は助動詞ごと `s` に書ける。** `"s": "he hablado", "infl": "IND_PERF/1sg"`。
   過去分詞だけを書いてもよい（`"s": "hablado"`）。
4. **`lemma` が活用表に無いとエラーになる。** その動詞を使いたいときは
   `scripts/verb-lists/{lang}.json` に `{"lemma": "...", "ja": "..."}` を足してから
   活用表を作り直す（下記）。
5. **代名動詞・接語は分割する。** スペイン語 `Dime` は `{"s":"Di","infl":"IMP/2sg"}` と
   `{"s":"me","skip":true}` の 2 トークンにする。表層形が活用表と一致しなくなるため。
6. **機能語も `skip: true` でトークンに入れる。** ハイライトの整合が保てる。
   ただし全部書く必要はなく、飛ばした部分は素通しで表示される。
7. **時制を偏らせない。** 追加するときは既存の分布を見て、手薄な時制を優先する。

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
