import { reloadReactNative } from '../utils/retries'
import { navigateToSecurity } from '../utils/navigation'

export default RequirePIN = () => {
  it('Then should be require PIN on app open', async () => {
    await navigateToSecurity()
    // Request Pin on App Open disabled by default
    await element(by.id('requirePinOnAppOpenToggle')).tap()
    await expect(element(by.id('requirePinOnAppOpenToggle'))).toHaveToggleValue(true)
    // Reload to simulate new app load from background
    await reloadReactNative()
    // Check that PIN is required
    await waitFor(element(by.text('Enter PIN'))).toBeVisible()
  })
}
