/* eslint-disable jest/no-conditional-expect */
import { fireEvent, render, within } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { EarnEvents } from 'src/analytics/Events'
import { openUrl } from 'src/app/actions'
import EarnDepositConfirmationScreen from 'src/earn/EarnDepositConfirmationScreen'
import { depositStart } from 'src/earn/slice'
import * as earnUtils from 'src/earn/utils'
import { Screens } from 'src/navigator/Screens'
import type { StackParamList } from 'src/navigator/types'
import type { PreparedTransactionsPossible } from 'src/public'
import { NETWORK_NAMES } from 'src/shared/conts'
import { getSerializableTokenBalance } from 'src/tokens/utils'
import { NetworkId } from 'src/transactions/types'
import {
  getSerializablePreparedTransactions,
  getSerializablePreparedTransactionsPossible,
} from 'src/viem/preparedTransactionSerialization'
import { createMockStore, getMockStackScreenProps } from 'test/utils'
import {
  mockAccount,
  mockArbEthTokenId,
  mockArbUsdcTokenId,
  mockCeloTokenId,
  mockEarnPositions,
  mockTokenBalances,
  mockUSDCAddress,
} from 'test/values'

const commonAnalyticsProperties = {
  depositTokenId: mockArbUsdcTokenId,
  depositTokenAmount: '100',
  networkId: NetworkId['arbitrum-sepolia'],
  providerId: mockEarnPositions[0].appId,
  poolId: mockEarnPositions[0].positionId,
  fromNetworkId: NetworkId['arbitrum-sepolia'],
}

const mockPreparedTransaction: PreparedTransactionsPossible = {
  type: 'possible' as const,
  transactions: [
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt(5e12),
      _baseFeePerGas: BigInt(1),
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
    },
    {
      from: '0xfrom',
      to: '0xto',
      data: '0xdata',
      gas: BigInt(1e12),
      _baseFeePerGas: BigInt(1),
      maxFeePerGas: BigInt(1),
      maxPriorityFeePerGas: undefined,
    },
  ],
  feeCurrency: {
    ...mockTokenBalances[mockArbEthTokenId],
    isNative: true,
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  },
}

const mockDepositProps: StackParamList[Screens.EarnDepositConfirmationScreen] = {
  inputTokenAmount: '100',
  preparedTransaction: getSerializablePreparedTransactionsPossible(mockPreparedTransaction),
  pool: mockEarnPositions[0],
  mode: 'deposit',
  inputTokenInfo: getSerializableTokenBalance({
    ...mockTokenBalances[mockArbUsdcTokenId],
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  }),
}

const mockSwapDepositProps: StackParamList[Screens.EarnDepositConfirmationScreen] = {
  ...mockDepositProps,
  mode: 'swap-deposit',
  inputTokenInfo: getSerializableTokenBalance({
    ...mockTokenBalances[mockArbEthTokenId],
    isNative: true,
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  }),
  inputTokenAmount: '0.041',
  swapTransaction: {
    swapType: 'same-chain' as const,
    chainId: 42161,
    price: '2439',
    guaranteedPrice: '2377',
    appFeePercentageIncludedInPrice: '0.6',
    sellTokenAddress: '0xEeeeeeE',
    buyTokenAddress: mockUSDCAddress,
    sellAmount: '41000000000000000',
    buyAmount: '99999000',
    allowanceTarget: '0x0000000000000000000000000000000000000123',
    from: mockAccount,
    to: '0x0000000000000000000000000000000000000123',
    value: '0',
    data: '0x0',
    gas: '1800000',
    estimatedGasUse: undefined,
    estimatedPriceImpact: '0.1',
  },
}

const mockCrossChainProps: StackParamList[Screens.EarnDepositConfirmationScreen] = {
  ...mockSwapDepositProps,
  preparedTransaction: getSerializablePreparedTransactionsPossible({
    ...mockPreparedTransaction,
    feeCurrency: {
      ...mockTokenBalances[mockCeloTokenId],
      isNative: true,
      balance: new BigNumber(10),
      priceUsd: new BigNumber(1),
      lastKnownPriceUsd: new BigNumber(1),
    },
  }),
  inputTokenInfo: getSerializableTokenBalance({
    ...mockTokenBalances[mockCeloTokenId],
    isNative: true,
    balance: new BigNumber(10),
    priceUsd: new BigNumber(1),
    lastKnownPriceUsd: new BigNumber(1),
  }),
  swapTransaction: {
    ...mockSwapDepositProps.swapTransaction,
    swapType: 'cross-chain' as const,
    estimatedDuration: 300,
    maxCrossChainFee: '0.1',
    estimatedCrossChainFee: '0.05',
  } as any,
}

