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
    shop,
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    blinkingTab: {
      enabled: blinkingTab?.enabled ?? false,
      message: blinkingTab?.message ?? "Come back! Your cart is waiting 🛒",
    },
    exitPopup: {
      enabled: exitPopup?.enabled ?? false,
      message: exitPopup?.message ?? "Wait! Here's a discount for you",
      discountCode: exitPopup?.discountCode ?? "",
    },
    sound: {
      enabled: sound?.enabled ?? false,
      playOnAddCart: sound?.playOnAddCart ?? true,
      playOnCheckout: sound?.playOnCheckout ?? false,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const trigger = formData.get("trigger");

  if (trigger === "blinkingTab") {
    const enabled = formData.get("enabled") === "true";
    const message = String(formData.get("message") ?? "");
    await db.blinkingTabTrigger.upsert({
      where: { shop },
      create: { shop, enabled, message },
      update: { enabled, message },
    });
  } else if (trigger === "exitPopup") {
    const enabled = formData.get("enabled") === "true";
    const message = String(formData.get("message") ?? "");
    const discountCode = String(formData.get("discountCode") ?? "") || null;
    await db.exitPopupTrigger.upsert({
      where: { shop },
      create: { shop, enabled, message, discountCode },
      update: { enabled, message, discountCode },
    });
  } else if (trigger === "sound") {
    const enabled = formData.get("enabled") === "true";
    const playOnAddCart = formData.get("playOnAddCart") === "true";
    const playOnCheckout = formData.get("playOnCheckout") === "true";
    await db.soundTrigger.upsert({
      where: { shop },
      create: { shop, enabled, playOnAddCart, playOnCheckout },
      update: { enabled, playOnAddCart, playOnCheckout },
    });
  }

  return { ok: true };
};

export default function Index() {
  const { shop, apiKey, blinkingTab, exitPopup, sound } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const save = (trigger: string, fields: Record<string, string>) => {
    fetcher.submit({ trigger, ...fields }, { method: "POST" });
  };

  return (
    <s-page heading="Micro-triggers of attention">
      <s-section heading="Blinking browser tab">
        <s-paragraph>
          Changes the tab title when a visitor leaves the page with an item
          in their cart.
        </s-paragraph>
        <s-switch
          label="Enable"
          checked={blinkingTab.enabled || undefined}
          onChange={(e: Event) =>
            save("blinkingTab", {
              enabled: String((e.target as HTMLInputElement).checked),
              message: blinkingTab.message,
            })
          }
        />
        <s-text-field
          label="Tab title text"
          value={blinkingTab.message}
          onChange={(e: Event) =>
            save("blinkingTab", {
              enabled: String(blinkingTab.enabled),
              message: (e.target as HTMLInputElement).value,
            })
          }
        />
      </s-section>

      <s-section heading="Exit-intent popup">
        <s-paragraph>
          A minimal popup with text and a discount code, triggered when the
          cursor moves toward the top of the window.
        </s-paragraph>
        <s-switch
          label="Enable"
          checked={exitPopup.enabled || undefined}
          onChange={(e: Event) =>
            save("exitPopup", {
              enabled: String((e.target as HTMLInputElement).checked),
              message: exitPopup.message,
              discountCode: exitPopup.discountCode,
            })
          }
        />
        <s-text-field
          label="Popup text"
          value={exitPopup.message}
          onChange={(e: Event) =>
            save("exitPopup", {
              enabled: String(exitPopup.enabled),
              message: (e.target as HTMLInputElement).value,
              discountCode: exitPopup.discountCode,
            })
          }
        />
        <s-text-field
          label="Discount code (optional)"
          value={exitPopup.discountCode}
          onChange={(e: Event) =>
            save("exitPopup", {
              enabled: String(exitPopup.enabled),
              message: exitPopup.message,
              discountCode: (e.target as HTMLInputElement).value,
            })
          }
        />
      </s-section>

      <s-section heading="Sound alert">
        <s-paragraph>
          Plays a sound when a product is added to the cart or at checkout.
        </s-paragraph>
        <s-switch
          label="Enable"
          checked={sound.enabled || undefined}
          onChange={(e: Event) =>
            save("sound", {
              enabled: String((e.target as HTMLInputElement).checked),
              playOnAddCart: String(sound.playOnAddCart),
              playOnCheckout: String(sound.playOnCheckout),
            })
          }
        />
        <s-switch
          label="On add to cart"
          checked={sound.playOnAddCart || undefined}
          onChange={(e: Event) =>
            save("sound", {
              enabled: String(sound.enabled),
              playOnAddCart: String((e.target as HTMLInputElement).checked),
              playOnCheckout: String(sound.playOnCheckout),
            })
          }
        />
        <s-switch
          label="On checkout page"
          checked={sound.playOnCheckout || undefined}
          onChange={(e: Event) =>
            save("sound", {
              enabled: String(sound.enabled),
              playOnAddCart: String(sound.playOnAddCart),
              playOnCheckout: String((e.target as HTMLInputElement).checked),
            })
          }
        />
      </s-section>

      <s-section slot="aside" heading="Storefront preview">
        <s-paragraph>
          Shopify storefronts block being embedded in another site&apos;s
          iframe, so the live preview can&apos;t render inside this page.
          Open the store in a new tab instead.
        </s-paragraph>
        <s-link href={`https://${shop}`} target="_blank">
          Open {shop}
        </s-link>
      </s-section>

      <s-section slot="aside" heading="Enable on your theme">
        <s-paragraph>
          Triggers only run once the &laquo;Micro-triggers&raquo; app embed
          block is turned on in your theme. Use the button below to open the
          theme editor with it pre-selected, then toggle it on and save.
        </s-paragraph>
        <s-link
          href={`https://${shop}/admin/themes/current/editor?context=apps&template=index&activateAppId=${apiKey}/app_embed`}
          target="_blank"
        >
          Open theme editor
        </s-link>
        <s-paragraph>
          After saving, add a product to the cart on the storefront to test
          the blinking tab, exit-intent popup, and sound alert.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
