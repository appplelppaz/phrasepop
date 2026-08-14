import type { Inflection } from "@/lib/types";

/** 「接続法現在・3人称単数」のような活用ラベルのバッジ。 */
export function InflectionBadge({ inflection }: { inflection: Inflection }) {
  return (
    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
      {inflection.label}
    </span>
  );
}

/** 熟語・成語であることを示すバッジ。 */
export function IdiomBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-400/15 dark:text-violet-200">
      熟語
    </span>
  );
}