describe('EarnDepositConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe.each([
    {
      testName: 'deposit',
      mode: 'deposit',
      props: mockDepositProps,
      fromTokenAmount: '100',
      fromTokenId: mockArbUsdcTokenId,
      depositTokenAmount: '100',
      swapType: undefined,
      feesLabel: 'networkFee',
      feesValue:
        'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}',
      totalFeesValue: 'localAmountApprox, {"localAmount":"133.01","localCurrencySymbol":"₱"}',
      feesBottomSheetDisclaimerText:
        'earnFlow.enterAmount.feeBottomSheet.description, {"context":"deposit"}',
    },
    {
      testName: 'same chain swap & deposit',
      mode: 'swap-deposit',
      props: mockSwapDepositProps,
      fromTokenAmount: '0.041',
      fromTokenId: mockArbEthTokenId,
      depositTokenAmount: '99.999',
      swapType: 'same-chain',
      feesLabel: 'fees',
      feesValue:
        'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.012","tokenSymbol":"ETH","localCurrencySymbol":"₱"}',
      totalFeesValue:
        'tokenAndLocalAmountApprox, {"tokenAmount":"100.00","localAmount":"133.01","tokenSymbol":"ETH","localCurrencySymbol":"₱"}',
      feesBottomSheetDisclaimerText:
        'earnFlow.enterAmount.feeBottomSheet.description, {"context":"depositSwapFee","appFeePercentage":"0.6"}',
    },
    {
      testName: 'cross chain swap & deposit',
      mode: 'swap-deposit',
      props: mockCrossChainProps,
      fromTokenAmount: '0.041',
      fromTokenId: mockCeloTokenId,
      depositTokenAmount: '99.999',
      swapType: 'cross-chain',
      feesLabel: 'fees',
      feesValue:
        'tokenAndLocalAmountApprox, {"tokenAmount":"0.000006","localAmount":"0.00011","tokenSymbol":"CELO","localCurrencySymbol":"₱"}',
      totalFeesValue:
        'tokenAndLocalAmountApprox, {"tokenAmount":"100.00","localAmount":"133.00","tokenSymbol":"CELO","localCurrencySymbol":"₱"}',
      feesBottomSheetDisclaimerText:
        'earnFlow.enterAmount.feeBottomSheet.description, {"context":"depositCrossChainWithSwapFee","appFeePercentage":"0.6"}',
    },
  ])(
    '$testName',
    ({
      mode,
      props,
      fromTokenAmount,
      fromTokenId,
      depositTokenAmount,
      swapType,
      feesLabel,
      feesValue,
      totalFeesValue,
      feesBottomSheetDisclaimerText,
    }) => {
      const fromNetworkId =
        swapType === 'cross-chain' ? NetworkId['celo-alfajores'] : NetworkId['arbitrum-sepolia']
      const expectedAnalyticsProperties = {
        ...commonAnalyticsProperties,
        mode,
        fromTokenAmount,
        fromTokenId,
        depositTokenAmount,
        swapType,
        fromNetworkId,
      }

      it('renders proper structure', () => {
        const { getByText, getByTestId } = render(
          <Provider store={createMockStore({ tokens: { tokenBalances: mockTokenBalances } })}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, props)}
            />
          </Provider>
        )

        // screen header
        expect(getByTestId('BackChevron')).toBeTruthy()
        expect(getByTestId('CustomHeaderTitle')).toHaveTextContent(
          'earnFlow.depositConfirmation.title'
        )

        // summary item for depositing
        expect(
          within(getByTestId('EarnDepositConfirmationToken')).getByTestId('TokenIcon')
        ).toBeTruthy()
        expect(getByTestId('EarnDepositConfirmationToken/Label')).toHaveTextContent(
          'earnFlow.depositConfirmation.depositing'
        )
        expect(getByTestId('EarnDepositConfirmationToken/PrimaryValue')).toHaveTextContent(
          'tokenAmount, {"tokenAmount":"100.00","tokenSymbol":"USDC"}'
        )
        expect(getByTestId('EarnDepositConfirmationToken/SecondaryValue')).toHaveTextContent(
          'localAmount, {"localAmount":"133.00","localCurrencySymbol":"₱"}'
        )

        // summary item for pool
        expect(
          within(getByTestId('EarnDepositConfirmationPool')).getByTestId('TokenIcon')
        ).toBeTruthy()
        expect(getByTestId('EarnDepositConfirmationPool/Label')).toHaveTextContent(
          'earnFlow.depositConfirmation.into'
        )
        expect(getByTestId('EarnDepositConfirmationPool/PrimaryValue')).toHaveTextContent(
          'earnFlow.depositConfirmation.pool, {"providerName":"Aave"}'
        )
        expect(getByTestId('EarnDepositConfirmationPool/SecondaryValue')).toHaveTextContent(
          'earnFlow.depositConfirmation.yieldRate, {"apy":"1.92"}'
        )

        // summary item for swap and deposit
        if (mode === 'swap-deposit') {
          expect(getByTestId('SwapAndDeposit/Divider')).toBeTruthy()
          expect('SwapAndDeposit/Icon').toBeTruthy()
          expect(getByTestId('SwapAndDeposit/InfoIcon')).toBeTruthy()
          expect(getByTestId('SwapAndDeposit/PrimaryValue')).toHaveTextContent(
            'earnFlow.depositConfirmation.swapAndDeposit'
          )
          expect(getByTestId('SwapAndDeposit/SecondaryValue')).toHaveTextContent(
            'tokenIntoTokenAmount'
          )
          expect(getByTestId('SwapAndDepositInfoSheet')).toHaveTextContent(
            'earnFlow.swapAndDepositInfoSheet.title'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/SwapFrom/Label')).toHaveTextContent(
            'earnFlow.swapAndDepositInfoSheet.swapFrom'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/SwapFrom/Value')).toHaveTextContent(
            'tokenAndLocalAmount'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/SwapTo/Label')).toHaveTextContent(
            'earnFlow.swapAndDepositInfoSheet.swapTo'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/SwapTo/Value')).toHaveTextContent(
            'tokenAndLocalAmount'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/Disclaimer')).toHaveTextContent(
            'earnFlow.swapAndDepositInfoSheet.whySwap'
          )
          expect(getByTestId('SwapAndDepositInfoSheet/Disclaimer')).toHaveTextContent(
            'earnFlow.swapAndDepositInfoSheet.swapDescription'
          )
        }

        // details items
        expect(getByTestId('EarnDepositConfirmationNetwork/Label')).toHaveTextContent(
          'transactionDetails.network'
        )
        expect(getByTestId('EarnDepositConfirmationNetwork/Value')).toHaveTextContent(
          NETWORK_NAMES[props.inputTokenInfo.networkId]
        )
        expect(getByTestId('EarnDepositConfirmationFee/Label')).toHaveTextContent(feesLabel)
        expect(getByTestId('EarnDepositConfirmationFee/Value')).toHaveTextContent(feesValue)
        expect(getByTestId('EarnDepositConfirmationTotal/Label')).toHaveTextContent(
          'reviewTransaction.totalPlusFees'
        )
        expect(getByTestId('EarnDepositConfirmationTotal/Value')).toHaveTextContent(totalFeesValue)

        // fees info bottom sheet
        expect(getByTestId('FeeInfoBottomSheet')).toBeTruthy()
        expect(getByTestId('FeeInfoBottomSheet/FooterDisclaimer')).toHaveTextContent(
          feesBottomSheetDisclaimerText
        )

        // total plus fees info bottom sheet
        expect(getByTestId('TotalInfoBottomSheet/Depositing/Label')).toHaveTextContent(
          'earnFlow.depositConfirmation.depositing'
        )
        expect(getByTestId('TotalInfoBottomSheet/Depositing/Value')).toHaveTextContent(
          'tokenAndLocalAmount, {"tokenAmount":"100.00","localAmount":"133.00","tokenSymbol":"USDC","localCurrencySymbol":"₱"}'
        )
        expect(getByTestId('TotalInfoBottomSheet/Fees/Label')).toHaveTextContent('fees')
        expect(getByTestId('TotalInfoBottomSheet/Fees/Value')).toHaveTextContent(feesValue)
        expect(getByTestId('TotalInfoBottomSheet/Total/Label')).toHaveTextContent(
          'reviewTransaction.totalPlusFees'
        )
        expect(getByTestId('TotalInfoBottomSheet/Total/Value')).toHaveTextContent(totalFeesValue)

        // footer with disclaimer and confirm button
        expect(
          getByText('earnFlow.depositConfirmation.disclaimer, {"providerName":"Aave"}')
        ).toBeTruthy()
        expect(getByTestId('EarnDepositConfirmation/TermsAndConditions')).toBeTruthy()
        expect(getByTestId('EarnDepositConfirmation/ConfirmButton')).toHaveTextContent('deposit')
      })

      it('renders the expected disclaimer when there is no terms url', () => {
        const { getByTestId, getByText } = render(
          <Provider store={createMockStore({ tokens: { tokenBalances: mockTokenBalances } })}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, {
                ...props,
                pool: {
                  ...props.pool,
                  dataProps: { ...props.pool.dataProps, termsUrl: undefined },
                },
              })}
            />
          </Provider>
        )

        expect(
          getByText(
            'earnFlow.depositConfirmation.noTermsUrlDisclaimer, {"appName":"Test App","providerName":"Aave"}'
          )
        ).toBeTruthy()
        expect(getByTestId('EarnDepositConfirmation/ProviderDocuments')).toBeTruthy()
        expect(getByTestId('EarnDepositConfirmation/AppTermsAndConditions')).toBeTruthy()
      })

      it('triggers an analytics event when the back button is pressed', () => {
        const { getByTestId } = render(
          <Provider store={createMockStore({ tokens: { tokenBalances: mockTokenBalances } })}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, props)}
            />
          </Provider>
        )

        fireEvent.press(getByTestId('BackChevron'))
        expect(AppAnalytics.track).toHaveBeenCalledWith(
          EarnEvents.earn_deposit_cancel,
          expectedAnalyticsProperties
        )
      })

      it.each([
        {
          title: 'pressing provider pool name opens manageUrl if available',
          manageUrl: props.pool.dataProps.manageUrl!,
          termsUrl: props.pool.dataProps.termsUrl!,
          result: props.pool.dataProps.manageUrl!,
        },
        {
          title: 'pressing provider pool name opens termsUrl if manageUrl is not available',
          manageUrl: undefined,
          termsUrl: props.pool.dataProps.termsUrl!,
          result: props.pool.dataProps.termsUrl!,
        },
      ])('$title', ({ manageUrl, termsUrl, result }) => {
        const mockStore = createMockStore({ tokens: { tokenBalances: mockTokenBalances } })
        const { getByTestId } = render(
          <Provider store={mockStore}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, {
                ...props,
                pool: {
                  ...props.pool,
                  dataProps: { ...props.pool.dataProps, manageUrl, termsUrl },
                },
              })}
            />
          </Provider>
        )

        fireEvent.press(getByTestId('EarnDepositConfirmationPool'))
        expect(AppAnalytics.track).toHaveBeenCalledWith(
          EarnEvents.earn_deposit_provider_info_press,
          expectedAnalyticsProperties
        )
        expect(mockStore.getActions()).toEqual([openUrl(result, true)])
      })

      it('shows gas subsidized copy if feature gate is set', () => {
        jest.spyOn(earnUtils, 'isGasSubsidizedForNetwork').mockReturnValue(true)
        const mockStore = createMockStore({ tokens: { tokenBalances: mockTokenBalances } })
        const { getByTestId } = render(
          <Provider store={mockStore}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, props)}
            />
          </Provider>
        )
        expect(getByTestId('EarnDepositConfirmationFee/Caption')).toHaveTextContent('gasSubsidized')
        expect(getByTestId('TotalInfoBottomSheet/Fees/Caption')).toHaveTextContent('gasSubsidized')
        expect(earnUtils.isGasSubsidizedForNetwork).toHaveBeenCalledWith(fromNetworkId)
      })

      it('submits the action and triggers an analytics event when the complete button is pressed', () => {
        const mockStore = createMockStore({ tokens: { tokenBalances: mockTokenBalances } })
        const { getByTestId } = render(
          <Provider store={mockStore}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, props)}
            />
          </Provider>
        )

        fireEvent.press(getByTestId('EarnDepositConfirmation/ConfirmButton'))
        expect(AppAnalytics.track).toHaveBeenCalledWith(
          EarnEvents.earn_deposit_complete,
          expectedAnalyticsProperties
        )
        expect(mockStore.getActions()).toEqual([
          {
            type: depositStart.type,
            payload: {
              amount: depositTokenAmount,
              pool: mockEarnPositions[0],
              preparedTransactions: getSerializablePreparedTransactions(
                mockPreparedTransaction.transactions
              ),
              mode,
              fromTokenAmount,
              fromTokenId,
            },
          },
        ])
      })

      it('opens the terms and conditions when the terms and conditions button is pressed', () => {
        const mockStore = createMockStore({ tokens: { tokenBalances: mockTokenBalances } })
        const { getByTestId } = render(
          <Provider store={mockStore}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, props)}
            />
          </Provider>
        )

        fireEvent.press(getByTestId('EarnDepositConfirmation/TermsAndConditions'))
        expect(AppAnalytics.track).toHaveBeenCalledWith(
          EarnEvents.earn_deposit_terms_and_conditions_press,
          { type: 'providerTermsAndConditions', ...expectedAnalyticsProperties }
        )
        expect(mockStore.getActions()).toEqual([openUrl('termsUrl', true)])
      })

      it("opens the provider's documentation URL when the provider has no terms and conditions", () => {
        const mockStore = createMockStore({ tokens: { tokenBalances: mockTokenBalances } })
        const { getByTestId } = render(
          <Provider store={mockStore}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, {
                ...props,
                pool: {
                  ...props.pool,
                  appId: 'beefy',
                  dataProps: { ...props.pool.dataProps, termsUrl: undefined },
                },
              })}
            />
          </Provider>
        )

        fireEvent.press(getByTestId('EarnDepositConfirmation/ProviderDocuments'))
        expect(AppAnalytics.track).toHaveBeenCalledWith(
          EarnEvents.earn_deposit_terms_and_conditions_press,
          { type: 'providerDocuments', ...expectedAnalyticsProperties, providerId: 'beefy' }
        )
        expect(mockStore.getActions()).toEqual([openUrl('https://docs.beefy.finance/', true)])
      })

      it('opens the app T&C URL when the provider has no terms and conditions', () => {
        const mockStore = createMockStore({ tokens: { tokenBalances: mockTokenBalances } })
        const { getByTestId } = render(
          <Provider store={mockStore}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, {
                ...props,
                pool: {
                  ...props.pool,
                  appId: 'beefy',
                  dataProps: { ...props.pool.dataProps, termsUrl: undefined },
                },
              })}
            />
          </Provider>
        )

        fireEvent.press(getByTestId('EarnDepositConfirmation/AppTermsAndConditions'))
        expect(AppAnalytics.track).toHaveBeenCalledWith(
          EarnEvents.earn_deposit_terms_and_conditions_press,
          { type: 'appTermsAndConditions', ...expectedAnalyticsProperties, providerId: 'beefy' }
        )
        expect(mockStore.getActions()).toEqual([openUrl('https://valora.xyz/terms', true)])
      })

      it('shows loading state and buttons are disabled when deposit is submitted', () => {
        const mockStore = createMockStore({
          tokens: { tokenBalances: mockTokenBalances },
          earn: { depositStatus: 'loading' },
        })
        const { getByTestId } = render(
          <Provider store={mockStore}>
            <EarnDepositConfirmationScreen
              {...getMockStackScreenProps(Screens.EarnDepositConfirmationScreen, props)}
            />
          </Provider>
        )

        expect(getByTestId('EarnDepositConfirmation/ConfirmButton')).toBeDisabled()
        expect(getByTestId('EarnDepositConfirmation/ConfirmButton')).toContainElement(
          getByTestId('Button/Loading')
        )
      })
    }
  )
})
