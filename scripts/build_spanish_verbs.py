#!/usr/bin/env python3
"""スペイン語の活用表を生成する。

    python3 scripts/build_spanish_verbs.py

## なぜ verbecc なのか

当初は npm の spanish-verbs を使っていたが、不規則動詞で誤った活用を大量に生成することが
監査で判明したため差し替えた。実際に確認された誤りの例:

    hacer  接続法現在 -> haga, hagas, haga, tengamos, tengáis, tengan  (tener の形が混入)
    salir  直説法現在 -> salo, sales, ...                              (正: salgo)
    salir  直説法未来 -> saliré, ...                                   (正: saldré)
    venir  直説法未来 -> veniré, ...                                   (正: vendré)
    pedir  直説法現在 -> pedo, pedes, pede, ...                        (正: pido, pides, pide)
    jugar  直説法現在 -> jugo, jugas, juga, ...                        (正: juego, juegas, juega)
    ver    直説法線過去 -> vía, vías, ...                              (正: veía, veías)
    ser    接続法過去 -> ..., fuéramos, fuéramos, ...                  (2pl 重複、正: fuerais)
    volver 条件法 -> vuelvería, ...                                    (正: volvería)
    oír / reír / sonreír は活用できず不定詞をそのまま返す

verbecc は Verbiste 系の活用テンプレートを使っており、上記すべてで正しい形を返す。
テンプレートが見つからない場合は機械学習で推測する仕組みがあるが、推測は検証できないので
predicted=True の動詞はビルドを失敗させる。

フランス語は french-verbs + Lefff（実在の語彙辞書）を使い、こちらは監査で問題が無かったため
scripts/build-verb-tables.mjs のまま据え置いている。
"""
import json
import logging
import os
import sys

logging.disable(logging.INFO)

try:
    from verbecc import CompleteConjugator
except ImportError:
    sys.exit("verbecc が必要です:  pip install verbecc")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(ROOT, "scripts", "verb-lists", "es.json"), encoding="utf-8") as _f:
    ES_VERBS = json.load(_f)["verbs"]

# 出力する時制キー -> (verbecc の mood, tense, 日本語ラベル)
TENSES = {
    "IND_PRES":  ("indicativo",  "presente",                      "直説法現在"),
    "IND_PRET":  ("indicativo",  "pretérito-perfecto-simple",     "直説法点過去"),
    "IND_IMPF":  ("indicativo",  "pretérito-imperfecto",          "直説法線過去"),
    "IND_FUT":   ("indicativo",  "futuro",                        "直説法未来"),
    "IND_PERF":  ("indicativo",  "pretérito-perfecto-compuesto",  "直説法現在完了"),
    "IND_PLUP":  ("indicativo",  "pretérito-pluscuamperfecto",    "直説法過去完了"),
    "COND":      ("condicional", "presente",                      "条件法現在"),
    "SUBJ_PRES": ("subjuntivo",  "presente",                      "接続法現在"),
    "SUBJ_IMPF": ("subjuntivo",  "pretérito-imperfecto-1",        "接続法過去"),
    "SUBJ_PERF": ("subjuntivo",  "pretérito-perfecto",            "接続法現在完了"),
    "IMP":       ("imperativo",  "afirmativo",                    "命令法"),
    "GER":       ("gerundio",    "gerundio",                      "現在分詞（動名詞）"),
    "PART":      ("participo",   "participo",                     "過去分詞"),
}

# 人称を持たない形。1 要素の配列として出力する。
NO_PERSON = {"GER", "PART"}

# 6 人称スロット -> 採用する代名詞の優先順。
# verbecc は vos / ella / usted / ustedes などの異形も返すので、標準形だけを選ぶ。
SLOTS = [
    ("1sg", ["yo"]),
    ("2sg", ["tú"]),
    ("3sg", ["él", "usted"]),
    ("1pl", ["nosotros"]),
    ("2pl", ["vosotros"]),
    ("3pl", ["ellos", "ustedes"]),
]


def extract_row(data, mood, tense):
    """verbecc の 1 時制ぶんの出力を 6 人称の配列にする。"""
    entries = data["moods"][mood][tense]
    by_pronoun = {}
    for e in entries:
        form = e["c"][0]
        pr = e.get("pr", "")
        # 直説法などは "yo hago" のように代名詞付きで返るので落とす。
        if pr and form.startswith(pr + " "):
            form = form[len(pr) + 1:]
        # 同じ代名詞が複数回来た場合（性別違いなど）は最初のものを採る。
        by_pronoun.setdefault(pr, form)

    row = []
    for _, candidates in SLOTS:
        row.append(next((by_pronoun[p] for p in candidates if p in by_pronoun), ""))
    return row


