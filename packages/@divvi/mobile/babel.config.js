module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    // NOTE: Reanimated plugin has to be listed last.
  ],
}
