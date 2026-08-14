# PhrasePop

フレーズを聞いて、単語の意味と動詞の活用をまとめて覚えるための学習アプリ。
訳語は日本語。v1 の対象はスペイン語とフランス語（英語・中国語はスキーマだけ用意済み）。

## 使い方

```bash
npm install
npm run dev        # http://localhost:3000
```

学習画面では 1 枚のカードが次の順で進む。

1. **フレーズが表示され、読み上げられる**
2. **意味が表示される** — 日本語訳、文法メモ、単語ごとの「表層形 → 原形・品詞・意味・活用の種類」
3. **もう一度フレーズが読み上げられる**

`/drill/es` `/drill/fr` は動詞活用だけのドリル。

## 設計の要点 — 活用ラベルはなぜ信用できるか

このアプリの肝は「llueva は**接続法現在・3人称単数**です」と表示する部分で、
ここが間違っていると学習アプリとして成立しない。そこで実行時に LLM に判定させず、
**ビルド時に活用表と照合する**構造にしてある。

- `data/{lang}/verbs.json` … 活用表（スペイン語 127 語 / フランス語 130 語 × 各 11〜13 時制）
- `data/{lang}/phrases.src.json` … 手書きのフレーズ原本。書くのは `"infl": "SUBJ_PRES/3sg"` のような**キーだけ**
- `scripts/build-phrases.mjs` … キーからラベル文字列を生成し、**表層形が活用表の該当セルと一致するか照合する**

綴りか時制キーが食い違えばビルドが落ちるので、「フレーズ中の動詞形」と「表示される活用ラベル」が
ずれることが原理的に起きない。トークンの文字オフセットも `text` から自動計算するのでズレない。

実行時の LLM API は使わない。API キーの秘匿もレイテンシもコストも不要で、オフラインで動く。

## 活用表の作り直し

```bash
pip install -r requirements.txt      # verbecc（スペイン語の活用生成用）
npm run build:verbs                  # data/{es,fr}/verbs.json を再生成
npm run validate                     # 出力を独立に検証
```

### 使っている活用エンジンと、その選定理由

| 言語 | エンジン | 備考 |
|---|---|---|
| スペイン語 | [verbecc](https://pypi.org/project/verbecc/)（Verbiste 系テンプレート） | Python。`predicted=True`（機械学習による推測）の動詞はビルドを落とす |
| フランス語 | [french-verbs](https://www.npmjs.com/package/french-verbs) + Lefff 辞書 | 6.3MB のデータはビルド時のみ使用。ブラウザには送らない |

当初スペイン語に使っていた npm の `spanish-verbs` は、監査の結果、不規則動詞で誤った活用を
大量に生成することが判明したため置き換えた。実際に確認された誤りの例:

```
hacer  接続法現在 → haga, hagas, haga, tengamos, tengáis, tengan   (tener の形が混入)
salir  直説法現在 → salo, ...          正: salgo
venir  直説法未来 → veniré, ...        正: vendré
pedir  直説法現在 → pedo, pedes, pede  正: pido, pides, pide
jugar  直説法現在 → jugo, jugas, juga  正: juego, juegas, juega
ver    直説法線過去 → vía, vías, ...   正: veía, veías
ser    接続法過去 → ..., fuéramos, fuéramos, ...  (2人称複数が重複)
volver 条件法 → vuelvería, ...         正: volvería
oír / reír / sonreír は活用できず不定詞をそのまま返す
```

`scripts/validate-bank.mjs` は「スペイン語の条件法の語幹 == 未来形の語幹」を不変条件として
検査するので、この種のバグが再び入り込めば検知できる。

ライブラリが誤る・生成できない箇所は `data/{lang}/overrides.json` に手書きで補う。

## フレーズを増やす

`.claude/skills/phrase-bank/SKILL.md` にスキルを置いてある。Claude Code で
「スペイン語の接続法フレーズを 30 件追加して」のように頼めば追記できる。手作業でも同じ手順:

```bash
# data/{lang}/phrases.src.json に追記してから
node scripts/build-phrases.mjs
npm run validate
```

## 検証

```bash
npm run build          # 型チェックとビルド
npm run validate       # 活用表とフレーズバンクの整合性
npx playwright test    # 再生シーケンス (a)→(b)→(c) の動作確認
```

Playwright はヘッドレス Chromium で動くが、**ヘッドレス環境には音声合成の音声が入っていない**。
テストが確かめているのは再生シーケンスの制御ロジックであって、音が鳴ることではない。
実際の音声はブラウザで開いて確認する必要がある。

## 読み上げについて

`lib/speech.ts` が Web Speech API のブラウザ差を吸収している。

- iOS Safari は最初のユーザー操作の中でしか発話を開始できない → 開始画面のタップで解除
- Chrome は音声一覧を非同期に読み込む → `voiceschanged` を待つ
- Chrome は発話中の utterance を GC して途切れさせる → 参照を保持
- 対象言語の音声が無い環境では、無音で失敗せず理由を表示して「音声なしで続ける」を出す

音声の品質と有無は OS 依存。スペイン語・フランス語は macOS / iOS / Windows / Android の
いずれにも標準で入っていることが多いが、Linux では別途インストールが要る場合がある。

## 構成

```
app/                 画面（言語選択 / 学習 / 活用ドリル）
components/          PhraseCard, TokenList, InflectionBadge, PlaybackControls, VoiceGate
lib/
  types.ts           Phrase / Token / Gloss / Inflection
  speech.ts          Web Speech API ラッパ（テスト用モック経路つき）
  useStudySequence.ts  (a)→(b)→(c) の再生ステートマシン
  bank.ts            バンク読み込みと重み付きランダム抽出
  progress.ts        localStorage の学習進捗
data/{es,fr}/        phrases.src.json（手書き）→ phrases.json（生成）, verbs.json, overrides.json
scripts/             活用表・フレーズのビルドと検証
```
