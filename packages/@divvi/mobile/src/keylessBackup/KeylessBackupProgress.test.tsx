import { fireEvent, render, waitFor } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { KeylessBackupEvents } from 'src/analytics/Events'
import KeylessBackupProgress from 'src/keylessBackup/KeylessBackupProgress'
import { keylessBackupAcceptZeroBalance, keylessBackupBail } from 'src/keylessBackup/slice'
import {
  KeylessBackupFlow,
  KeylessBackupOrigin,
  KeylessBackupStatus,
} from 'src/keylessBackup/types'
import { ensurePincode, navigate, navigateInitialTab } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { goToNextOnboardingScreen } from 'src/onboarding/steps'
import Logger from 'src/utils/Logger'
import { createMockStore, getMockStackScreenProps } from 'test/utils'
import { mockOnboardingProps } from 'test/values'

const mockOnboardingPropsSelector = jest.fn(() => mockOnboardingProps)

jest.mock('src/navigator/NavigationService')
jest.mock('src/analytics/AppAnalytics')
jest.mock('src/utils/Logger')
jest.mock('src/onboarding/steps', () => ({
  goToNextOnboardingScreen: jest.fn(),
  onboardingPropsSelector: () => mockOnboardingPropsSelector(),
  getOnboardingStepValues: () => ({ step: 2, totalSteps: 3 }),
}))

function createStore(keylessBackupStatus: KeylessBackupStatus, zeroBalance = false) {
  return createMockStore({
    keylessBackup: {
      backupStatus: keylessBackupStatus,
    },
    ...(zeroBalance && {
      tokens: {
        tokenBalances: {},
      },
      positions: {
        positions: [],
      },
    }),
  })
}

function getProps(
  flow: KeylessBackupFlow = KeylessBackupFlow.Setup,
  origin: KeylessBackupOrigin = KeylessBackupOrigin.Settings
) {
  return getMockStackScreenProps(Screens.KeylessBackupProgress, {
    keylessBackupFlow: flow,
    origin,
  })
}

