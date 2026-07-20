import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [blinkingTab, exitPopup, sound] = await Promise.all([
    db.blinkingTabTrigger.findUnique({ where: { shop } }),
    db.exitPopupTrigger.findUnique({ where: { shop } }),
    db.soundTrigger.findUnique({ where: { shop } }),
  ]);

  return {
    blinkingTab: blinkingTab ?? { enabled: false },
    exitPopup: exitPopup ?? { enabled: false },
    sound: sound ?? { enabled: false },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const trigger = formData.get("trigger");
  const enabled = formData.get("enabled") === "true";

  if (trigger === "blinkingTab") {
    await db.blinkingTabTrigger.upsert({
      where: { shop },
      create: { shop, enabled },
      update: { enabled },
    });
  } else if (trigger === "exitPopup") {
    await db.exitPopupTrigger.upsert({
      where: { shop },
      create: { shop, enabled },
      update: { enabled },
    });
  } else if (trigger === "sound") {
    await db.soundTrigger.upsert({
      where: { shop },
      create: { shop, enabled },
      update: { enabled },
    });
  }

  return { ok: true };
};

export default function Index() {
  const { blinkingTab, exitPopup, sound } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const toggle = (trigger: string, currentlyEnabled: boolean) => {
    fetcher.submit(
      { trigger, enabled: String(!currentlyEnabled) },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Микро-триггеры внимания">
      <s-section heading="Мигающая вкладка браузера">
        <s-paragraph>
          Меняет заголовок и favicon вкладки, когда посетитель уходит со
          страницы с товаром в корзине.
        </s-paragraph>
        <s-button onClick={() => toggle("blinkingTab", blinkingTab.enabled)}>
          {blinkingTab.enabled ? "Выключить" : "Включить"}
        </s-button>
      </s-section>

      <s-section heading="Exit-intent попап">
        <s-paragraph>
          Минималистичный попап с текстом и промокодом при движении курсора к
          верхней границе окна.
        </s-paragraph>
        <s-button onClick={() => toggle("exitPopup", exitPopup.enabled)}>
          {exitPopup.enabled ? "Выключить" : "Включить"}
        </s-button>
      </s-section>

      <s-section heading="Звуковой сигнал">
        <s-paragraph>
          Звук при добавлении товара в корзину или переходе на checkout.
        </s-paragraph>
        <s-button onClick={() => toggle("sound", sound.enabled)}>
          {sound.enabled ? "Выключить" : "Включить"}
        </s-button>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
