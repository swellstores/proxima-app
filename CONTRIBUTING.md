# Contributing to Proxima

Proxima is a free, open-source Swell app under the [MIT license](LICENSE). Bug reports, fixes and improvements are welcome.

## Report a problem

Open an issue at https://github.com/swellstores/proxima-app/issues. Say what you did, what you expected and what happened instead. Leave out API keys, customer data and other secrets. For help with your own store, email support@swell.is.

## Make a change

1. Fork the repository and create a branch for your change.
2. Install the dependencies with `npm install`, and the [Swell CLI](https://developers.swell.is/apps/cli).
3. Sign in with `swell login` and choose a development store. Partners get development stores from the [partner dashboard](https://swell.is/partners).
4. Run `swell app push` to install your copy in the store's test environment, and try your change there.
5. Run `npm run test` before you open a pull request.
6. Open a pull request that describes the change and how you tested it.

Swell reviews pull requests and publishes accepted changes in a new version of the app on the Swell App Store.

## Publish your own version

The MIT license lets you change the app and publish your own version. Give it its own `id`, `name` and icon in `swell.json` so it isn't presented as Swell's app, then submit it from your partner account. See [App Store submission](https://developers.swell.is/apps/app-store-submission).