describe('KeylessBackupProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('setup', () => {
    it('Logs error when not started', async () => {
      render(
        <Provider store={createStore(KeylessBackupStatus.NotStarted)}>
          <KeylessBackupProgress {...getProps()} />
        </Provider>
      )
      expect(Logger.error).toHaveBeenCalledTimes(1)
    })
    it('shows spinner when in progress', async () => {
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.InProgress)}>
          <KeylessBackupProgress {...getProps()} />
        </Provider>
      )
      expect(getByTestId('GreenLoadingSpinner')).toBeTruthy()
    })
    it('navigates to home on success of the non onboarding flow', async () => {
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.Completed)}>
          <KeylessBackupProgress {...getProps()} />
        </Provider>
      )
      expect(getByTestId('GreenLoadingSpinnerToCheck')).toBeTruthy()
      expect(getByTestId('KeylessBackupProgress/Continue')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/Continue'))

      expect(navigateInitialTab).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_progress_completed_continue,
        { origin: KeylessBackupOrigin.Settings }
      )
    })

    it('navigates to next onboarding screen on success of the onboarding flow', async () => {
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.Completed)}>
          <KeylessBackupProgress
            {...getProps(KeylessBackupFlow.Setup, KeylessBackupOrigin.Onboarding)}
          />
        </Provider>
      )
      expect(getByTestId('GreenLoadingSpinnerToCheck')).toBeTruthy()
      expect(getByTestId('KeylessBackupProgress/Continue')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/Continue'))

      expect(goToNextOnboardingScreen).toHaveBeenCalledWith({
        onboardingProps: mockOnboardingProps,
        firstScreenInCurrentStep: Screens.SignInWithEmail,
      })
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_progress_completed_continue,
        {
          origin: KeylessBackupOrigin.Onboarding,
        }
      )
    })

    it('navigates to settings on failure', async () => {
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.Failed)}>
          <KeylessBackupProgress {...getProps()} />
        </Provider>
      )
      expect(getByTestId('RedLoadingSpinnerToInfo')).toBeTruthy()
      expect(getByTestId('KeylessBackupProgress/Later')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/Later'))

      expect(navigate).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith(Screens.SecuritySubmenu)
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(KeylessBackupEvents.cab_progress_failed_later)
    })
    it('navigates to manual backup on failure', async () => {
      jest.mocked(ensurePincode).mockResolvedValueOnce(true)
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.Failed)}>
          <KeylessBackupProgress {...getProps()} />
        </Provider>
      )
      expect(getByTestId('KeylessBackupProgress/Manual')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/Manual'))

      await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
      expect(navigate).toHaveBeenCalledWith(Screens.BackupIntroduction)

      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_progress_failed_manual,
        { origin: KeylessBackupOrigin.Settings }
      )
    })
    it('navigates to recovery phrase on failure when coming from onboarding', async () => {
      jest.mocked(ensurePincode).mockResolvedValueOnce(true)
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.Failed)}>
          <KeylessBackupProgress
            {...getProps(KeylessBackupFlow.Setup, KeylessBackupOrigin.Onboarding)}
          />
        </Provider>
      )
      expect(getByTestId('KeylessBackupProgress/ManualOnboarding')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/ManualOnboarding'))

      expect(navigate).toBeCalledWith(Screens.AccountKeyEducation, { origin: 'cabOnboarding' })

      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_progress_failed_manual,
        { origin: KeylessBackupOrigin.Onboarding }
      )
    })
    it('navigates to next onboarding screen on failure', async () => {
      jest.mocked(ensurePincode).mockResolvedValueOnce(true)
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.Failed)}>
          <KeylessBackupProgress
            {...getProps(KeylessBackupFlow.Setup, KeylessBackupOrigin.Onboarding)}
          />
        </Provider>
      )
      expect(getByTestId('KeylessBackupProgress/Skip')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/Skip'))

      expect(goToNextOnboardingScreen).toHaveBeenCalledWith({
        onboardingProps: expect.any(Object),
        firstScreenInCurrentStep: Screens.SignInWithEmail,
      })

      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_progress_failed_skip_onboarding
      )
    })
  })
  describe('Restore', () => {
    it('Logs error when not started', async () => {
      render(
        <Provider store={createStore(KeylessBackupStatus.NotStarted)}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(Logger.error).toHaveBeenCalledTimes(1)
    })
    it('shows spinner when in progress', async () => {
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.InProgress)}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('GreenLoadingSpinner')).toBeTruthy()
    })
    it('shows the confirm dialog when the user is restoring with zero balance', () => {
      const store = createStore(KeylessBackupStatus.RestoreZeroBalance)
      const { getByTestId } = render(
        <Provider store={store}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('ConfirmUseAccountDialog')).toBeTruthy()

      fireEvent.press(getByTestId('ConfirmUseAccountDialog/PrimaryAction'))
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_restore_zero_balance_accept
      )
      expect(store.getActions()).toEqual([keylessBackupAcceptZeroBalance()])

      store.clearActions()
      fireEvent.press(getByTestId('ConfirmUseAccountDialog/SecondaryAction'))
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_restore_zero_balance_bail
      )
      expect(store.getActions()).toEqual([keylessBackupBail()])
    })
    it('shows the completed screen when cab is completed', () => {
      const { getByTestId, getByText } = render(
        <Provider store={createStore(KeylessBackupStatus.Completed)}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('GreenLoadingSpinnerToCheck')).toBeTruthy()
      expect(getByText(`₱`, { exact: false })).toBeTruthy()
      // The balance value includes assets and positions
      expect(getByText(`55.74`, { exact: false })).toBeTruthy()

      fireEvent.press(getByTestId('KeylessBackupProgress/Continue'))
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_restore_completed_continue
      )
      expect(goToNextOnboardingScreen).toHaveBeenCalledWith({
        onboardingProps: expect.any(Object),
        firstScreenInCurrentStep: Screens.ImportSelect,
      })
    })
    it('shows the zero balance text when completed and the user has no balance', () => {
      const { getByText, getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.Completed, true)}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('GreenLoadingSpinnerToCheck')).toBeTruthy()
      expect(getByTestId('KeylessBackupProgress/Continue')).toBeTruthy()
      expect(getByText('keylessBackupStatus.restore.completed.bodyZeroBalance')).toBeTruthy()
    })
    it('NotFound: navigates to ImportSelect when try again is pressed', async () => {
      const store = createStore(KeylessBackupStatus.NotFound)
      const { getByTestId } = render(
        <Provider store={store}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('Help')).toBeTruthy()
      expect(getByTestId('KeylessBackupProgress/RestoreNotFoundTryAgain')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/RestoreNotFoundTryAgain'))

      expect(navigate).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith(Screens.ImportSelect)
      expect(store.getActions()).toEqual([keylessBackupBail()])
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_restore_failed_try_again,
        {
          keylessBackupStatus: KeylessBackupStatus.NotFound,
        }
      )
    })
    it('NotFound: navigates to Welcome screen when create new wallet is pressed', async () => {
      const store = createStore(KeylessBackupStatus.NotFound)
      const { getByTestId } = render(
        <Provider store={store}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('Help')).toBeTruthy()
      expect(getByTestId('KeylessBackupProgress/RestoreNotFoundCreateNewWallet')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/RestoreNotFoundCreateNewWallet'))

      expect(navigate).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith(Screens.Welcome)
      expect(store.getActions()).toEqual([keylessBackupBail()])
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_restore_failed_create_new_wallet,
        {
          keylessBackupStatus: KeylessBackupStatus.NotFound,
        }
      )
    })
    it('Failure navigates to ImportSelect on failure', async () => {
      const store = createStore(KeylessBackupStatus.Failed)
      const { getByTestId } = render(
        <Provider store={store}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('RedLoadingSpinnerToInfo')).toBeTruthy()
      expect(getByTestId('KeylessBackupProgress/RestoreFailedTryAgain')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/RestoreFailedTryAgain'))

      expect(navigate).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith(Screens.ImportSelect)
      expect(store.getActions()).toEqual([keylessBackupBail()])
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_restore_failed_try_again,
        {
          keylessBackupStatus: KeylessBackupStatus.Failed,
        }
      )
    })
    it('navigates to Welcome screen on failure', async () => {
      const store = createStore(KeylessBackupStatus.Failed)
      const { getByTestId } = render(
        <Provider store={store}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('RedLoadingSpinnerToInfo')).toBeTruthy()
      expect(getByTestId('KeylessBackupProgress/RestoreFailedCreateNewWallet')).toBeTruthy()
      fireEvent.press(getByTestId('KeylessBackupProgress/RestoreFailedCreateNewWallet'))

      expect(navigate).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith(Screens.Welcome)
      expect(store.getActions()).toEqual([keylessBackupBail()])
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(
        KeylessBackupEvents.cab_restore_failed_create_new_wallet,
        {
          keylessBackupStatus: KeylessBackupStatus.Failed,
        }
      )
    })

    it('navigates to SupportContact screen on failure', async () => {
      const { getByTestId } = render(
        <Provider store={createStore(KeylessBackupStatus.Failed)}>
          <KeylessBackupProgress {...getProps(KeylessBackupFlow.Restore)} />
        </Provider>
      )
      expect(getByTestId('Header/KeylessBackupRestoreHelp')).toBeTruthy()
      fireEvent.press(getByTestId('Header/KeylessBackupRestoreHelp'))

      expect(navigate).toHaveBeenCalledTimes(1)
      expect(navigate).toHaveBeenCalledWith(Screens.SupportContact)
      expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
      expect(AppAnalytics.track).toHaveBeenCalledWith(KeylessBackupEvents.cab_restore_failed_help)
    })
  })
})
