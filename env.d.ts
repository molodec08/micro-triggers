/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

// @shopify/polaris-types@1.0.7 не объявляет <s-app-nav> (App nav web component,
// см. https://shopify.dev/docs/apps/design/navigation), хотя рантайм его
// поддерживает. Временный локальный патч типов до выхода версии пакета
// с этим тегом — удалить, когда `s-app-nav` появится в polaris-types.
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
