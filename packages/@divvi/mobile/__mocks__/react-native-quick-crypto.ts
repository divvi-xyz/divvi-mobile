// Mock the install function that sets up global polyfills
const install = jest.fn()

module.exports = {
  ...jest.requireActual('crypto'),
  install,
}
