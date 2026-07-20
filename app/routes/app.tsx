import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

// Handle приложения из shopify.app.toml — используется для redirect на
// страницу выбора плана Shopify App Pricing (см. docs/technical для деталей).
const APP_HANDLE = "micro-triggers";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, redirect, session } = await authenticate.admin(request);

  try {
    const { hasActivePayment } = await billing.check();

    if (!hasActivePayment) {
      const storeHandle = session.shop.replace(".myshopify.com", "");
      return redirect(
        `https://admin.shopify.com/store/${storeHandle}/charges/${APP_HANDLE}/pricing_plans`,
        { target: "_top" },
      );
    }
  } catch (error) {
    // Fail-open: пока план Shopify App Pricing не создан в Partner Dashboard,
    // billing.check() бросает Response (не обычную ошибку — см. docs/technical,
    // раздел "Диагностика: throw Response из billing.check()"). Проброс этого
    // Response дальше (`throw error`) был опробован и подтверждённо ломает
    // страницу так же, как исходный необработанный сбой — значит это не
    // штатный редирект-механизм, который нужно пропускать наверх, а сигнал
    // сбоя самой проверки биллинга. Поэтому он целиком проглатывается и
    // логируется, без throw. Пересмотреть это место, когда план будет создан
    // и станет ясно, какая форма ошибки/Response реально возвращается.
    console.error("billing.check() failed, allowing access:", error);
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
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
