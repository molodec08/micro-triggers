import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

const SOUND_PRESETS = [
  { value: "beep", label: "Beep" },
  { value: "bell", label: "Bell" },
  { value: "coin", label: "Coin" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [
    blinkingTab,
    exitPopup,
    sound,
    stickyCartBar,
    lowStockBadge,
    freeShippingBar,
    emailCapture,
    capturedLeads,
  ] = await Promise.all([
    db.blinkingTabTrigger.findUnique({ where: { shop } }),
    db.exitPopupTrigger.findUnique({ where: { shop } }),
    db.soundTrigger.findUnique({ where: { shop } }),
    db.stickyCartBarTrigger.findUnique({ where: { shop } }),
    db.lowStockBadgeTrigger.findUnique({ where: { shop } }),
    db.freeShippingBarTrigger.findUnique({ where: { shop } }),
    db.emailCaptureTrigger.findUnique({ where: { shop } }),
    db.capturedLead.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    shop,
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    blinkingTab: {
      enabled: blinkingTab?.enabled ?? false,
      message: blinkingTab?.message ?? "Come back! Your cart is waiting 🛒",
      intervalMs: blinkingTab?.intervalMs ?? 1000,
    },
    exitPopup: {
      enabled: exitPopup?.enabled ?? false,
      message: exitPopup?.message ?? "Wait! Here's a discount for you",
      discountCode: exitPopup?.discountCode ?? "",
      sensitivityPx: exitPopup?.sensitivityPx ?? 20,
      countdownSeconds: exitPopup?.countdownSeconds ?? 0,
    },
    sound: {
      enabled: sound?.enabled ?? false,
      soundPreset: sound?.soundPreset ?? "beep",
      playOnAddCart: sound?.playOnAddCart ?? true,
      playOnCheckout: sound?.playOnCheckout ?? false,
    },
    stickyCartBar: {
      enabled: stickyCartBar?.enabled ?? false,
      message: stickyCartBar?.message ?? "You have {count} item(s) in your cart",
    },
    lowStockBadge: {
      enabled: lowStockBadge?.enabled ?? false,
      threshold: lowStockBadge?.threshold ?? 5,
      message: lowStockBadge?.message ?? "Only {count} left in stock!",
    },
    freeShippingBar: {
      enabled: freeShippingBar?.enabled ?? false,
      thresholdCents: freeShippingBar?.thresholdCents ?? 5000,
      message:
        freeShippingBar?.message ?? "Add {remaining} more to get free shipping!",
      successMessage:
        freeShippingBar?.successMessage ?? "You've unlocked free shipping!",
    },
    emailCapture: {
      enabled: emailCapture?.enabled ?? false,
      message: emailCapture?.message ?? "Leave your email",
    },
    capturedLeads: capturedLeads.map((lead) => ({
      id: lead.id,
      email: lead.email,
      createdAt: lead.createdAt.toISOString(),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const trigger = formData.get("trigger");
  const bool = (name: string) => formData.get(name) === "true";
  const str = (name: string) => String(formData.get(name) ?? "");
  const int = (name: string, fallback: number, min = 0) => {
    const value = Number(formData.get(name));
    if (!Number.isFinite(value)) return fallback;
    return Math.max(value, min);
  };

  if (trigger === "blinkingTab") {
    const enabled = bool("enabled");
    const message = str("message");
    const intervalMs = int("intervalMs", 1000, 100);
    await db.blinkingTabTrigger.upsert({
      where: { shop },
      create: { shop, enabled, message, intervalMs },
      update: { enabled, message, intervalMs },
    });
  } else if (trigger === "exitPopup") {
    const enabled = bool("enabled");
    const message = str("message");
    const discountCode = str("discountCode") || null;
    const sensitivityPx = int("sensitivityPx", 20, 1);
    const countdownSeconds = int("countdownSeconds", 0, 0);
    await db.exitPopupTrigger.upsert({
      where: { shop },
      create: {
        shop,
        enabled,
        message,
        discountCode,
        sensitivityPx,
        countdownSeconds,
      },
      update: { enabled, message, discountCode, sensitivityPx, countdownSeconds },
    });
  } else if (trigger === "sound") {
    const enabled = bool("enabled");
    const soundPreset = str("soundPreset") || "beep";
    const playOnAddCart = bool("playOnAddCart");
    const playOnCheckout = bool("playOnCheckout");
    await db.soundTrigger.upsert({
      where: { shop },
      create: { shop, enabled, soundPreset, playOnAddCart, playOnCheckout },
      update: { enabled, soundPreset, playOnAddCart, playOnCheckout },
    });
  } else if (trigger === "stickyCartBar") {
    const enabled = bool("enabled");
    const message = str("message");
    await db.stickyCartBarTrigger.upsert({
      where: { shop },
      create: { shop, enabled, message },
      update: { enabled, message },
    });
  } else if (trigger === "lowStockBadge") {
    const enabled = bool("enabled");
    const threshold = int("threshold", 5, 1);
    const message = str("message");
    await db.lowStockBadgeTrigger.upsert({
      where: { shop },
      create: { shop, enabled, threshold, message },
      update: { enabled, threshold, message },
    });
  } else if (trigger === "freeShippingBar") {
    const enabled = bool("enabled");
    const thresholdCents = int("thresholdCents", 5000, 1);
    const message = str("message");
    const successMessage = str("successMessage");
    await db.freeShippingBarTrigger.upsert({
      where: { shop },
      create: { shop, enabled, thresholdCents, message, successMessage },
      update: { enabled, thresholdCents, message, successMessage },
    });
  } else if (trigger === "emailCapture") {
    const enabled = bool("enabled");
    const message = str("message");
    await db.emailCaptureTrigger.upsert({
      where: { shop },
      create: { shop, enabled, message },
      update: { enabled, message },
    });
  }

  return { ok: true };
};

export default function Index() {
  const {
    shop,
    apiKey,
    blinkingTab,
    exitPopup,
    sound,
    stickyCartBar,
    lowStockBadge,
    freeShippingBar,
    emailCapture,
    capturedLeads,
  } = useLoaderData<typeof loader>();
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
              intervalMs: String(blinkingTab.intervalMs),
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
              intervalMs: String(blinkingTab.intervalMs),
            })
          }
        />
        <s-number-field
          label="Blink interval (ms)"
          value={String(blinkingTab.intervalMs)}
          onChange={(e: Event) =>
            save("blinkingTab", {
              enabled: String(blinkingTab.enabled),
              message: blinkingTab.message,
              intervalMs: (e.target as HTMLInputElement).value,
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
              sensitivityPx: String(exitPopup.sensitivityPx),
              countdownSeconds: String(exitPopup.countdownSeconds),
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
              sensitivityPx: String(exitPopup.sensitivityPx),
              countdownSeconds: String(exitPopup.countdownSeconds),
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
              sensitivityPx: String(exitPopup.sensitivityPx),
              countdownSeconds: String(exitPopup.countdownSeconds),
            })
          }
        />
        <s-number-field
          label="Sensitivity (px from top edge)"
          value={String(exitPopup.sensitivityPx)}
          onChange={(e: Event) =>
            save("exitPopup", {
              enabled: String(exitPopup.enabled),
              message: exitPopup.message,
              discountCode: exitPopup.discountCode,
              sensitivityPx: (e.target as HTMLInputElement).value,
              countdownSeconds: String(exitPopup.countdownSeconds),
            })
          }
        />
        <s-number-field
          label="Discount countdown (seconds, 0 = off)"
          value={String(exitPopup.countdownSeconds)}
          onChange={(e: Event) =>
            save("exitPopup", {
              enabled: String(exitPopup.enabled),
              message: exitPopup.message,
              discountCode: exitPopup.discountCode,
              sensitivityPx: String(exitPopup.sensitivityPx),
              countdownSeconds: (e.target as HTMLInputElement).value,
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
              soundPreset: sound.soundPreset,
              playOnAddCart: String(sound.playOnAddCart),
              playOnCheckout: String(sound.playOnCheckout),
            })
          }
        />
        <s-select
          label="Sound"
          value={sound.soundPreset}
          onChange={(e: Event) =>
            save("sound", {
              enabled: String(sound.enabled),
              soundPreset: (e.target as HTMLSelectElement).value,
              playOnAddCart: String(sound.playOnAddCart),
              playOnCheckout: String(sound.playOnCheckout),
            })
          }
        >
          {SOUND_PRESETS.map((preset) => (
            <s-option key={preset.value} value={preset.value}>
              {preset.label}
            </s-option>
          ))}
        </s-select>
        <s-switch
          label="On add to cart"
          checked={sound.playOnAddCart || undefined}
          onChange={(e: Event) =>
            save("sound", {
              enabled: String(sound.enabled),
              soundPreset: sound.soundPreset,
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
              soundPreset: sound.soundPreset,
              playOnAddCart: String(sound.playOnAddCart),
              playOnCheckout: String((e.target as HTMLInputElement).checked),
            })
          }
        />
      </s-section>

      <s-section heading="Sticky back-to-cart bar">
        <s-paragraph>
          Shows a thin bar with the cart item count when a visitor returns to
          the tab after the blinking tab trigger fired.
        </s-paragraph>
        <s-switch
          label="Enable"
          checked={stickyCartBar.enabled || undefined}
          onChange={(e: Event) =>
            save("stickyCartBar", {
              enabled: String((e.target as HTMLInputElement).checked),
              message: stickyCartBar.message,
            })
          }
        />
        <s-text-field
          label="Bar text (use {count} for the item count)"
          value={stickyCartBar.message}
          onChange={(e: Event) =>
            save("stickyCartBar", {
              enabled: String(stickyCartBar.enabled),
              message: (e.target as HTMLInputElement).value,
            })
          }
        />
      </s-section>

      <s-section heading="Low-stock badge">
        <s-paragraph>
          Shows &quot;Only N left in stock&quot; next to the add-to-cart
          button when inventory drops below a threshold.
        </s-paragraph>
        <s-switch
          label="Enable"
          checked={lowStockBadge.enabled || undefined}
          onChange={(e: Event) =>
            save("lowStockBadge", {
              enabled: String((e.target as HTMLInputElement).checked),
              threshold: String(lowStockBadge.threshold),
              message: lowStockBadge.message,
            })
          }
        />
        <s-number-field
          label="Show when stock is at or below"
          value={String(lowStockBadge.threshold)}
          onChange={(e: Event) =>
            save("lowStockBadge", {
              enabled: String(lowStockBadge.enabled),
              threshold: (e.target as HTMLInputElement).value,
              message: lowStockBadge.message,
            })
          }
        />
        <s-text-field
          label="Badge text (use {count} for the remaining stock)"
          value={lowStockBadge.message}
          onChange={(e: Event) =>
            save("lowStockBadge", {
              enabled: String(lowStockBadge.enabled),
              threshold: String(lowStockBadge.threshold),
              message: (e.target as HTMLInputElement).value,
            })
          }
        />
      </s-section>

      <s-section heading="Free shipping progress bar">
        <s-paragraph>
          Shows how much more a visitor needs to add to their cart to unlock
          free shipping.
        </s-paragraph>
        <s-switch
          label="Enable"
          checked={freeShippingBar.enabled || undefined}
          onChange={(e: Event) =>
            save("freeShippingBar", {
              enabled: String((e.target as HTMLInputElement).checked),
              thresholdCents: String(freeShippingBar.thresholdCents),
              message: freeShippingBar.message,
              successMessage: freeShippingBar.successMessage,
            })
          }
        />
        <s-number-field
          label="Free shipping threshold (cents)"
          value={String(freeShippingBar.thresholdCents)}
          onChange={(e: Event) =>
            save("freeShippingBar", {
              enabled: String(freeShippingBar.enabled),
              thresholdCents: (e.target as HTMLInputElement).value,
              message: freeShippingBar.message,
              successMessage: freeShippingBar.successMessage,
            })
          }
        />
        <s-text-field
          label="Progress text (use {remaining} for the amount left)"
          value={freeShippingBar.message}
          onChange={(e: Event) =>
            save("freeShippingBar", {
              enabled: String(freeShippingBar.enabled),
              thresholdCents: String(freeShippingBar.thresholdCents),
              message: (e.target as HTMLInputElement).value,
              successMessage: freeShippingBar.successMessage,
            })
          }
        />
        <s-text-field
          label="Success text (shown once unlocked)"
          value={freeShippingBar.successMessage}
          onChange={(e: Event) =>
            save("freeShippingBar", {
              enabled: String(freeShippingBar.enabled),
              thresholdCents: String(freeShippingBar.thresholdCents),
              message: freeShippingBar.message,
              successMessage: (e.target as HTMLInputElement).value,
            })
          }
        />
      </s-section>

      <s-section heading="Email capture in exit popup">
        <s-paragraph>
          Adds an email field to the exit-intent popup to capture leads from
          visitors who leave without buying.
        </s-paragraph>
        <s-switch
          label="Enable"
          checked={emailCapture.enabled || undefined}
          onChange={(e: Event) =>
            save("emailCapture", {
              enabled: String((e.target as HTMLInputElement).checked),
              message: emailCapture.message,
            })
          }
        />
        <s-text-field
          label="Email field prompt"
          value={emailCapture.message}
          onChange={(e: Event) =>
            save("emailCapture", {
              enabled: String(emailCapture.enabled),
              message: (e.target as HTMLInputElement).value,
            })
          }
        />
      </s-section>

      <s-section heading="Captured emails">
        <s-paragraph>
          Emails collected through the exit popup. Most recent 50 shown.
        </s-paragraph>
        {capturedLeads.length === 0 ? (
          <s-paragraph>
            <s-text color="subdued">No emails captured yet.</s-text>
          </s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Email</s-table-header>
              <s-table-header listSlot="secondary">Captured at</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {capturedLeads.map((lead) => (
                <s-table-row key={lead.id}>
                  <s-table-cell>{lead.email}</s-table-cell>
                  <s-table-cell>
                    {new Date(lead.createdAt).toLocaleString()}
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section slot="aside" heading="Exit popup preview">
        <s-paragraph>
          Static mock-up — reflects your popup text and discount code
          without needing to visit the storefront.
        </s-paragraph>
        <s-box background="subdued" padding="large" borderRadius="base">
          <s-stack justifyContent="center">
            <s-box
              background="base"
              padding="base"
              borderRadius="base"
              border="base"
              maxInlineSize="220px"
            >
              <s-stack gap="small-200">
                <s-paragraph>{exitPopup.message}</s-paragraph>
                {exitPopup.discountCode ? (
                  <s-paragraph>
                    <s-text type="strong">{exitPopup.discountCode}</s-text>
                  </s-paragraph>
                ) : null}
                {exitPopup.countdownSeconds > 0 ? (
                  <s-paragraph>
                    <s-text color="subdued">
                      Expires in {exitPopup.countdownSeconds}s
                    </s-text>
                  </s-paragraph>
                ) : null}
                {emailCapture.enabled ? (
                  <s-paragraph>
                    <s-text color="subdued">{emailCapture.message}</s-text>
                  </s-paragraph>
                ) : null}
                <s-button variant="secondary">Close</s-button>
              </s-stack>
            </s-box>
          </s-stack>
        </s-box>
      </s-section>

      <s-section slot="aside" heading="Blinking tab preview">
        <s-paragraph>
          What the browser tab title alternates with while the visitor is
          away with items in their cart.
        </s-paragraph>
        <s-box background="subdued" padding="base" borderRadius="base">
          <s-stack direction="inline" alignItems="center" gap="small-200">
            <s-badge tone="neutral">Tab</s-badge>
            <s-paragraph>{blinkingTab.message}</s-paragraph>
          </s-stack>
        </s-box>
      </s-section>

      <s-section slot="aside" heading="Storefront preview">
        <s-paragraph>
          Shopify storefronts block being embedded in another site&apos;s
          iframe, so a live preview can&apos;t render inside this page. Open
          the store in a new tab instead.
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
          the triggers.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
