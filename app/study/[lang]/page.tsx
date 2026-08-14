import { notFound } from "next/navigation";
import { loadBank } from "@/lib/bank";
import { ACTIVE_LANGS, LANG_LABEL, isLang } from "@/lib/types";
import { StudyClient } from "./StudyClient";

export function generateStaticParams() {
  return ACTIVE_LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: `${LANG_LABEL[lang]} — PhrasePop` };
}

export default async function StudyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang) || !ACTIVE_LANGS.includes(lang)) notFound();

  const bank = await loadBank(lang);
  return <StudyClient lang={lang} bank={bank} />;
}
