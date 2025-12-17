// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('wallet-stack/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

module.exports = config
