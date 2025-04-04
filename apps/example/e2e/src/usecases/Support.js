import { reloadReactNative } from '../utils/retries'
import { waitForElementById } from '../utils/utils'

export default Support = () => {
  beforeEach(async () => {
    await reloadReactNative()
  })

  if (device.getPlatform() === 'ios') {
    jest.retryTimes(2)
    it("Display 'Contact' on Shake", async () => {
      await device.shake()
      await waitFor(element(by.id('HavingTrouble')))
        .toBeVisible()
        .withTimeout(5000)
      await waitFor(element(by.id('ShakeForSupport')))
        .toBeVisible()
        .withTimeout(5000)
      await element(by.id('ContactSupportFromShake')).tap()
      await waitFor(element(by.id('ContactTitle')))
        .toBeVisible()
        .withTimeout(5000)
      await waitFor(element(by.id('MessageEntry')))
        .toBeVisible()
        .withTimeout(5000)
      await expect(element(by.id('SwitchLogs'))).toHaveToggleValue(true)
      // TODO: enable when branding is present
      // await expect(element(by.id('Legal'))).toHaveText(
      //   'By submitting, I agree to share the above information and any attached application log data with Valora Support.'
      // )
    })
  }

  it('Send Message to Support', async () => {
    await waitForElementById('WalletHome/SettingsGearButton', { tap: true, timeout: 20_000 })
    await waitForElementById('SettingsMenu/Help', { tap: true })
    await waitFor(element(by.id('SupportContactLink')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('SupportContactLink')).tap()
    await waitFor(element(by.id('MessageEntry')))
      .toBeVisible()
      .withTimeout(10000)
    await element(by.id('MessageEntry')).tap()
    await element(by.id('MessageEntry')).typeText('This is a test from Valora')
    await expect(element(by.id('MessageEntry'))).toHaveText('This is a test from Valora')
  })
}
