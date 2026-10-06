import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import {
  getAdminShopPlan,
  pricingPlansUrl,
  shouldPromptPlanSelection,
} from "../plan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, redirect, session } = await authenticate.admin(request);

  // Тариф проверяется через Partner API activeSubscription (Shopify App
  // Pricing), а не billing.check() — тот смотрит Billing API подписки через
  // Admin API. Отсутствие подписки — это Free, не блокировка: Pro-фичи
  // закрываются в самих роутах и в proxy.settings (см. app/plan.server.ts).
  await getAdminShopPlan(admin, session.shop);
  if (await shouldPromptPlanSelection(session.shop)) {
    return redirect(pricingPlansUrl(session.shop), { target: "_top" });
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/styling">Styling</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();

  // boundary.error() renders a recognized Shopify auth redirect (session
  // expired, embedded app needs to reload the top frame) as raw HTML via
  // dangerouslySetInnerHTML. When the thrown Response isn't one it
  // recognizes, error.data is empty and it falls back to its own literal
  // "Handling response" string — a dead end for the merchant instead of a
  // redirect. Show a readable message with a manual reload path there
  // instead, while leaving the underlying library element in place so
  // React Router still applies its headers to the response.
  const rendered = boundary.error(error);
  const hasRecognizedContent =
    error instanceof Object &&
    "data" in error &&
    Boolean((error as { data?: unknown }).data);

  if (hasRecognizedContent) {
    return rendered;
  }

  return (
    <s-page heading="Something went wrong">
      <s-section>
        <s-paragraph>
          We couldn&apos;t load this page. This usually means your session
          with Shopify needs to be refreshed.
        </s-paragraph>
        <s-button onClick={() => window.top?.location.reload()}>
          Reload
        </s-button>
      </s-section>
      {rendered}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
