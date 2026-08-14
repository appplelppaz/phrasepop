/**
 * 活用の不規則性を判定する。
 *
 * 考え方はひとつだけ: **不定詞から「本来こうなるはずの規則形」を計算し、実際の形と比べる。**
 * 差が語尾より前にあれば語幹の不規則、語尾そのものが違えば語尾の不規則。
 * 手書きの注釈ではないので、動詞を足しても説明が自動で付いてくる。
 *
 * 判定結果のコード:
 *   R  規則的
 *   S  語幹が不規則（語尾は規則どおり）  例: poder -> puedo （pod- が pued- に）
 *   E  語尾が不規則                      例: ser   -> soy
 *   B  語幹も語尾も不規則                例: ir    -> voy
 */

/* ============================================================ スペイン語 */

const ES_ENDINGS = {
  IND_PRES: {
    ar: ["o", "as", "a", "amos", "áis", "an"],
    er: ["o", "es", "e", "emos", "éis", "en"],
    ir: ["o", "es", "e", "imos", "ís", "en"],
  },
  IND_PRET: {
    ar: ["é", "aste", "ó", "amos", "asteis", "aron"],
    er: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    ir: ["í", "iste", "ió", "imos", "isteis", "ieron"],
  },
  IND_IMPF: {
    ar: ["aba", "abas", "aba", "ábamos", "abais", "aban"],
    er: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    ir: ["ía", "ías", "ía", "íamos", "íais", "ían"],
  },
  SUBJ_PRES: {
    ar: ["e", "es", "e", "emos", "éis", "en"],
    er: ["a", "as", "a", "amos", "áis", "an"],
    ir: ["a", "as", "a", "amos", "áis", "an"],
  },
  SUBJ_IMPF: {
    ar: ["ara", "aras", "ara", "áramos", "arais", "aran"],
    er: ["iera", "ieras", "iera", "iéramos", "ierais", "ieran"],
    ir: ["iera", "ieras", "iera", "iéramos", "ierais", "ieran"],
  },
};

// 未来・条件法は「不定詞まるごと」に語尾が付くのが規則。
const ES_INFINITIVE_TENSES = {
  IND_FUT: ["é", "ás", "á", "emos", "éis", "án"],
  COND: ["ía", "ías", "ía", "íamos", "íais", "ían"],
};

const ES_NONFINITE = {
  GER: { ar: "ando", er: "iendo", ir: "iendo" },
  PART: { ar: "ado", er: "ido", ir: "ido" },
};

function esClass(lemma) {
  const tail = lemma.slice(-2);
  if (tail === "ar" || tail === "er" || tail === "ir") return tail;
  if (lemma.endsWith("ír")) return "ir"; // oír, reír など
  return null;
}

function esStem(lemma) {
  return lemma.slice(0, -2);
}

/** スペイン語の規則形を返す。人称を持たない形は 1 要素。 */
function esRegular(lemma, tense) {
  const cls = esClass(lemma);
  if (!cls) return null;
  const stem = esStem(lemma);

  if (ES_INFINITIVE_TENSES[tense]) {
    return ES_INFINITIVE_TENSES[tense].map((e) => lemma + e);
  }
  if (ES_ENDINGS[tense]) {
    return ES_ENDINGS[tense][cls].map((e) => stem + e);
  }
  if (ES_NONFINITE[tense]) {
    return [stem + ES_NONFINITE[tense][cls]];
  }
  if (tense === "IMP") {
    // 肯定命令の規則形。1人称単数は存在しない。
    const subj = ES_ENDINGS.SUBJ_PRES[cls].map((e) => stem + e);
    const tu = cls === "ar" ? stem + "a" : stem + "e";
    const vosotros = cls === "ar" ? stem + "ad" : cls === "er" ? stem + "ed" : stem + "id";
    return ["", tu, subj[2], subj[3], vosotros, subj[5]];
  }
  return null; // 複合時制は分詞側で判定する
}

/** 語尾の一覧（規則形から語幹を切り出すのに使う）。 */
function esEndingList(lemma, tense) {
  const cls = esClass(lemma);
  if (!cls) return null;
  if (ES_INFINITIVE_TENSES[tense]) return ES_INFINITIVE_TENSES[tense];
  if (ES_ENDINGS[tense]) return ES_ENDINGS[tense][cls];
  if (ES_NONFINITE[tense]) return [ES_NONFINITE[tense][cls]];
  if (tense === "IMP") {
    const s = ES_ENDINGS.SUBJ_PRES[cls];
    return ["", cls === "ar" ? "a" : "e", s[2], s[3], cls === "ar" ? "ad" : cls === "er" ? "ed" : "id", s[5]];
  }
  return null;
}

