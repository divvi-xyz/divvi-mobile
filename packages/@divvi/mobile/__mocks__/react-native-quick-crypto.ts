// We use the node crypto module in tests, but we need to mock the install function that is present in react-native-quick-crypto
const install = jest.fn()

module.exports = {
  ...jest.requireActual('crypto'),
  install,
}
