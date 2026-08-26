import type { SearchIntentContract } from "@shopmind/contracts";
import type { ReactNode } from "react";
import {
  Ban,
  BrainCircuit,
  CheckCircle2,
  ListChecks,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function AiSearchInsight({
  intent,
  query,
}: {
  readonly intent: SearchIntentContract;
  readonly query: string;
}) {
  const constraints: Array<readonly [string, string]> = [];
  if (intent.category) constraints.push(["Category", intent.category]);
  if (intent.price?.min !== undefined) {
    constraints.push(["Minimum price", priceFormatter.format(intent.price.min)]);
  }
  if (intent.price?.max !== undefined) {
    constraints.push(["Maximum price", priceFormatter.format(intent.price.max)]);
  }
  if (intent.minRating !== undefined) {
    constraints.push(["Minimum rating", `${intent.minRating.toFixed(1)}+`]);
  }
  for (const brand of intent.brands ?? []) constraints.push(["Brand", brand]);
  const priorities = [
    ...intent.useCases,
    ...intent.requiredFeatures,
    ...intent.priorities,
  ];

  return (
    <aside className="surface-card overflow-hidden lg:sticky lg:top-24">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <Sparkles className="size-4 text-indigo-600" aria-hidden="true" />
        <h2 className="text-sm font-extrabold text-slate-950">AI insight</h2>
      </div>
      <div className="divide-y divide-slate-200 px-5">
        <InsightSection icon={BrainCircuit} title="Your request">
          <p className="text-sm leading-6 text-slate-600">“{query}”</p>
        </InsightSection>

        {constraints.length > 0 ? (
          <InsightSection icon={SlidersHorizontal} title="Extracted constraints">
            <dl className="space-y-2.5">
              {constraints.map(([label, value], index) => (
                <div key={`${label}-${value}-${index}`} className="flex items-start justify-between gap-4 text-xs">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-bold text-teal-700">{value}</dd>
                </div>
              ))}
            </dl>
          </InsightSection>
        ) : null}

        {priorities.length > 0 ? (
          <InsightSection icon={ListChecks} title="Priorities and use cases">
            <ValueList values={priorities} tone="positive" />
          </InsightSection>
        ) : null}

        {intent.negativePreferences.length > 0 ? (
          <InsightSection icon={Ban} title="Avoid">
            <ValueList values={intent.negativePreferences} tone="negative" />
          </InsightSection>
        ) : null}

        <InsightSection icon={Search} title="How ShopMind searches">
          <ol className="space-y-4 text-xs leading-5 text-slate-600">
            <ProcessItem number="1" title="Understand" text="Requests are validated as structured intent." />
            <ProcessItem number="2" title="Retrieve" text="Hard constraints are applied before hybrid retrieval." />
            <ProcessItem number="3" title="Rank" text="Canonical candidates are ranked before grounded explanations." />
          </ol>
        </InsightSection>
      </div>
    </aside>
  );
}

function InsightSection({
  icon: Icon,
  title,
  children,
}: {
  readonly icon: typeof Sparkles;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="py-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-900">
        <Icon className="size-3.5 text-indigo-600" aria-hidden="true" /> {title}
      </h3>
      {children}
    </section>
  );
}

function ValueList({
  values,
  tone,
}: {
  readonly values: readonly string[];
  readonly tone: "positive" | "negative";
}) {
  const Icon = tone === "positive" ? CheckCircle2 : Ban;
  return (
    <ul className="space-y-2.5 text-xs leading-5 text-slate-600">
      {values.map((value, index) => (
        <li key={`${value}-${index}`} className="flex items-start gap-2">
          <Icon
            className={`mt-0.5 size-3.5 shrink-0 ${tone === "positive" ? "text-emerald-600" : "text-red-500"}`}
            aria-hidden="true"
          />
          {value}
        </li>
      ))}
    </ul>
  );
}

function ProcessItem({
  number,
  title,
  text,
}: {
  readonly number: string;
  readonly title: string;
  readonly text: string;
}) {
  return (
    <li className="grid grid-cols-[24px_1fr] gap-3">
      <span className="grid size-6 place-items-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
        {number}
      </span>
      <span>
        <strong className="block text-slate-900">{title}</strong>
        {text}
      </span>
    </li>
  );
}