def build():
    conj = CompleteConjugator(lang="es")
    verbs, problems = [], []

    for entry in ES_VERBS:
        lemma, ja = entry["lemma"], entry["ja"]
        impersonal = entry.get("impersonal", False)
        omit = entry.get("omit", [])

        try:
            data = conj.conjugate(lemma).get_data()
        except Exception:
            # verbecc は一部の規則動詞（pasar / resultar / nevar）で内部エラーを起こす。
            # 活用形が一切得られないので overrides.json での補完に委ねる。
            data = None

        if data is not None and data["verb"].get("predicted"):
            problems.append(f"{lemma}: verbecc にテンプレートが無く機械学習で推測されている（検証不能）")
            continue

        forms = {}
        for key, (mood, tense, _) in TENSES.items():
            if key in omit or data is None:
                continue
            try:
                if key in NO_PERSON:
                    form = data["moods"][mood][tense][0]["c"][0]
                    if form:
                        forms[key] = [form]
                    continue
                row = extract_row(data, mood, tense)
            except (KeyError, IndexError):
                continue  # overrides.json での補完に委ねる

            if impersonal:
                row = ["", "", row[2], "", "", ""]
            # 空欄が残る形は未生成として扱い、overrides.json に補完させる。
            required = [row[2]] if impersonal else (row[1:] if key == "IMP" else row)
            if any(not f for f in required):
                continue
            forms[key] = row

        verb = {"lemma": lemma, "ja": ja}
        if impersonal:
            verb["impersonal"] = True
        if omit:
            verb["omit"] = omit
        verb["forms"] = forms
        verbs.append(verb)

    if problems:
        sys.exit("スペイン語の活用生成で問題:\n  " + "\n  ".join(problems))

    return {
        "lang": "es",
        "tenseLabels": {k: v[2] for k, v in TENSES.items()},
        "verbs": verbs,
    }


def apply_overrides(table):
    """ライブラリ出力を手書きで上書きする（data/es/overrides.json）。"""
    path = os.path.join(ROOT, "data", "es", "overrides.json")
    if not os.path.exists(path):
        return 0

    with open(path, encoding="utf-8") as f:
        overrides = json.load(f)

    applied = 0
    by_lemma = {v["lemma"]: v for v in table["verbs"]}
    for lemma, tenses in overrides.items():
        if lemma.startswith("_"):
            continue
        verb = by_lemma.get(lemma)
        if verb is None:
            sys.exit(f'overrides.json: 動詞リストに無い見出し語 "{lemma}"')
        for tense, row in tenses.items():
            if tense not in TENSES:
                sys.exit(f'overrides.json: 未知の時制キー "{tense}" ({lemma})')
            orig = verb["forms"].get(tense)
            verb["forms"][tense] = (
                [row[i] if row[i] is not None else orig[i] for i in range(6)] if orig else list(row)
            )
            applied += 1
    return applied


def assert_complete(table):
    """全動詞・全時制が埋まっているか検査する。埋まっていなければビルドを落とす。"""
    missing = []
    for verb in table["verbs"]:
        for key in TENSES:
            if key in verb.get("omit", []):
                continue
            row = verb["forms"].get(key)
            if not row or not any(row):
                missing.append(f"{verb['lemma']} / {key}")
                continue
            if key in NO_PERSON:
                continue  # 1 要素のみ。上の any() で十分。
            # 命令法は 1人称単数が存在せず、非人称動詞は 3人称単数だけ。それ以外の空欄は異常。
            required = [row[2]] if verb.get("impersonal") else (row[1:] if key == "IMP" else row)
            if any(not f for f in required):
                missing.append(f"{verb['lemma']} / {key}: 空の人称あり ({'|'.join(row)})")

    if missing:
        sys.exit(
            "es: 活用表に欠落があります。data/es/overrides.json に手書きで補ってください:\n  "
            + "\n  ".join(missing)
        )


if __name__ == "__main__":
    table = build()
    applied = apply_overrides(table)
    assert_complete(table)

    out_dir = os.path.join(ROOT, "data", "es")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "verbs.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(table, f, ensure_ascii=False, indent=2)
        f.write("\n")

    kb = os.path.getsize(out) / 1024
    extra = f" (overrides {applied} 件適用)" if applied else ""
    print(f"es: {len(table['verbs'])} 語 × {len(TENSES)} 時制{extra} -> data/es/verbs.json ({kb:.0f} KB)")
