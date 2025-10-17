import { WalletKitTypes } from '@reown/walletkit'
import { fireEvent, render, within } from '@testing-library/react-native'
import { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import * as React from 'react'
import 'react-native'
import { Provider } from 'react-redux'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { SerializableTransactionRequest } from 'src/viem/preparedTransactionSerialization'
import {
  acceptRequest as acceptRequestV2,
  denyRequest as denyRequestV2,
} from 'src/walletConnect/actions'
import { SupportedActions } from 'src/walletConnect/constants'
import SmartAccountConversionRequest from 'src/walletConnect/screens/SmartAccountConversionRequest'
import { PreparedTransactionResult, WalletConnectRequestType } from 'src/walletConnect/types'
import { createMockStore } from 'test/utils'
import { mockAccount, mockAccount2 } from 'test/values'

describe('SmartAccountConversionRequest', () => {
  const v2Session: SessionTypes.Struct = {
    expiry: 1670411909,
    self: {
      metadata: {
        icons: ['https://example.com/favicon.ico'],
        description: 'A mobile payments wallet that works worldwide',
        name: 'App Name',
        url: 'https://example.com/',
      },
      publicKey: 'b991206845c62280479fd1f24087e9c6f0df3921b5f9d94f4619fbf995a81149',
    },
    relay: {
      protocol: 'irn',
    },
    peer: {
      metadata: {
        name: 'WalletConnect Example',
        description: '',
        icons: [],
        url: 'https://react-app.walletconnect.com',
      },
      publicKey: '3c78ff702b703e873a90a9619598effa0e3b01deb977cb277d3b0eecff3a0320',
    },
    controller: 'b991206845c62280479fd1f24087e9c6f0df3921b5f9d94f4619fbf995a81149',
    namespaces: {
      eip155: {
        accounts: ['eip155:44787:0x047154ac4d7e01b1dc9ddeea9e8996b57895a747'],
        methods: ['wallet_sendCalls', 'eth_sendTransaction'],
        events: ['chainChanged', 'accountsChanged'],
      },
    },
    acknowledged: true,
    topic: 'd8afe1f5c3efa38bbb62c68005f572a7218afcd48703e4b02bdc5df2549ac5b5',
    pairingTopic: '20eca0383221cb6feb7af40d06d5cdd867965dd885e9ad36fb4540d9cc25267b',
    requiredNamespaces: {
      eip155: {
        methods: ['wallet_sendCalls', 'eth_sendTransaction'],
        chains: ['eip155:44787'],
        events: ['chainChanged', 'accountsChanged'],
      },
    },
    optionalNamespaces: {},
  }

  const sendCallsRequest: WalletKitTypes.EventArguments['session_request'] = {
    id: 1669810746892321,
    topic: 'd8afe1f5c3efa38bbb62c68005f572a7218afcd48703e4b02bdc5df2549ac5b5',
    params: {
      chainId: 'eip155:44787',
      request: {
        method: 'wallet_sendCalls',
        params: [
          {
            calls: [
              {
                to: mockAccount2,
                data: '0x1234567890abcdef',
                value: '0x00',
              },
            ],
            capabilities: {
              paymasterService: {
                url: 'https://paymaster.example.com',
              },
            },
            atomicRequired: false,
          },
        ],
      },
    },
    verifyContext: {
      verified: {
        origin: '',
        validation: 'UNKNOWN',
        verifyUrl: '',
      },
    },
  }

  const sendTransactionRequest = {
    ...sendCallsRequest,
    params: {
      ...sendCallsRequest.params,
      request: {
        ...sendCallsRequest.params.request,
        method: 'eth_sendTransaction',
        params: [
          {
            to: mockAccount2,
            data: '0x1234567890abcdef',
            value: '0x00',
          },
        ],
      },
    },
  }

  const supportedChains = ['eip155:44787']
  const sendCallsMethod = SupportedActions.wallet_sendCalls as const
  const sendTransactionMethod = SupportedActions.eth_sendTransaction as const
  const feeCurrenciesSymbols = ['CELO']

  const preparedTransactionSuccess: PreparedTransactionResult<SerializableTransactionRequest[]> = {
    success: true,
    data: [
      {
        from: mockAccount as `0x${string}`,
        to: mockAccount2 as `0x${string}`,
        data: '0x1234567890abcdef' as `0x${string}`,
        nonce: 100,
        maxFeePerGas: '12000000000',
        maxPriorityFeePerGas: '2000000000',
        gas: '100000',
        _baseFeePerGas: '5000000000',
        value: '0x00' as `0x${string}`,
      } satisfies SerializableTransactionRequest,
    ],
  }

  const baseProps = {
    version: 2 as const,
    supportedChains,
    hasInsufficientGasFunds: false,
    feeCurrenciesSymbols,
    preparedRequest: preparedTransactionSuccess,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('wallet_sendCalls with atomicRequired: false', () => {
    const store = createMockStore({
      walletConnect: {
        sessions: [v2Session],
      },
    })

    beforeEach(() => {
      store.clearActions()
    })

    it('renders the correct elements for optional conversion', () => {
      const { getByText, getByTestId } = render(
        <Provider store={store}>
          <SmartAccountConversionRequest
            {...baseProps}
            method={sendCallsMethod}
            request={sendCallsRequest}
            atomicRequired={false}
          />
        </Provider>
      )

      expect(getByText('walletConnectRequest.smartAccountConversion.title')).toBeTruthy()
      expect(
        getByText(
          'walletConnectRequest.smartAccountConversion.descriptionOptional, {"dappName":"WalletConnect Example"}'
        )
      ).toBeTruthy()
      expect(getByText('walletConnectRequest.smartAccountConversion.convertButton')).toBeTruthy()
      expect(
        getByText('walletConnectRequest.smartAccountConversion.continueWithoutConverting')
      ).toBeTruthy()
      expect(
        getByText('walletConnectRequest.smartAccountConversion.notificationTitle')
      ).toBeTruthy()
      expect(
        getByText('walletConnectRequest.smartAccountConversion.notificationDescriptionOptional')
      ).toBeTruthy()
      expect(
        within(getByTestId('WalletConnectRequest/ActionRequestPayload/Value')).getByText(
          JSON.stringify(preparedTransactionSuccess.data)
        )
      ).toBeTruthy()
    })

    it('dispatches acceptRequest when convert button is pressed', () => {
      const { getByText } = render(
        <Provider store={store}>
          <SmartAccountConversionRequest
            {...baseProps}
            method={sendCallsMethod}
            request={sendCallsRequest}
            atomicRequired={false}
          />
        </Provider>
      )

      fireEvent.press(getByText('walletConnectRequest.smartAccountConversion.convertButton'))
      expect(store.getActions()).toEqual([
        acceptRequestV2({
          ...baseProps,
          method: sendCallsMethod,
          request: sendCallsRequest,
          atomicRequired: false,
        }),
      ])
    })

    it('navigates to Action screen when continue without converting is pressed', () => {
      const { getByText } = render(
        <Provider store={store}>
          <SmartAccountConversionRequest
            {...baseProps}
            method={sendCallsMethod}
            request={sendCallsRequest}
            atomicRequired={false}
          />
        </Provider>
      )

      fireEvent.press(
        getByText('walletConnectRequest.smartAccountConversion.continueWithoutConverting')
      )

      expect(navigate).toHaveBeenCalledWith(Screens.WalletConnectRequest, {
        type: WalletConnectRequestType.Action,
        method: sendCallsMethod,
        request: sendCallsRequest,
        supportedChains,
        version: 2,
        hasInsufficientGasFunds: false,
        feeCurrenciesSymbols,
        preparedRequest: preparedTransactionSuccess,
      })
    })
  })

  describe('wallet_sendCalls with atomicRequired: true', () => {
    const atomicRequiredRequest = {
      ...sendCallsRequest,
      params: {
        ...sendCallsRequest.params,
        request: {
          ...sendCallsRequest.params.request,
          params: [
            {
              ...sendCallsRequest.params.request.params[0],
              atomicRequired: true,
            },
          ],
        },
      },
    }

    const store = createMockStore({
      walletConnect: {
        sessions: [v2Session],
      },
    })

    beforeEach(() => {
      store.clearActions()
    })

    it('renders the correct elements for required conversion', () => {
      const { getByText, queryByText } = render(
        <Provider store={store}>
          <SmartAccountConversionRequest
            {...baseProps}
            method={sendCallsMethod}
            request={atomicRequiredRequest}
            atomicRequired={true}
          />
        </Provider>
      )

      expect(getByText('walletConnectRequest.smartAccountConversion.title')).toBeTruthy()
      expect(
        getByText(
          'walletConnectRequest.smartAccountConversion.descriptionRequired, {"dappName":"WalletConnect Example"}'
        )
      ).toBeTruthy()
      expect(getByText('walletConnectRequest.smartAccountConversion.convertButton')).toBeTruthy()
      expect(getByText('dismiss')).toBeTruthy()
      expect(
        queryByText('walletConnectRequest.smartAccountConversion.continueWithoutConverting')
      ).toBeFalsy()
      expect(
        getByText('walletConnectRequest.smartAccountConversion.notificationDescriptionRequired')
      ).toBeTruthy()
    })

    it('dispatches denyRequest when dismiss is pressed for required conversion', () => {
      const { getByText } = render(
        <Provider store={store}>
          <SmartAccountConversionRequest
            {...baseProps}
            method={sendCallsMethod}
            request={atomicRequiredRequest}
            atomicRequired={true}
          />
        </Provider>
      )

      fireEvent.press(getByText('dismiss'))
      expect(store.getActions()).toEqual([
        denyRequestV2(atomicRequiredRequest, getSdkError('USER_REJECTED')),
      ])
    })
  })

  describe('eth_sendTransaction', () => {
    const store = createMockStore({
      walletConnect: {
        sessions: [v2Session],
      },
    })

    beforeEach(() => {
      store.clearActions()
    })

    it('renders correctly for transaction method', () => {
      const { getByText, getByTestId } = render(
        <Provider store={store}>
          <SmartAccountConversionRequest
            {...baseProps}
            method={sendTransactionMethod}
            request={sendTransactionRequest}
            atomicRequired={false}
          />
        </Provider>
      )

      expect(getByText('walletConnectRequest.smartAccountConversion.title')).toBeTruthy()
      expect(
        getByText(
          'walletConnectRequest.smartAccountConversion.descriptionOptional, {"dappName":"WalletConnect Example"}'
        )
      ).toBeTruthy()
      expect(
        within(getByTestId('WalletConnectRequest/ActionRequestPayload/Value')).getByText(
          JSON.stringify(preparedTransactionSuccess.data)
        )
      ).toBeTruthy()
    })

    it('navigates to Action screen with correct method when continue without converting is pressed', () => {
      const { getByText } = render(
        <Provider store={store}>
          <SmartAccountConversionRequest
            {...baseProps}
            method={sendTransactionMethod}
            request={sendTransactionRequest}
            atomicRequired={false}
          />
        </Provider>
      )

      fireEvent.press(
        getByText('walletConnectRequest.smartAccountConversion.continueWithoutConverting')
      )

      expect(navigate).toHaveBeenCalledWith(Screens.WalletConnectRequest, {
        type: WalletConnectRequestType.Action,
        method: sendTransactionMethod,
        request: sendTransactionRequest,
        supportedChains,
        version: 2,
        hasInsufficientGasFunds: false,
        feeCurrenciesSymbols,
        preparedRequest: preparedTransactionSuccess,
      })
    })
  })

  describe('error handling', () => {
    it('returns null when no active session is found', () => {
      const store = createMockStore({
        walletConnect: {
          sessions: [], // No sessions
        },
      })

      const { queryByText } = render(
        <Provider store={store}>
          <SmartAccountConversionRequest
            {...baseProps}
            method={sendCallsMethod}
            request={sendCallsRequest}
            atomicRequired={false}
          />
        </Provider>
      )

      // When no active session is found, the component returns null
      // so none of the expected text elements should be present
      expect(queryByText('walletConnectRequest.smartAccountConversion.title')).toBeFalsy()
    })
  })
})
