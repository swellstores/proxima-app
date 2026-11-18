# Proxima: Shopify-style themes on Swell

**Proxima** is a Swell storefront app, built with Astro and React, that runs Shopify-style Liquid themes on Swell. It renders Online Store 2.0 templates, sections and blocks against your Swell catalog, so a store moving to Swell can keep the theme it already has, and developers can keep working in Liquid.

> **Starting a new storefront?** Swell recommends [Wave](https://developers.swell.is/app-guides/wave), a storefront editor with an AI agent built in. Wave can import a Shopify theme too: it rebuilds the theme as a native Wave theme, keeping your content, colors, fonts and photos, and then you edit it by asking in plain words or by clicking. Wave themes can also place widgets from installed apps, show data from apps and run app actions, which Proxima doesn't support. Proxima keeps running for the stores built on it, and it's the right choice when you need a Liquid theme to run as it is.

## 📦 Deployment

Proxima is designed to deploy on Cloudflare Pages for optimal performance. It can run a production store, and it also works as an example for building your own Swell storefront app.

👉 [Documentation](https://developers.swell.is/storefronts/proxima-app)

## 🌟 Features

- **🛍️ Complete ecommerce experience**: Full-featured storefront with product listings, cart management, checkout, and customer accounts
- **🎨 Adaptable design**: Customizable theme systemusing sections and blocks, compatible with Shopify themes
- **🌐 Multi-language & multi-currency**: Full internationalization support
- **📱 Responsive**: Mobile-first design that works across all devices

## 🚀 Capabilities

- **Cross-selling & upselling**: Product recommendations and sticky add-to-cart features
- **Account management**: Customer registration, login, order history, and subscription management
- **Content management**: Blog system, custom pages, and flexible content sections
- **Search & navigation**: Advanced search functionality with category filtering
- **Bulk pricing**: Support for wholesale and volume pricing tiers
- **Subscription commerce**: Built-in support for recurring payments and subscriptions

## 🛍️ Shopify theme compatibility

One of Proxima's most powerful features is its **Shopify compatibility layer**, enabling merchants to use existing Shopify themes with minimal modifications:

### ✨ What's supported

- **Liquid templates**: Complete support for Shopify's Liquid templating language
- **Theme objects**: Most Shopify Liquid objects, filters, and tags are supported
- **Page templates**: Direct mapping between Swell and Shopify page types
- **Forms**: All standard Shopify forms (login, cart, checkout, etc.) work seamlessly
- **Sections & layouts**: Full compatibility with Shopify's Online Store 2.0 framework

### 🔄 Template mapping

Proxima automatically converts Shopify page types to Swell equivalents:

| Shopify Template | Proxima Template | Description |
|------------------|------------------|-------------|
| `index.liquid` | `index.json` | Homepage |
| `product.liquid` | `products/product.json` | Product detail page |
| `collection.liquid` | `categories/category.json` | Category/collection page |
| `list-collections.liquid` | `categories/index.json` | Category listing |
| `page.liquid` | `pages/page.json` | Content pages |
| `blog.liquid` | `blogs/category.json` | Blog category |
| `article.liquid` | `blogs/blog.json` | Blog article |
| `customers/*.liquid` | `account/*.json` | Customer account pages |

### 🎛️ Advanced features

- **Dynamic object conversion**: Swell objects are automatically converted to Shopify-compatible formats
- **Form compatibility**: Shopify form patterns work without modification
- **Route mapping**: Shopify URLs are mapped to equivalent Swell routes
- **Theme editor support**: Works with Swell's visual theme editor

### 🚀 Migration benefits

- **Cost effective**: Reuse existing Shopify theme investments
- **Developer friendly**: Leverage existing Shopify development expertise
- **Time saving**: Minimal code changes required for theme migration
- **Future proof**: Access to Swell's advanced commerce features while maintaining familiar theme structure

## 📂 Project structure

```text
proxima/
├── frontend/                    # Astro frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── layouts/            # Page layout templates
│   │   ├── pages/              # Route definitions and page components
│   │   │   ├── account/        # Customer account pages
│   │   │   ├── blogs/          # Blog and content pages
│   │   │   ├── cart/           # Shopping cart functionality
│   │   │   ├── categories/     # Product category pages
│   │   │   ├── products/       # Product listing and detail pages
│   │   │   └── search/         # Search functionality
│   │   ├── resources/          # Data fetching and API integration
│   │   ├── forms/              # Form handling components
│   │   └── utils/              # Utility functions and helpers
│   └── public/                 # App's own static assets
├── assets/                     # App assets and marketing materials
├── settings/                   # App configuration settings
└── swell.json                  # Swell app configuration
```

## 🛠️ Development

### Prerequisites

- Node.js 18.16.1 or higher
- npm, yarn, or pnpm
- [Swell CLI](https://developers.swell.is/apps/cli) installed globally

### Installing Swell CLI

```bash
npm install -g @swell/cli
```

### Creating your own version

To create your own custom storefront app based on Proxima:

1. **Clone the Proxima repository**
   ```bash
   git clone https://github.com/swellstores/proxima-app.git my-storefront-app
   cd my-storefront-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Swell**
   ```bash
   swell login
   ```

4. **Push the app to your development store**
   ```bash
   swell app push
   ```

5. **Start development mode**
   ```bash
   swell app dev
   ```
   This will start the local development server and open your browser to preview the app

### Development workflow

- **Local development**: Use `swell app dev` to run the app locally with live reloading
- **Push changes**: Use `swell app push` to sync configuration changes to your development store
- **Watch mode**: Use `swell app watch` to automatically push changes as you develop
- **Deploy frontend**: Use `swell app frontend deploy` to deploy your frontend to Cloudflare Pages

### Available scripts

| Command                        | Description                                         |
| :----------------------------- | :-------------------------------------------------- |
| `swell app dev`                | Start development server with live reloading       |
| `swell app push`               | Push app configuration to development store         |
| `swell app watch`              | Watch for changes and auto-push configurations     |
| `swell app frontend deploy`    | Deploy frontend to Cloudflare Pages                |
| `swell app info`               | Show app information and status                     |
| `npm run build`                | Build production version locally                    |

### Advanced development

- **Theme development**: Use `swell theme dev --local` to develop themes alongside your app
- **Multiple storefronts**: Use `--storefront-select` to choose which storefront to preview
- **Version management**: Use `swell app version` to manage app versions
- **Release**: Use `swell app release` to publish new versions to the App Store

## 🏗️ Architecture

Proxima is built using modern web technologies:

- **Frontend**: Astro + React for optimal performance and developer experience
- **Deployment**: Cloudflare Pages with edge computing capabilities
- **API integration**: Swell Apps SDK for seamless ecommerce functionality
- **Styling**: Component-based styling with theme customization
- **Testing**: Jest for unit testing

## 🔧 Configuration

The app is configured through several key files:

- `swell.json`: Defines app metadata, page routes, and Swell integration
- `astro.config.mjs`: Astro framework configuration
- `package.json`: Dependencies and build scripts
- `.swellrc`: Swell CLI configuration

## 🎨 Theming

Proxima includes a flexible theming system that allows for:

- Custom color schemes and branding
- Configurable layout sections
- Responsive design components
- Template overrides for custom functionality

## � Deployment

Proxima is designed to deploy on Cloudflare Pages for optimal performance:

1. Build the frontend: `npm run build`
2. Deploy using Swell CLI or Cloudflare Pages directly
3. Configure environment variables for your Swell store

## 🤝 Contributing

Proxima is open source. To customize it:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📚 Resources

- [Swell Documentation](https://developers.swell.is/)
- [Proxima Documentation](https://developers.swell.is/storefronts/proxima-app)
- [Astro Documentation](https://docs.astro.build)
- [Storefront App Development](https://developers.swell.is/storefronts/storefront-app-guide)
- [Swell Apps SDK](https://github.com/swellstores/swell-apps-sdk)
- [Swell CLI Documentation](https://developers.swell.is/apps/cli)

## 📄 License

See the [LICENSE](LICENSE) file for details.

---

**Proxima** is maintained by the Swell team. It is one of the storefront apps Swell builds, each suited to different needs.
