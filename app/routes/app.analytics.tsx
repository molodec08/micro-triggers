import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const WINDOW_DAYS = 30;

// Order here also controls display order in the table below.
const TRIGGER_LABELS: Record<string, string> = {
  blinkingTab: "Blinking tab",
  exitPopup: "Exit popup",
  sound: "Sound alert",
  stickyCartBar: "Sticky cart bar",
  lowStockBadge: "Low-stock badge",
  freeShippingBar: "Free shipping bar",
};

// Sound alerts have no click-through action of their own — they only ever
// record impressions (see storefront-src/src/triggers/sound.ts) — so their
// conversion/rate columns are always shown as "—", not "0 (0%)".
const HAS_CONVERSIONS: Record<string, boolean> = {
  blinkingTab: true,
  exitPopup: true,
  sound: false,
  stickyCartBar: true,
  lowStockBadge: true,
  freeShippingBar: true,
};

interface TriggerStats {
  trigger: string;
  label: string;
  impressions: number;
  conversions: number;
  hasConversions: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const grouped = await db.triggerEvent.groupBy({
    by: ["trigger", "eventType"],
    where: { shop, createdAt: { gte: cutoff } },
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const row of grouped) {
    counts.set(`${row.trigger}:${row.eventType}`, row._count._all);
  }

  const stats: TriggerStats[] = Object.keys(TRIGGER_LABELS).map((trigger) => ({
    trigger,
    label: TRIGGER_LABELS[trigger],
    impressions: counts.get(`${trigger}:impression`) ?? 0,
    conversions: counts.get(`${trigger}:conversion`) ?? 0,
    hasConversions: HAS_CONVERSIONS[trigger],
  }));

  const hasAnyActivity = stats.some((s) => s.impressions > 0);

  return { stats, hasAnyActivity, windowDays: WINDOW_DAYS };
};

function formatRate(impressions: number, conversions: number): string {
  if (impressions === 0) return "—";
  return `${((conversions / impressions) * 100).toFixed(1)}%`;
}

export default function Analytics() {
  const { stats, hasAnyActivity, windowDays } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Analytics">
      <s-section heading={`Trigger activity (last ${windowDays} days)`}>
        {!hasAnyActivity ? (
          <s-paragraph>
            No trigger activity yet in the last {windowDays} days. Data will
            appear here once your triggers start showing on your storefront.
          </s-paragraph>
        ) : (
          <s-paragraph>
            Impressions count how many times a trigger was shown to a
            shopper. Conversions count how many times a shopper acted on it
            (clicked back to a blinking tab, submitted an email, clicked a
            discount code or a cart bar, or checked out while a badge/bar was
            showing).
          </s-paragraph>
        )}

        <s-table>
          <s-table-header-row>
            <s-table-header>Trigger</s-table-header>
            <s-table-header format="numeric">Impressions</s-table-header>
            <s-table-header format="numeric">Conversions</s-table-header>
            <s-table-header format="numeric">Conversion rate</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {stats.map((row) => (
              <s-table-row key={row.trigger}>
                <s-table-cell>{row.label}</s-table-cell>
                <s-table-cell>{row.impressions}</s-table-cell>
                <s-table-cell>
                  {row.hasConversions ? row.conversions : "—"}
                </s-table-cell>
                <s-table-cell>
                  {row.hasConversions
                    ? formatRate(row.impressions, row.conversions)
                    : "—"}
                </s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