/* ============================================================ フランス語 */

const FR_GROUP1 = {
  PRES: ["e", "es", "e", "ons", "ez", "ent"],
  IMPF: ["ais", "ais", "ait", "ions", "iez", "aient"],
  SUBJ: ["e", "es", "e", "ions", "iez", "ent"],
};
const FR_GROUP2 = {
  PRES: ["is", "is", "it", "issons", "issez", "issent"],
  IMPF: ["issais", "issais", "issait", "issions", "issiez", "issaient"],
  SUBJ: ["isse", "isses", "isse", "issions", "issiez", "issent"],
};
const FR_FUT = ["ai", "as", "a", "ons", "ez", "ont"];
const FR_COND = ["ais", "ais", "ait", "ions", "iez", "aient"];

/**
 * フランス語の動詞群を見分ける。
 *   1群 -er（aller を除く）
 *   2群 -ir で現在形 1人称複数が -issons になるもの
 *   3群 それ以外（すべて不規則扱い）
 */
function frGroup(lemma, forms) {
  if (lemma === "aller") return 3;
  if (lemma.endsWith("er")) return 1;
  if (lemma.endsWith("ir") && forms?.PRES?.[3]?.endsWith("issons")) return 2;
  return 3;
}

function frRegular(lemma, tense, forms) {
  const group = frGroup(lemma, forms);
  if (group === 3) return null; // 第3群は規則形が定義できない

  const stem = lemma.slice(0, -2);
  const table = group === 1 ? FR_GROUP1 : FR_GROUP2;

  if (table[tense]) return table[tense].map((e) => stem + e);
  if (tense === "FUT") return FR_FUT.map((e) => lemma + e);
  if (tense === "COND") return FR_COND.map((e) => lemma + e);
  if (tense === "PPASSE") return [group === 1 ? stem + "é" : stem + "i"];
  if (tense === "PPRES") return [group === 1 ? stem + "ant" : stem + "issant"];
  if (tense === "IMPER") {
    const p = table.PRES.map((e) => stem + e);
    // 1群の命令法 2人称単数は現在形から s が落ちる（parle）。
    return ["", p[0], "", p[3], p[4], ""];
  }
  return null;
}

function frEndingList(lemma, tense, forms) {
  const group = frGroup(lemma, forms);
  if (group === 3) return null;
  const table = group === 1 ? FR_GROUP1 : FR_GROUP2;
  if (table[tense]) return table[tense];
  if (tense === "FUT") return FR_FUT;
  if (tense === "COND") return FR_COND;
  if (tense === "PPASSE") return [group === 1 ? "é" : "i"];
  if (tense === "PPRES") return [group === 1 ? "ant" : "issant"];
  if (tense === "IMPER") return ["", table.PRES[0], "", table.PRES[3], table.PRES[4], ""];
  return null;
}

/* ==================================================== 語幹の変化を説明する */

/** よくある語幹母音交替。見つかればそのまま説明文に使う。 */
const ALTERNATIONS = [
  ["o", "ue"],
  ["e", "ie"],
  ["e", "i"],
  ["u", "ue"],
  ["i", "ie"],
  ["o", "u"],
  ["e", "í"],
  ["c", "zc"],
  ["c", "qu"],
  ["g", "gu"],
  ["z", "c"],
  ["g", "j"],
  // フランス語の綴り変化
  ["e", "è"], // acheter -> achète（開音節でアクセントが付く）
  ["é", "è"], // espérer -> espère
  ["l", "ll"], // appeler -> appelle（子音重複）
  ["t", "tt"], // jeter   -> jette
  ["g", "ge"], // manger  -> mangeons（a/o の前で e を挟む）
  ["c", "ç"], // commencer -> commençons
  ["y", "i"], // payer   -> paie
];

/**
 * 規則形の語幹と実際の語幹を比べて、日本語の説明を組み立てる。
 * 母音交替として説明できるならそう書き、できなければ語幹の対比だけを示す。
 */
function describeStem(stemReg, stemAct) {
  if (stemReg === stemAct) return null;

  // ser の eres のように語幹がまるごと入れ替わる補充形は、語幹の対比として説明すると
  // かえって誤解を招く（s- → er- など）。頭文字が違う場合は語幹の説明をあきらめる。
  if (!stemReg || !stemAct || stemReg[0] !== stemAct[0]) return null;

  for (const [from, to] of ALTERNATIONS) {
    // 語幹の最後に現れる from を to に置き換えて一致するかを見る。
    const idx = stemReg.lastIndexOf(from);
    if (idx < 0) continue;
    const swapped = stemReg.slice(0, idx) + to + stemReg.slice(idx + from.length);
    if (swapped === stemAct) {
      return {
        kind: "alternation",
        from,
        to,
        text: `語幹の ${from} が ${to} に変わる（${stemReg}- → ${stemAct}-）`,
      };
    }
  }

  return {
    kind: "stem",
    text: `語幹が不規則に変化する（${stemReg}- → ${stemAct}-）`,
  };
}

