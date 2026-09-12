import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

const FONT_FAMILIES = [
  { value: "inherit", label: "Match theme font" },
  { value: "sans-serif", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: "Helvetica" },
];

const FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
];

const ANIMATIONS = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const styling = await db.triggerStyleSettings.findUnique({
    where: { shop },
  });

  return {
    styling: {
      useThemeStyles: styling?.useThemeStyles ?? true,
      backgroundColor: styling?.backgroundColor ?? "#ffffff",
      textColor: styling?.textColor ?? "#111111",
      accentColor: styling?.accentColor ?? "#2c6ecb",
      fontFamily: styling?.fontFamily ?? "inherit",
      fontSize: styling?.fontSize ?? 14,
      fontWeight: styling?.fontWeight ?? "normal",
      borderRadius: styling?.borderRadius ?? 8,
      boxShadow: styling?.boxShadow ?? true,
      animation: styling?.animation ?? "fade",
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const bool = (name: string) => formData.get(name) === "true";
  const str = (name: string) => String(formData.get(name) ?? "");
  const int = (name: string, fallback: number, min = 0) => {
    const value = Number(formData.get(name));
    if (!Number.isFinite(value)) return fallback;
    return Math.max(value, min);
  };

  const useThemeStyles = bool("useThemeStyles");
  const backgroundColor = str("backgroundColor") || "#ffffff";
  const textColor = str("textColor") || "#111111";
  const accentColor = str("accentColor") || "#2c6ecb";
  const fontFamily = str("fontFamily") || "inherit";
  const fontSize = int("fontSize", 14, 8);
  const fontWeight = str("fontWeight") || "normal";
  const borderRadius = int("borderRadius", 8, 0);
  const boxShadow = bool("boxShadow");
  const animation = str("animation") || "fade";

  await db.triggerStyleSettings.upsert({
    where: { shop },
    create: {
      shop,
      useThemeStyles,
      backgroundColor,
      textColor,
      accentColor,
      fontFamily,
      fontSize,
      fontWeight,
      borderRadius,
      boxShadow,
      animation,
    },
    update: {
      useThemeStyles,
      backgroundColor,
      textColor,
      accentColor,
      fontFamily,
      fontSize,
      fontWeight,
      borderRadius,
      boxShadow,
      animation,
    },
  });

  return { ok: true };
};

export default function Styling() {
  const { styling } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const save = (fields: Record<string, string>) => {
    fetcher.submit(fields, { method: "POST" });
  };

  const allFields = (overrides: Record<string, string>) => ({
    useThemeStyles: String(styling.useThemeStyles),
    backgroundColor: styling.backgroundColor,
    textColor: styling.textColor,
    accentColor: styling.accentColor,
    fontFamily: styling.fontFamily,
    fontSize: String(styling.fontSize),
    fontWeight: styling.fontWeight,
    borderRadius: String(styling.borderRadius),
    boxShadow: String(styling.boxShadow),
    animation: styling.animation,
    ...overrides,
  });

  return (
    <s-page heading="Popup &amp; bar styling">
      <s-section heading="Match your theme">
        <s-paragraph>
          By default, popups and bars pick up your theme&apos;s background,
          text and font colors automatically. Turn this off to set your own
          colors and font instead.
        </s-paragraph>
        <s-switch
          label="Use theme styles"
          checked={styling.useThemeStyles || undefined}
          onChange={(e: Event) =>
            save(
              allFields({
                useThemeStyles: String(
                  (e.target as HTMLInputElement).checked,
                ),
              }),
            )
          }
        />
      </s-section>

      {!styling.useThemeStyles ? (
        <s-section heading="Custom colors">
          <s-text-field
            label="Background color (hex)"
            value={styling.backgroundColor}
            onChange={(e: Event) =>
              save(
                allFields({
                  backgroundColor: (e.target as HTMLInputElement).value,
                }),
              )
            }
          />
          <s-text-field
            label="Text color (hex)"
            value={styling.textColor}
            onChange={(e: Event) =>
              save(
                allFields({ textColor: (e.target as HTMLInputElement).value }),
              )
            }
          />
          <s-text-field
            label="Accent color (buttons, hex)"
            value={styling.accentColor}
            onChange={(e: Event) =>
              save(
                allFields({
                  accentColor: (e.target as HTMLInputElement).value,
                }),
              )
            }
          />
        </s-section>
      ) : null}

      {!styling.useThemeStyles ? (
        <s-section heading="Custom font">
          <s-select
            label="Font family"
            value={styling.fontFamily}
            onChange={(e: Event) =>
              save(
                allFields({
                  fontFamily: (e.target as HTMLSelectElement).value,
                }),
              )
            }
          >
            {FONT_FAMILIES.map((font) => (
              <s-option key={font.value} value={font.value}>
                {font.label}
              </s-option>
            ))}
          </s-select>
          <s-number-field
            label="Font size (px)"
            value={String(styling.fontSize)}
            onChange={(e: Event) =>
              save(
                allFields({ fontSize: (e.target as HTMLInputElement).value }),
              )
            }
          />
          <s-select
            label="Font weight"
            value={styling.fontWeight}
            onChange={(e: Event) =>
              save(
                allFields({
                  fontWeight: (e.target as HTMLSelectElement).value,
                }),
              )
            }
          >
            {FONT_WEIGHTS.map((weight) => (
              <s-option key={weight.value} value={weight.value}>
                {weight.label}
              </s-option>
            ))}
          </s-select>
        </s-section>
      ) : null}

      <s-section heading="Shape &amp; animation">
        <s-paragraph>
          These apply whether or not you use theme colors.
        </s-paragraph>
        <s-number-field
          label="Corner radius (px)"
          value={String(styling.borderRadius)}
          onChange={(e: Event) =>
            save(
              allFields({ borderRadius: (e.target as HTMLInputElement).value }),
            )
          }
        />
        <s-switch
          label="Drop shadow"
          checked={styling.boxShadow || undefined}
          onChange={(e: Event) =>
            save(
              allFields({
                boxShadow: String((e.target as HTMLInputElement).checked),
              }),
            )
          }
        />
        <s-select
          label="Appear animation"
          value={styling.animation}
          onChange={(e: Event) =>
            save(
              allFields({ animation: (e.target as HTMLSelectElement).value }),
            )
          }
        >
          {ANIMATIONS.map((anim) => (
            <s-option key={anim.value} value={anim.value}>
              {anim.label}
            </s-option>
          ))}
        </s-select>
      </s-section>

      <s-section slot="aside" heading="Preview">
        <s-paragraph>
          Approximate look of a popup with the current settings. Actual
          appearance on your storefront may vary slightly by theme.
        </s-paragraph>
        <s-box background="subdued" padding="large" borderRadius="base">
          <s-stack justifyContent="center">
            <div
              style={{
                background: styling.useThemeStyles
                  ? "var(--p-color-bg-surface, #fff)"
                  : styling.backgroundColor,
                color: styling.useThemeStyles
                  ? "var(--p-color-text, #111)"
                  : styling.textColor,
                fontFamily: styling.useThemeStyles
                  ? "inherit"
                  : styling.fontFamily,
                fontSize: styling.useThemeStyles
                  ? "14px"
                  : `${styling.fontSize}px`,
                fontWeight: styling.useThemeStyles
                  ? "normal"
                  : styling.fontWeight,
                borderRadius: `${styling.borderRadius}px`,
                boxShadow: styling.boxShadow
                  ? "0 8px 24px rgba(0,0,0,0.2)"
                  : "none",
                padding: "20px 24px",
                textAlign: "center",
                maxWidth: 220,
              }}
            >
              <p style={{ margin: "0 0 12px" }}>
                Wait! Here&apos;s a discount for you
              </p>
              <button
                type="button"
                style={{
                  border: "none",
                  borderRadius: `${styling.borderRadius}px`,
                  background: styling.useThemeStyles
                    ? "var(--p-color-bg-fill-brand, #2c6ecb)"
                    : styling.accentColor,
                  color: "#fff",
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </s-stack>
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
