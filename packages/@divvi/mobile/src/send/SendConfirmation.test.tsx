import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import * as React from 'react'
import { Provider } from 'react-redux'
import { SendOrigin } from 'src/analytics/types'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { RootState } from 'src/redux/reducers'
import SendConfirmation from 'src/send/SendConfirmation'
import { sendPayment } from 'src/send/actions'
import { usePrepareSendTransactions } from 'src/send/usePrepareSendTransactions'
import { PreparedTransactionsPossible } from 'src/viem/prepareTransactions'
import {
  getSerializablePreparedTransaction,
  getSerializablePreparedTransactionsPossible,
} from 'src/viem/preparedTransactionSerialization'
import { RecursivePartial, createMockStore, getMockStackScreenProps } from 'test/utils'
import {
  mockAccount,
  mockCeloTokenBalance,
  mockCeloTokenId,
  mockCusdTokenBalance,
  mockCusdTokenId,
  mockPoofTokenId,
  mockTokenBalances,
  mockTokenTransactionData,
} from 'test/values'

jest.mock('src/web3/networkConfig', () => {
  const originalModule = jest.requireActual('src/web3/networkConfig')
  return {
    ...originalModule,
    __esModule: true,
    default: {
      ...originalModule.default,
      defaultNetworkId: 'celo-alfajores',
    },
  }
})
jest.mock('src/send/usePrepareSendTransactions')

const mockFeeCurrencies = [
  { ...mockCeloTokenBalance, priceUsd: new BigNumber('5'), lastKnownPriceUsd: new BigNumber('5') },
  mockCusdTokenBalance,
]

const mockPrepareTransactionsResultPossible: PreparedTransactionsPossible = {
  type: 'possible',
  transactions: [
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt('1'.concat('0'.repeat(16))), // 0.01 CELO
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
      _baseFeePerGas: BigInt(1),
    },
  ],
  feeCurrency: mockFeeCurrencies[0],
}

const mockBaseScreenProps = {
  transactionData: {
    ...mockTokenTransactionData,
  },
  origin: SendOrigin.AppSendFlow,
  isFromScan: false,
}

const mockSendConfirmationProps = getMockStackScreenProps(Screens.SendConfirmation, {
  ...mockBaseScreenProps,
  prepareTransactionsResult: getSerializablePreparedTransactionsPossible(
    mockPrepareTransactionsResultPossible
  ),
})

type ScreenProps = NativeStackScreenProps<StackParamList, Screens.SendConfirmation>

