import { notFound } from "next/navigation";
import { loadVerbs } from "@/lib/bank";
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

  const table = await loadVerbs(lang);
  return <DrillClient lang={lang} table={table} />;
}
