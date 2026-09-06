import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function App() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Micro-triggers of attention</h1>
        <p className={styles.text}>
          Three lightweight triggers that bring shoppers back to their cart —
          install from the Shopify App Store.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Blinking browser tab</strong>. Changes the tab title when a
            visitor leaves the page with an item in their cart.
          </li>
          <li>
            <strong>Exit-intent popup</strong>. A minimal popup with text and a
            discount code, triggered when the cursor moves toward the top of
            the window.
          </li>
          <li>
            <strong>Sound alert</strong>. Plays a sound when a product is added
            to the cart or at checkout.
          </li>
        </ul>
      </div>
    </div>
  );
}
