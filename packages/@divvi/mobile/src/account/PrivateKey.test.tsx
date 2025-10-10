import Clipboard from '@react-native-clipboard/clipboard'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import * as React from 'react'
import 'react-native'
import { Alert } from 'react-native'
import { Provider } from 'react-redux'
import PrivateKey from 'src/account/PrivateKey'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { PrivateKeyEvents } from 'src/analytics/Events'
import Logger from 'src/utils/Logger'
import { createMockStore } from 'test/utils'

jest.mock('@react-native-clipboard/clipboard')

const mockGenerateKeysFromMnemonic = jest.fn()
const mockGetStoredMnemonic = jest.fn()
jest.mock('src/backup/utils', () => ({
  generateKeysFromMnemonic: (...args: any[]) => mockGenerateKeysFromMnemonic(...args),
  getStoredMnemonic: (...args: any[]) => mockGetStoredMnemonic(...args),
}))

const mockGetPassword = jest.fn()
jest.mock('src/pincode/authentication', () => ({
  getPassword: (...args: any[]) => mockGetPassword(...args),
}))

jest.mock('src/utils/Logger')

// Mock Alert
jest.spyOn(Alert, 'alert')

describe('PrivateKey', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890'
  const mockPrivateKey = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
  const mockPublicKey = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
  const mockMnemonic = 'test mnemonic phrase with twelve words for testing purposes'
  const mockPassword = 'testPassword123'

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset all mocks to their default implementations
    mockGenerateKeysFromMnemonic.mockResolvedValue({
      privateKey: mockPrivateKey,
      publicKey: mockPublicKey,
      address: mockWalletAddress,
    })
    mockGetStoredMnemonic.mockResolvedValue(mockMnemonic)
    mockGetPassword.mockResolvedValue(mockPassword)
  })

  const renderComponent = (storeOverrides = {}) => {
    const store = createMockStore({
      web3: {
        account: mockWalletAddress,
      },
      ...storeOverrides,
    })

    return render(
      <Provider store={store}>
        <PrivateKey />
      </Provider>
    )
  }

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      const { getByTestId } = renderComponent()

      expect(getByTestId('PrivateKeyText')).toHaveTextContent('loading')
    })

    it('shows loading state while fetching private key', async () => {
      // Make the async operation take some time
      mockGetPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPassword), 100))
      )

      const { getByTestId } = renderComponent()

      expect(getByTestId('PrivateKeyText')).toHaveTextContent('loading')
    })
  })

  describe('Successful Private Key Loading', () => {
    it('loads and displays private key successfully', async () => {
      const { getByTestId } = renderComponent()

      await waitFor(() => {
        expect(mockGetPassword).toHaveBeenCalledWith(mockWalletAddress)
        expect(mockGetStoredMnemonic).toHaveBeenCalledWith(mockWalletAddress, mockPassword)
        expect(mockGenerateKeysFromMnemonic).toHaveBeenCalledWith(mockMnemonic)
      })

      await waitFor(() => {
        expect(getByTestId('PrivateKeyText')).toHaveTextContent('*'.repeat(60) + '7890')
      })
    })

    it('enables copy button when private key is loaded', async () => {
      const { getByTestId } = renderComponent()

      await waitFor(() => {
        const copyButton = getByTestId('CopyPrivateKeyButton')
        expect(copyButton).not.toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error alert when no wallet address is found', async () => {
      renderComponent({ web3: { account: null } })

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('error', 'noAccountFound')
      })
    })

    it('shows error alert when password retrieval fails', async () => {
      mockGetPassword.mockRejectedValue(new Error('Password retrieval failed'))

      renderComponent()

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('error', 'failedToLoadPrivateKey')
        expect(Logger.error).toHaveBeenCalledWith(
          'PrivateKey',
          'Error loading private key',
          expect.any(Error)
        )
      })
    })

    it('shows error alert when mnemonic is not found', async () => {
      mockGetStoredMnemonic.mockResolvedValue(null)

      renderComponent()

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('error', 'failedToLoadPrivateKey')
        expect(Logger.error).toHaveBeenCalledWith(
          'PrivateKey',
          'Error loading private key',
          expect.any(Error)
        )
      })
    })

    it('shows error alert when private key generation throws an error', async () => {
      mockGenerateKeysFromMnemonic.mockRejectedValue(new Error('Key generation failed'))

      renderComponent()

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('error', 'failedToLoadPrivateKey')
        expect(Logger.error).toHaveBeenCalledWith(
          'PrivateKey',
          'Error loading private key',
          expect.any(Error)
        )
      })
    })
  })

  describe('Private Key Display', () => {
    it('displays masked private key with last 4 characters visible', async () => {
      const { getByTestId } = renderComponent()

      await waitFor(() => {
        const expectedDisplay = '*'.repeat(60) + '7890'
        expect(getByTestId('PrivateKeyText')).toHaveTextContent(expectedDisplay)
      })
    })

    it('displays asterisks when private key is empty', async () => {
      mockGenerateKeysFromMnemonic.mockResolvedValue({
        privateKey: '',
        publicKey: mockPublicKey,
        address: mockWalletAddress,
      })

      const { getByTestId } = renderComponent()

      await waitFor(() => {
        expect(getByTestId('PrivateKeyText')).toHaveTextContent('*'.repeat(64))
      })
    })
  })

  describe('Copy Functionality', () => {
    it('copies private key to clipboard when copy button is pressed and tracks event', async () => {
      const { getByTestId } = renderComponent()

      await waitFor(() => {
        expect(getByTestId('CopyPrivateKeyButton')).not.toBeDisabled()
      })

      fireEvent.press(getByTestId('CopyPrivateKeyButton'))

      expect(Clipboard.setString).toHaveBeenCalledWith(mockPrivateKey)
      expect(Logger.showMessage).toHaveBeenCalledWith('privateKeyCopied')
      expect(AppAnalytics.track).toHaveBeenCalledWith(PrivateKeyEvents.copy_private_key)
    })

    it('copies private key to clipboard when private key container is pressed', async () => {
      const { getByTestId } = renderComponent()

      await waitFor(() => {
        expect(getByTestId('PrivateKeyText')).toHaveTextContent('*'.repeat(60) + '7890')
      })

      fireEvent.press(getByTestId('PrivateKeyText'))

      expect(AppAnalytics.track).toHaveBeenCalledWith(PrivateKeyEvents.copy_private_key)
      expect(Clipboard.setString).toHaveBeenCalledWith(mockPrivateKey)
      expect(Logger.showMessage).toHaveBeenCalledWith('privateKeyCopied')
    })

    it('disables copy button when loading', () => {
      const { getByTestId } = renderComponent()

      const copyButton = getByTestId('CopyPrivateKeyButton')
      expect(copyButton).toBeDisabled()
    })

    it('disables copy button when private key is not available', async () => {
      mockGenerateKeysFromMnemonic.mockResolvedValue({
        privateKey: '',
        publicKey: mockPublicKey,
        address: mockWalletAddress,
      })

      const { getByTestId } = renderComponent()

      await waitFor(() => {
        const copyButton = getByTestId('CopyPrivateKeyButton')
        expect(copyButton).toBeDisabled()
      })
    })
  })
})
