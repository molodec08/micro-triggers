import type { LoaderFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "unknown shop" }, { status: 401 });
  }

  const url = new URL(request.url);
  const variantId = url.searchParams.get("variantId");

  if (!variantId || !/^\d+$/.test(variantId)) {
    return Response.json({ error: "invalid variantId" }, { status: 400 });
  }

  const { admin } = await unauthenticated.admin(session.shop);

  const response = await admin.graphql(
    `#graphql
    query ProductVariantInventory($id: ID!) {
      productVariant(id: $id) {
        inventoryQuantity
      }
    }`,
    { variables: { id: `gid://shopify/ProductVariant/${variantId}` } },
  );

  const { data } = await response.json();
  const quantity = data?.productVariant?.inventoryQuantity;

  return Response.json(
    { quantity: typeof quantity === "number" ? quantity : null },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
};
