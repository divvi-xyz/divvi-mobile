import { launchApp } from '../utils/retries'
import { navigateToSecurity } from '../utils/navigation'
import { enterPinUi, quickOnboarding, waitForElementById, sleep } from '../utils/utils'

import jestExpect from 'expect'

const startBackupFromNotifications = async () => {
  await waitForElementById('WalletHome/NotificationBell', { tap: true })
  await element(by.text('Back up now')).tap()
  await enterPinUi()
  await waitForElementById('WalletSecurityPrimer/GetStarted', { tap: true })
  await waitForElementById('keylessBackupIntro/RecoveryPhrase', { tap: true })
  await element(by.id('SetUpAccountKey')).tap()

  // Go through education
  for (let i = 0; i < 4; i++) {
    await element(by.id('Education/progressButton')).tap()
  }

  await expect(element(by.id('AccountKeyWordsContainer'))).toBeVisible()
}

const arriveAtHomeScreen = async () => {
  // Arrived to Home screen
  await waitForElementById('HomeAction-Send')
}

const completeProtectWalletScreen = async () => {
  await expect(element(by.id('recoveryPhraseCard'))).toBeVisible()
  await element(by.id('recoveryPhraseCard')).tap()
  await enterPinUi()
  await expect(element(by.id('protectWalletBottomSheetContinue'))).toBeVisible()
  await element(by.id('protectWalletBottomSheetContinue')).tap()
}

export default NewAccountOnboarding = () => {
  let testRecoveryPhrase, testAccountAddress
  beforeAll(async () => {
    await device.terminateApp()
    await sleep(5000)
    await launchApp({
      delete: true,
      launchArgs: {
        onboardingOverrides: 'EnableBiometry,ProtectWallet,PhoneVerification,CloudBackup',
      },
    })
    await sleep(5000)
  })

  it('Create a new account', async () => {
    await waitForElementById('CreateAccountButton', { tap: true })

    // Accept Terms
    await element(by.id('scrollView')).scrollTo('bottom')
    await expect(element(by.id('AcceptTermsButton'))).toBeVisible()
    await element(by.id('AcceptTermsButton')).tap()

    // Set & Verify pin
    await enterPinUi()
    await enterPinUi()

    // Protect Wallet screen
    await completeProtectWalletScreen()

    // Skip Phone Number verification
    await element(by.id('PhoneVerificationSkipHeader')).tap()

    // Arrived to Home screen
    await arriveAtHomeScreen()

    // Able to open settings
    await waitForElementById('WalletHome/SettingsGearButton', { tap: true })
    await element(by.id('Times')).tap()
  })

  it('Should be able to exit recovery phrase flow', async () => {
    await startBackupFromNotifications()
    await waitFor(element(by.text('Cancel')))
      .toBeVisible()
      .withTimeout(10 * 1000)
    await element(by.text('Cancel')).tap()

    // Cancel modal is shown
    await waitFor(element(by.text('Set Up Later')))
      .toBeVisible()
      .withTimeout(10 * 1000)
    await element(by.text('Set Up Later')).tap()

    // App doesn't crash and we arrive at the home screen
    await arriveAtHomeScreen()
  })

  it('Setup Recovery Phrase', async () => {
    await startBackupFromNotifications()

    const attributes = await element(by.id('AccountKeyWordsContainer')).getAttributes()
    testRecoveryPhrase = attributes.label

    await element(by.id('backupKeySavedSwitch')).longPress()
    await element(by.id('backupKeyContinue')).tap()
    for (const word of testRecoveryPhrase.split(' ')) {
      await element(by.id(`backupQuiz/${word}`)).tap()
    }
    await element(by.id('QuizSubmit')).tap()

    // Backup complete screen is served
    await waitFor(element(by.id('BackupComplete')))
      .toBeVisible()
      .withTimeout(10 * 1000)

    // Navigated to Home screen
    await waitFor(element(by.id('HomeAction-Send')))
      .toBeVisible()
      .withTimeout(10 * 1000)
  })

  it('Account Address shown in profile / menu', async () => {
    await waitForElementById('WalletHome/SettingsGearButton', { tap: true })
    await waitForElementById('SettingsMenu/Address', { tap: true })

    const accountAddressElement = await element(by.id('address')).getAttributes()
    const accountAddressText = accountAddressElement.text.replace(/\s/g, '')
    testAccountAddress = accountAddressText
    jestExpect(testAccountAddress).toMatch(/0x[0-9a-fA-F]{40}/)
    await element(by.id('BackChevron')).tap()
    await waitForElementById('Times', { tap: true })
  })

  // After quiz completion recovery phrase should only be shown in settings and
  // not in notifications
  it('Recovery phrase only shown in settings', async () => {
    await waitForElementById('WalletHome/NotificationBell', { tap: true })
    await expect(element(by.text('Back up now'))).not.toExist()
    await element(by.id('BackChevron')).tap()
    await navigateToSecurity()
    await waitForElementById('RecoveryPhrase')
    await element(by.id('RecoveryPhrase')).tap()
    await enterPinUi()
    await waitForElementById('AccountKeyWordsContainer')
  })

  // Based off the flag set in src/firebase/remoteConfigValuesDefaults.e2e.ts
  // We can only test one path 12 or 24 words as we cannot flip the flag after the build step
  it('Recovery phrase has 12 words', async () => {
    await waitForElementById('AccountKeyWordsContainer')
    const recoveryPhraseContainer = await element(by.id('AccountKeyWordsContainer')).getAttributes()
    const recoveryPhraseText = recoveryPhraseContainer.label
    jestExpect(recoveryPhraseText.split(' ').length).toBe(12)
    jestExpect(recoveryPhraseText).toBe(testRecoveryPhrase)
  })

  it('Should be able to restore newly created account', async () => {
    await launchApp({
      delete: true,
      launchArgs: {
        onboardingOverrides: 'EnableBiometry,ProtectWallet,PhoneVerification,CloudBackup',
      },
    })
    await quickOnboarding({ mnemonic: testRecoveryPhrase, cloudBackupEnabled: true })
    await waitForElementById('WalletHome/SettingsGearButton', { tap: true })
    await waitForElementById('SettingsMenu/Address', { tap: true })

    await expect(element(by.text(testAccountAddress))).toBeVisible()
  })
}
