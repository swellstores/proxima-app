# Overview

Proxima runs Shopify-style themes on Swell. It renders Liquid templates, with Online Store 2.0 sections and blocks, against your Swell catalog, so a store moving to Swell can keep the theme it already has, and developers can keep working in Liquid.

**Bringing a Shopify theme to Swell?** Swell also makes Wave, a storefront editor with an AI agent built in. Wave can import a Shopify theme too: it rebuilds the theme as a native Wave theme, keeping your content, colors, fonts and photos, and then you edit it by asking in plain words or by clicking. For new storefronts we recommend trying Wave's import first. Proxima keeps running for the stores built on it, and it's the right choice when you need a Liquid theme to run as it is.

## Pages

- Product list: category and all-products pages, with instant filtering by category, price and product attributes.
- Product detail: full product information with option and variant selection, related products, and AJAX cart interactions.
- Pages: build your home page and other content pages from modular sections.
- Account: view and edit orders, subscriptions, addresses and saved payment methods.
- Cart: view and edit cart items, with AJAX endpoints for changing quantity and options and removing items.
- Search: search-as-you-type across the store's whole product catalog.
- Blog list: blog posts by category, each with a preview image and summary.
- Blog detail: the full text and images of a post, with its SEO fields.

## Developers

Proxima is an open-source Astro application that renders Swell's flavor of Liquid templates (LiquidX). You can build themes for it to offer different designs and frontend functionality, or duplicate the app and use it as a starter for a custom storefront. To be hosted on Swell, the app must use only Cloudflare Workers runtime APIs.
