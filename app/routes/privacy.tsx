export default function Privacy() {
  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "48px 24px",
        fontFamily: "sans-serif",
        lineHeight: 1.6,
        color: "#1a1a1a",
      }}
    >
      <h1>Privacy Policy — Micro-triggers</h1>
      <p>Last updated: July 21, 2026</p>

      <h2>What data we collect</h2>
      <p>
        Micro-triggers stores only the merchant-configured settings for its
        three storefront triggers (blinking browser tab, exit-intent popup,
        and sound alert): whether each trigger is enabled, the trigger's
        message text, and the optional discount code. This data is
        associated with the shop's domain and stored in our own database.
      </p>

      <h2>What data we do not collect</h2>
      <p>
        Micro-triggers does not access or store any customer data. It does
        not use the Shopify Admin API to read orders, customers, or products.
        The storefront script reads the current cart contents
        (<code>/cart.js</code>) only to decide whether to show a trigger, and
        does not transmit or store this information.
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        We respond to Shopify's mandatory <code>app/uninstalled</code>{" "}
        webhook when a merchant uninstalls the app. To request deletion of
        your shop's stored trigger settings, contact us using the email
        below.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href="mailto:mopemah2014@gmail.com">mopemah2014@gmail.com</a>.
      </p>
    </div>
  );
}
