# Wallet Stack Framework

[![Checks](https://github.com/valora-inc/wallet-stack/actions/workflows/check.yml/badge.svg)](https://github.com/valora-inc/wallet-stack/actions/workflows/check.yml)
[![E2E](https://github.com/valora-inc/wallet-stack/actions/workflows/e2e-main.yml/badge.svg)](https://github.com/valora-inc/wallet-stack/actions/workflows/e2e-main.yml)
[![Tests](https://github.com/valora-inc/wallet-stack/actions/workflows/test.yml/badge.svg)](https://github.com/valora-inc/wallet-stack/actions/workflows/test.yml)
[![Codecov](https://codecov.io/gh/valora-inc/wallet-stack/branch/main/graph/badge.svg)](https://codecov.io/gh/valora-inc/wallet-stack)
[![GitHub contributors](https://img.shields.io/github/contributors/valora-inc/wallet-stack)](https://github.com/valora-inc/wallet-stack/graphs/contributors)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)

Wallet Stack represents five years of battle-tested mobile Web3 development, originally created for the Valora wallet. We've refined these building blocks through millions of user interactions, real-world security challenges, and continuous improvements to create exceptional Web3 mobile experiences.

Built on top of [Expo](https://expo.dev), the industry standard for React Native development, Wallet Stack combines proven Web3 capabilities with modern mobile development tools. Now, we're making these powerful tools available to all builders. Our mission is to empower developers to create the next generation of Web3 mobile apps, scaling beyond Valora to support a diverse ecosystem of applications.

## Features

- 🚀 **Rapid Development**: Create a fully functional Web3 app in minutes
- 🎨 **Full Customization**: Control every aspect of your app's look and feel
- ⛓️ **Multi-Chain Support**: Built-in support for major networks:
  - Ethereum Mainnet
  - Celo Mainnet
  - Arbitrum One
  - Optimism Mainnet
  - Polygon PoS
  - Base
- 🔌 **Protocol Integration**: Native support for the Divvi protocol
- 📱 **App Store Ready**: Streamlined deployment process using Expo EAS

## Quick Start

```bash
yarn create expo --template https://github.com/valora-inc/wallet-stack-starter my-app
cd my-app
yarn install
```

For iOS:

```bash
yarn ios
```

For Android:

```bash
yarn android
```

Visit our [Getting Started Guide](docs/getting-started.md) for detailed instructions.

## Documentation

- [Getting Started](docs/getting-started.md) - Create your first app
- [Configuration](docs/configuration.md) - Customize your app
- [Architecture](docs/architecture.md) - Understand the framework
- [API Reference](docs/reference) - Explore the API

## Example App

Check out our example app in the `apps/example` directory for a complete implementation showcasing the framework's capabilities.

## Development Environment

The framework requires a native development environment:

- iOS development (macOS only)
- Android development

Follow Expo's [environment setup guide](https://docs.expo.dev/get-started/set-up-your-environment/?mode=development-build) for detailed instructions.

## Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting issues or pull requests.

## Security

Found a security issue? Please report it following our [Security Policy](SECURITY.md).

## Community

- 💬 Join our [Discord](https://discord.com/invite/EaxZDhMuDn)
- 🐦 Follow us on [X](https://x.com/letsdivvi)
- 📝 Read our [Blog](https://blog.divvi.xyz)

## License

This project is licensed under the [Apache License 2.0](LICENSE).