describe('SendConfirmation', () => {
  let mockUsePrepareSendTransactionsOutput: ReturnType<typeof usePrepareSendTransactions>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUsePrepareSendTransactionsOutput = {
      prepareTransactionsResult: mockPrepareTransactionsResultPossible,
      prepareTransactionLoading: false,
      refreshPreparedTransactions: jest.fn(),
      clearPreparedTransactions: jest.fn(),
      prepareTransactionError: undefined,
    }
    jest.mocked(usePrepareSendTransactions).mockReturnValue(mockUsePrepareSendTransactionsOutput)
  })

  function renderScreen(screenProps: ScreenProps, storeOverrides?: RecursivePartial<RootState>) {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: mockTokenBalances[mockPoofTokenId],
          [mockCeloTokenId]: { ...mockTokenBalances[mockCeloTokenId], balance: '5', priceUsd: '5' },
          [mockCusdTokenId]: mockTokenBalances[mockCusdTokenId],
        },
      },
      ...storeOverrides,
    })

    const tree = render(
      <Provider store={store}>
        <SendConfirmation {...screenProps} />
      </Provider>
    )

    return {
      store,
      ...tree,
    }
  }

  it('renders the structure properly', () => {
    const { getByTestId } = renderScreen(mockSendConfirmationProps)

    // renders screen header
    expect(getByTestId('CustomHeaderTitle')).toHaveTextContent('reviewTransaction.title')

    // renders token and amount details
    expect(getByTestId('SendConfirmationToken/Label')).toHaveTextContent('sending')
    expect(getByTestId('SendConfirmationToken/PrimaryValue')).toHaveTextContent(
      'tokenAmount, {"tokenAmount":"1.00","tokenSymbol":"cUSD"}'
    )
    expect(getByTestId('SendConfirmationToken/SecondaryValue')).toHaveTextContent(
      'localAmount, {"localAmount":"1.33","localCurrencySymbol":"₱"}'
    )

    // renders recipient details
    expect(getByTestId('SendConfirmationRecipient/Label')).toHaveTextContent('to')
    expect(getByTestId('SendConfirmationRecipient/PrimaryValue')).toHaveTextContent(
      '0x0000000000000000000000000000000000007E57'
    )

    // renders network details
    expect(getByTestId('SendConfirmationNetwork/Label')).toHaveTextContent(
      'transactionDetails.network'
    )
    expect(getByTestId('SendConfirmationNetwork/Value')).toHaveTextContent('Celo Alfajores')

    // renders fee details
    expect(getByTestId('SendConfirmationFee/Label')).toHaveTextContent('networkFee')
    expect(getByTestId('SendConfirmationFee/Value')).toHaveTextContent(
      'tokenAndLocalAmountApprox, {"tokenAmount":"0.01","localAmount":"0.067","tokenSymbol":"CELO","localCurrencySymbol":"₱"}'
    )

    // renders total details
    expect(getByTestId('SendConfirmationTotal/Label')).toHaveTextContent(
      'reviewTransaction.totalPlusFees'
    )
    expect(getByTestId('SendConfirmationTotal/Value')).toHaveTextContent(
      'localAmountApprox, {"localAmount":"1.40","localCurrencySymbol":"₱"}'
    )

    // renders confirmation button
    expect(getByTestId('ConfirmButton')).toHaveTextContent('send')
  })

  it('does not prepare a transaction on load by default', () => {
    renderScreen(mockSendConfirmationProps)
    expect(mockUsePrepareSendTransactionsOutput.clearPreparedTransactions).not.toHaveBeenCalled()
    expect(mockUsePrepareSendTransactionsOutput.refreshPreparedTransactions).not.toHaveBeenCalled()
    expect(mockUsePrepareSendTransactionsOutput.prepareTransactionLoading).toBe(false)
    expect(mockUsePrepareSendTransactionsOutput.prepareTransactionError).toBeUndefined()
  })

  it('dispatches an action with prepared transaction when the confirm button is pressed', async () => {
    const { store, getByTestId } = renderScreen(mockSendConfirmationProps)

    expect(store.getActions().length).toEqual(0)

    fireEvent.press(getByTestId('ConfirmButton'))

    const { inputAmount, tokenId, recipient } = mockTokenTransactionData

    expect(store.getActions()[0]).toEqual(
      sendPayment(
        inputAmount,
        tokenId,
        inputAmount.times(1.001),
        recipient,
        false,
        getSerializablePreparedTransaction(mockPrepareTransactionsResultPossible.transactions[0])
      )
    )
  })

  describe('when opened with a deeplink', () => {
    const mockSendConfirmationFromDeepLinkProps = getMockStackScreenProps(
      Screens.SendConfirmation,
      mockBaseScreenProps
    )
    it('prepares a transaction on load', async () => {
      renderScreen(mockSendConfirmationFromDeepLinkProps)
      await waitFor(() =>
        expect(
          mockUsePrepareSendTransactionsOutput.refreshPreparedTransactions
        ).toHaveBeenCalledTimes(1)
      )
      expect(mockUsePrepareSendTransactionsOutput.refreshPreparedTransactions).toHaveBeenCalledWith(
        {
          amount: mockTokenTransactionData.tokenAmount,
          token: mockCusdTokenBalance,
          recipientAddress: mockTokenTransactionData.recipient.address,
          walletAddress: mockAccount.toLowerCase(),
          feeCurrencies: mockFeeCurrencies,
        }
      )
    })

    it('disables send if transaction is not prepared yet', () => {
      mockUsePrepareSendTransactionsOutput.prepareTransactionsResult = undefined
      const { getByTestId } = renderScreen(mockSendConfirmationFromDeepLinkProps)

      expect(getByTestId('ConfirmButton')).toBeDisabled()
    })
  })
})
