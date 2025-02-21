---
sidebar_position: 1
sidebar_label: Getting started
---

# Getting Started with Divvi Mobile

Build a fully functional blockchain wallet app in minutes with just a few lines of code. Divvi Mobile provides a complete foundation, including wallet setup, token transactions, and onboarding, so that you can focus on what makes your app unique.

## Why Use Divvi Mobile?

✅ **Launch faster** – Spin up a mobile wallet app with built-in onboarding, cash-in, swap, and send flows.

✅ **Customizable look and feel** – Adjust feature visibility, colors, and assets to match your brand.

✅ **Flexible integrations** – Add custom screens and flows while keeping essential wallet functionality intact.

✅ **Divvi Protocol built in** – Earn rewards from the value your users bring to integrated protocols.

With Divvi Mobile, you don’t have to worry about how users will acquire a wallet or tokens. Instead, you can focus on what sets your app apart while Divvi Mobile ensures your users have everything they need to get started.

## Basic Prerequisites

You'll need:

- [Node.js (LTS)](https://nodejs.org/en/)
- macOS or Linux operating system
- [Yarn](https://yarnpkg.com/getting-started/install) package manager

## Creating Your First App

1. Create a new app using our template:

```bash
yarn create expo --template https://github.com/divvi-xyz/beefy my-app
cd my-app
```

2. Install dependencies:

```bash
yarn install
```

## Setting Up Your Development Environment

Before running your app, you'll need to set up your development environment. While we use Expo's build tools, Divvi Mobile requires a native development environment (it cannot run in Expo Go).

Follow Expo's interactive setup guide:

[Set up your development environment →](https://docs.expo.dev/get-started/set-up-your-environment/?mode=development-build)

The guide will walk you through setting up:

- iOS development environment (macOS only)
  - Xcode and iOS Simulator
- Android development environment
  - Android Studio, SDK, and Emulator
- Required tools and dependencies

Make sure to select "Development build" mode in the guide, as this is required for Divvi Mobile apps.

## Running Your App

Once your environment is set up, you can run your app:

For iOS (macOS only):

```bash
yarn ios
```

For Android:

```bash
yarn android
```

This will build your app and launch it in your simulator/emulator. The development server will start automatically.

## What's Next?

- Learn how to [configure your app](configuration.md)
- Explore the [architecture](architecture.md)
- Browse the [API reference](api-reference.md)

## Need Help?

If you run into any issues or have questions:

- Open an issue on our [GitHub repository](https://github.com/divvi-xyz/divvi-mobile)
- Join our community [Discord server](https://discord.com/invite/EaxZDhMuDn)
- Coming soon: check our troubleshooting guide
