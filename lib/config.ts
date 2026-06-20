// Lemon Squeezy config. All of these are safe in the browser — LS's license
// validate/activate endpoints are designed to be called client-side, so no
// secret lives here and no ReplyDesk server is needed.
//
// Fill these from your Lemon Squeezy dashboard once your product exists, either
// here directly or via NEXT_PUBLIC_* env vars on Vercel.
export const LS = {
  // Product → Share → "Checkout URL"  (e.g. https://YOURSTORE.lemonsqueezy.com/buy/XXXXXXXX)
  checkoutUrl: process.env.NEXT_PUBLIC_LS_CHECKOUT_URL ?? "",
  // Numeric store + product id, so a license from a different store/product can't unlock this app.
  storeId: process.env.NEXT_PUBLIC_LS_STORE_ID ?? "",
  productId: process.env.NEXT_PUBLIC_LS_PRODUCT_ID ?? "",
  // Shown on the upgrade button.
  price: process.env.NEXT_PUBLIC_LS_PRICE ?? "$149/yr",
};

export const PRODUCT_NAME = "ReplyDesk Pro";
