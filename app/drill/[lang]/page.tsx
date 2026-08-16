import { notFound } from "next/navigation";
import { lemmasUsedIn, loadBank, loadVerbs } from "@/lib/bank";
import { ACTIVE_LANGS, LANG_LABEL, isLang } from "@/lib/types";
import { DrillClient } from "./DrillClient";

export function generateStaticParams() {
  return ACTIVE_LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: `${LANG_LABEL[lang]}の活用ドリル — PhrasePop` };
}

export default async function DrillPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang) || !ACTIVE_LANGS.includes(lang)) notFound();

  const [table, bank] = await Promise.all([loadVerbs(lang), loadBank(lang)]);

  // 出題はフレーズバンクで実際に使っている動詞に絞る。活用表にはそれ以外も
  // 残っているので、絞らないとドリルだけバンクより難しくなる。
  const used = lemmasUsedIn(bank.phrases);
  const scoped = { ...table, verbs: table.verbs.filter((v) => used.has(v.lemma)) };

  return <DrillClient lang={lang} table={scoped} />;
}
