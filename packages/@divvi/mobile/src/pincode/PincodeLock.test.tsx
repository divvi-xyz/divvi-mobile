import { BIOMETRY_TYPE } from '@divvi/react-native-keychain'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import { PincodeType } from 'src/account/reducer'
import { appUnlock } from 'src/app/actions'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { getAppConfig } from 'src/appConfig'
import { checkPin, getPincodeWithBiometry } from 'src/pincode/authentication'
import PincodeLock from 'src/pincode/PincodeLock'
import { createMockStore } from 'test/utils'
import { mockAppConfig } from 'test/values'

const mockedCheckPin = jest.mocked(checkPin)
const mockedGetPincodeWithBiometry = jest.mocked(getPincodeWithBiometry)

const pin = '123456'

describe('PincodeLock', () => {
  describe('with biometry enabled', () => {
    const store = createMockStore({
      account: {
        pincodeType: PincodeType.PhoneAuth,
      },
      app: {
        supportedBiometryType: BIOMETRY_TYPE.FACE_ID,
      },
    })

    const renderComponentWithMockStore = () => {
      return render(
        <Provider store={store}>
          <PincodeLock />
        </Provider>
      )
    }

    beforeEach(() => {
      jest.clearAllMocks()
      jest.mocked(getAppConfig).mockReturnValue(mockAppConfig)
      store.clearActions()
    })

    it('renders empty background without pincode input if biometry is enabled', () => {
      const { getByTestId, queryByText } = renderComponentWithMockStore()

      expect(getByTestId('BiometryContainer')).toBeTruthy()
      expect(queryByText('BackgroundImage')).toBeFalsy()
      expect(queryByText('confirmPin.title')).toBeFalsy()
    })

    it('renders background image if set in app config and biometry is enabled', () => {
      jest.mocked(getAppConfig).mockReturnValue({
        ...mockAppConfig,
        themes: {
          default: {
            assets: {
              splashBackgroundImage: { uri: 'test.png' },
            },
          },
        },
      })
      const { queryByText, getByTestId } = renderComponentWithMockStore()

      expect(getByTestId('BiometryContainer')).toBeTruthy()
      expect(getByTestId('BackgroundImage')).toBeTruthy()
      expect(queryByText('confirmPin.title')).toBeFalsy()
    })

    it('unlocks with biometry if biometry is enabled', async () => {
      mockedCheckPin.mockResolvedValueOnce(true)
      mockedGetPincodeWithBiometry.mockResolvedValueOnce(pin)
      renderComponentWithMockStore()

      await waitFor(() => {
        expect(mockedGetPincodeWithBiometry).toHaveBeenCalledTimes(1)
      })
      expect(store.getActions()).toEqual([appUnlock()])
    })

    it('displays PIN input if failed to unlock with biometry', async () => {
      mockedGetPincodeWithBiometry.mockRejectedValueOnce('some error')
      const { getByText, queryByTestId } = renderComponentWithMockStore()

      await waitFor(() => {
        expect(mockedGetPincodeWithBiometry).toHaveBeenCalledTimes(1)
      })
      expect(getByText('confirmPin.title')).toBeTruthy()
      expect(queryByTestId('BiometryContainer')).toBeFalsy()
      expect(store.getActions()).toEqual([])
    })
  })

  describe('without biometry', () => {
    const store = createMockStore()
    const renderComponentWithMockStore = () => {
      return render(
        <Provider store={store}>
          <PincodeLock />
        </Provider>
      )
    }

    beforeEach(() => {
      jest.clearAllMocks()
      store.clearActions()
    })

    it('renders the pincode input if biometry is disabled', () => {
      const { getByTestId, getByText } = renderComponentWithMockStore()

      expect(getByText('confirmPin.title')).toBeTruthy()
      Array.from(Array(10).keys()).forEach((number) => {
        expect(getByTestId(`digit${number}`)).toBeTruthy()
      })
    })

    it('unlocks if PIN is correct', async () => {
      mockedCheckPin.mockResolvedValueOnce(true)
      const { getByTestId } = renderComponentWithMockStore()

      pin.split('').forEach((number) => fireEvent.press(getByTestId(`digit${number}`)))

      await act(() => {
        jest.runOnlyPendingTimers()
      })

      expect(store.getActions()).toEqual([appUnlock()])
    })

    it('shows wrong PIN notification', async () => {
      mockedCheckPin.mockResolvedValue(false)
      const { getByTestId, getByText } = renderComponentWithMockStore()

      pin.split('').forEach((number) => fireEvent.press(getByTestId(`digit${number}`)))
      await act(() => {
        jest.runOnlyPendingTimers()
      })

      expect(getByText(`${ErrorMessages.INCORRECT_PIN}`)).toBeDefined()
      expect(store.getActions()).toEqual([])
    })
  })
})
