import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['.github/scripts/*.ts', './scripts/**/*.js'],
      ignoreBinaries: [
        // Maybe we can remove these once we upgrade knip?
        // See https://github.com/webpro-nl/knip/issues/735
        'e2e:prebuild', // used in workflows to build the example app
        'e2e:build:android-release', // used in workflows to build the example app
        'typecheck', // used in workflows to typecheck the example app
        'build:plugin', // used in postinstall script
        'ts-node', // used in workflows run by github actions from the example app dir
      ],
      ignoreDependencies: [
        '@actions/github', // used in workflows
        '@semantic-release/commit-analyzer', // imported by multi-semantic-release
        '@semantic-release/github', // imported by multi-semantic-release
        '@semantic-release/npm', // imported by multi-semantic-release
        '@semantic-release/release-notes-generator', // imported by multi-semantic-release
        'conventional-changelog-conventionalcommits', // used by semantic-release config preset
      ],
      ignore: [
        'scripts/dep-mismatch-check.ts', // Used to check for dependency mismatches across package.json files
      ],
    },
    'apps/example': {
      entry: [
        'index.tsx!',
        'metro.config.js!',
        'detox.config.js!',
        'plugins/**/*.{js,ts}',
        'e2e/**/*.{js,ts}',
      ],
      ignoreDependencies: [
        '@babel/core', // needed for react-native
        // TODO: these ignores should be unnecessary once we use a recent version of knip with th expo plugin
        // See https://github.com/webpro-nl/knip/pull/879
        'expo-build-properties', // used in app.json
        'expo-dev-client', // used in app.json
        '@config-plugins/detox', // used in app.json
        'babel-preset-expo', // not listed in package.json so we use the version used by expo
        'ts-node', // used in workflows run by github actions from the example app dir
        '@walletconnect/core', // used in e2e tests via @walletconnect/sign-client
        'tslib', // for some reason this is triggered after applying multiple tsconfigs to "extends" of apps/example/tsconfig.json
        '@tsconfig/node-lts', // used in e2e/tsconfig.json
      ],
    },
    'packages/@divvi/mobile': {
      entry: ['index.js!', 'metro-config.js!', './scripts/**/*.js'],
      project: ['src/**/*.ts!', 'src/**/*.tsx!', 'src/**/*.js!'],
      ignoreDependencies: [
        'babel-jest',
        'jest-html-reporter',
        'jest-junit',
        'jest-snapshot',
        'react-native-kill-packager',
        'typescript-json-schema', // helps manage redux state migrations
        'ts-node', // used in workflows run by github actions from the example app dir
        '@types/jest',
        '@tsconfig/node-lts', // used in plugin/tsconfig.json
      ],
      ignore: [
        'src/redux/reducersForSchemaGeneration.ts', // used for root state schema generation
        'src/analytics/docs.ts', // documents analytics events, no references
      ],
    },
  },
}

export default config
