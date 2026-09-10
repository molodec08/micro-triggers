import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  if (!session || !admin) {
    return Response.json({ error: "unknown shop" }, { status: 401 });
  }

  const url = new URL(request.url);
  const variantId = url.searchParams.get("variantId");

  if (!variantId || !/^\d+$/.test(variantId)) {
    return Response.json({ error: "invalid variantId" }, { status: 400 });
  }

  const response = await admin.graphql(
    `#graphql
    query variantInventory($id: ID!) {
      productVariant(id: $id) {
        inventoryQuantity
        inventoryPolicy
        inventoryItem {
          tracked
        }
      }
    }`,
    { variables: { id: `gid://shopify/ProductVariant/${variantId}` } },
  );

  const { data } = await response.json();
  const variant = data?.productVariant;

  if (!variant || !variant.inventoryItem?.tracked) {
    return Response.json(
      { tracked: false, quantity: null },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  }

  return Response.json(
    { tracked: true, quantity: variant.inventoryQuantity },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
};