/* ============================================================ 判定の本体 */

/**
 * 1 つの (動詞, 時制) について 6 人称ぶんの不規則性を判定する。
 *
 * 返り値:
 *   { codes: "RSSRRS", reg: [...規則形...], notes: { "<code>": "説明" }, summary: "見出し" }
 *   規則を定義できない場合（スペイン語の複合時制、フランス語第3群）は null。
 */
export function analyzeTense(lang, lemma, tense, actual, allForms) {
  // フランス語の第3群（prendre, aller, venir …）には「規則形」という基準が存在しない。
  // 比較のしようがないので、規則との差分ではなく「不規則動詞である」ことを伝える。
  if (lang === "fr" && frGroup(lemma, allForms) === 3) {
    const text = "第3群の不規則動詞。規則的な活用パターンが無いので形ごと覚える";
    return {
      codes: actual.map((f) => (f ? "I" : "-")).join(""),
      reg: null,
      perPerson: actual.map((f) => (f ? { code: "I", regular: null, text } : null)),
      notes: [text],
      summary: "不規則動詞（第3群）",
    };
  }

  const reg = lang === "es" ? esRegular(lemma, tense) : frRegular(lemma, tense, allForms);
  const endings = lang === "es" ? esEndingList(lemma, tense) : frEndingList(lemma, tense, allForms);
  if (!reg || !endings) return null;

  const codes = [];
  /** 人称ごとの説明。フレーズには該当人称のぶんだけを載せる。 */
  const perPerson = [];

  for (let i = 0; i < actual.length; i += 1) {
    const act = actual[i];
    const exp = reg[i];

    // 存在しない人称（命令法など）は判定対象外。
    if (!act || !exp) {
      codes.push("-");
      perPerson.push(null);
      continue;
    }
    if (act === exp) {
      codes.push("R");
      perPerson.push(null);
      continue;
    }

    const ending = endings[i] ?? "";
    if (ending && act.endsWith(ending)) {
      // 語尾は規則どおり → 語幹だけが不規則
      const stemAct = act.slice(0, act.length - ending.length);
      const stemReg = exp.slice(0, exp.length - ending.length);
      const desc = describeStem(stemReg, stemAct);
      codes.push("S");
      perPerson.push({
        code: "S",
        regular: exp,
        text: desc ? desc.text : `規則どおりなら ${exp} のところが ${act} になる`,
        ...(desc?.kind === "alternation" ? { from: desc.from, to: desc.to } : {}),
      });
    } else {
      // 語尾が規則形と違う
      const code = act[0] === exp[0] ? "E" : "B";
      codes.push(code);
      perPerson.push({
        code,
        regular: exp,
        text: `規則どおりなら ${exp} のところが ${act} になる`,
      });
    }
  }

  const irregularCount = codes.filter((c) => c === "S" || c === "E" || c === "B").length;
  if (irregularCount === 0) {
    return { codes: codes.join(""), reg, perPerson, notes: [], summary: "規則活用" };
  }

  // 時制全体の見出し。語幹交替が支配的ならそれを、そうでなければ不規則の広がりを示す。
  const alternations = [...new Set(perPerson.filter((p) => p?.from).map((p) => `${p.from} → ${p.to}`))];
  const allIrregular = codes.every((c) => c !== "R" && c !== "-");
  const summary = alternations.length
    ? `語幹交替 ${alternations.join(" / ")}`
    : allIrregular
      ? "完全不規則（規則形から大きく外れる）"
      : "一部の人称が不規則";

  return {
    codes: codes.join(""),
    reg,
    perPerson,
    notes: [...new Set(perPerson.filter(Boolean).map((p) => p.text))].slice(0, 3),
    summary,
  };
}

/** 1 人称ぶんの判定コードを取り出す。 */
export function codeAt(analysis, personIndex) {
  if (!analysis) return null;
  const c = analysis.codes[personIndex];
  return c === "-" ? null : c;
}

export const CODE_LABEL = {
  R: "規則活用",
  S: "語幹が不規則",
  E: "語尾が不規則",
  B: "語幹・語尾とも不規則",
  I: "不規則動詞",
};
