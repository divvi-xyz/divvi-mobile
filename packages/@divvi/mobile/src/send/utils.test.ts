import BigNumber from 'bignumber.js'
import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { SendOrigin } from 'src/analytics/types'
import { LocalCurrencyCode } from 'src/localCurrency/consts'
import { fetchExchangeRate } from 'src/localCurrency/saga'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { UriData, urlFromUriData } from 'src/qrcode/schema'
import { RecipientType } from 'src/recipients/recipient'
import { TransactionDataInput } from 'src/send/types'
import { handlePaymentDeeplink, handleSendPaymentData } from 'src/send/utils'
import { createMockStore } from 'test/utils'
import {
  mockAccount2,
  mockCeloAddress,
  mockCeloTokenId,
  mockCeurAddress,
  mockCeurTokenId,
  mockCusdAddress,
  mockCusdTokenId,
  mockQRCodeRecipient,
  mockUriData,
} from 'test/values'

jest.mock('src/statsig')

describe('send/utils', () => {
  describe('handleSendPaymentData', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    const mockData: UriData = {
      address: mockAccount2.toLowerCase(),
      currencyCode: 'USD' as LocalCurrencyCode,
      displayName: undefined,
      e164PhoneNumber: undefined,
      amount: undefined,
      token: undefined,
    }

    it('should navigate to SendEnterAmount screen when no amount nor token is sent', async () => {
      await expectSaga(handleSendPaymentData, {
        data: mockData,
        isFromScan: false,
      })
        .withState(createMockStore({}).getState())
        .run()
      expect(navigate).toHaveBeenCalledWith(
        Screens.SendEnterAmount,
        expect.objectContaining({
          origin: SendOrigin.AppSendFlow,
          recipient: { address: mockData.address, recipientType: RecipientType.Address },
          forceTokenId: false,
        })
      )
    })

    it('should navigate to SendEnterAmount screen when no amount is sent but token is', async () => {
      await expectSaga(handleSendPaymentData, {
        data: { ...mockData, token: 'cEUR' },
        isFromScan: false,
      })
        .withState(createMockStore({}).getState())
        .run()
      expect(navigate).toHaveBeenCalledWith(
        Screens.SendEnterAmount,
        expect.objectContaining({
          origin: SendOrigin.AppSendFlow,
          recipient: { address: mockData.address, recipientType: RecipientType.Address },
          forceTokenId: true,
          defaultTokenIdOverride: mockCeurTokenId,
        })
      )
    })

    it('should navigate to SendEnterAmount screen when amount and token are sent but not recognized', async () => {
      await expectSaga(handleSendPaymentData, {
        data: { ...mockData, amount: '1', token: 'NOT_A_TOKEN' },
        isFromScan: false,
      })
        .withState(createMockStore({}).getState())
        .run()
      expect(navigate).toHaveBeenCalledWith(
        Screens.SendEnterAmount,
        expect.objectContaining({
          origin: SendOrigin.AppSendFlow,
          recipient: { address: mockData.address, recipientType: RecipientType.Address },
          forceTokenId: false,
        })
      )
    })

    it('should navigate to SendEnterAmount with defaultTokenIdOverride', async () => {
      await expectSaga(handleSendPaymentData, {
        data: mockData,
        isFromScan: false,
        defaultTokenIdOverride: 'some-token-id',
      })
        .withState(createMockStore({}).getState())
        .run()
      expect(navigate).toHaveBeenCalledWith(
        Screens.SendEnterAmount,
        expect.objectContaining({
          origin: SendOrigin.AppSendFlow,
          recipient: { address: mockData.address, recipientType: RecipientType.Address },
          defaultTokenIdOverride: 'some-token-id',
          forceTokenId: false,
        })
      )
    })

    it('should navigate to SendConfirmation screen when amount and token are sent', async () => {
      const mockState = createMockStore({}).getState()
      // 1 PHP in cEUR: 1 (input) / 1.33 (PHP price) / 1.2 (cEUR price)
      const expectedTokenAmount = new BigNumber('0.62656641604010025063')
      await expectSaga(
        handleSendPaymentData,
        // When currencyCode is not set, the amount is assumed to be in the currently selected local currency.
        // so here the amount is 1 PHP
        {
          data: { ...mockData, amount: '1', token: 'cEUR' },
          isFromScan: false,
        }
      )
        .withState(mockState)
        .provide([
          [matchers.call.fn(fetchExchangeRate), '1.33'], // USD to PHP
        ])
        .run()
      expect(navigate).toHaveBeenCalledWith(
        Screens.SendConfirmation,
        expect.objectContaining({
          transactionData: {
            recipient: { address: mockData.address, recipientType: RecipientType.Address },
            inputAmount: new BigNumber(1), // 1 PHP
            amountIsInLocalCurrency: true,
            tokenAddress: mockCeurAddress,
            tokenAmount: expectedTokenAmount,
            tokenId: mockCeurTokenId,
          },
          origin: SendOrigin.AppSendFlow,
        })
      )
    })

    it('should navigate to SendConfirmation screen defaulting to cUSD when amount is sent but token isnt', async () => {
      const mockState = createMockStore({}).getState()
      // 1 PHP in cUSD: 1 (input) / 1.33 (PHP price)
      const expectedTokenAmount = new BigNumber('0.75187969924812030075')
      await expectSaga(
        handleSendPaymentData,
        // When currencyCode is not set, the amount is assumed to be in the currently selected local currency.
        // so here the amount is 1 PHP
        // When token is not set, the default token is cUSD
        {
          data: { ...mockData, amount: '1' },
          isFromScan: false,
        }
      )
        .withState(mockState)
        .provide([
          [matchers.call.fn(fetchExchangeRate), '1.33'], // USD to PHP
        ])
        .run()
      expect(navigate).toHaveBeenCalledWith(
        Screens.SendConfirmation,
        expect.objectContaining({
          transactionData: {
            recipient: { address: mockData.address, recipientType: RecipientType.Address },
            inputAmount: new BigNumber(1), // 1 PHP
            amountIsInLocalCurrency: true,
            tokenAddress: mockCusdAddress,
            tokenId: mockCusdTokenId,
            tokenAmount: expectedTokenAmount,
          },
          origin: SendOrigin.AppSendFlow,
        })
      )
    })

    it('should navigate to SendEnterAmount screen when an unsupported token is given', async () => {
      await expectSaga(handleSendPaymentData, {
        data: mockUriData[2],
        isFromScan: false,
      })
        .withState(createMockStore({}).getState())
        .run()
      expect(navigate).toHaveBeenCalledWith(
        Screens.SendEnterAmount,
        expect.objectContaining({
          origin: SendOrigin.AppSendFlow,
          recipient: {
            address: mockUriData[2].address.toLowerCase(),
            recipientType: RecipientType.Address,
          },
          forceTokenId: false,
        })
      )
    })

    describe('deeplinks for sending cUSD', () => {
      beforeEach(() => {
        jest.clearAllMocks()
      })

      it('should navigate to SendEnterAmount screen when only address & currencyCode are given', async () => {
        await expectSaga(handleSendPaymentData, {
          data: mockUriData[3],
          isFromScan: false,
        })
          .withState(createMockStore({}).getState())
          .run()
        expect(navigate).toHaveBeenCalledWith(
          Screens.SendEnterAmount,
          expect.objectContaining({
            origin: SendOrigin.AppSendFlow,
            recipient: mockQRCodeRecipient,
            forceTokenId: false,
          })
        )
      })

      it('should navigate to SendConfirmation screen when address, currencyCode, & amount are given', async () => {
        const mockTransactionData: TransactionDataInput = {
          recipient: mockQRCodeRecipient,
          tokenAddress: mockCusdAddress,
          tokenId: mockCusdTokenId,
          tokenAmount: new BigNumber('1'),
          inputAmount: new BigNumber('1.33'), // 1 USD in PHP
          amountIsInLocalCurrency: true,
        }

        await expectSaga(handleSendPaymentData, {
          data: mockUriData[4],
          isFromScan: false,
        })
          .withState(createMockStore({}).getState())
          .provide([
            [matchers.call.fn(fetchExchangeRate), '1'], // USD to USD (currencyCode of mockUriData[4] is USD)
          ])
          .run()
        expect(navigate).toHaveBeenCalledWith(
          Screens.SendConfirmation,
          expect.objectContaining({
            origin: SendOrigin.AppSendFlow,
            transactionData: mockTransactionData,
          })
        )
      })

      it('should navigate to SendConfirmation screen when address, currencyCode, amount, & token = cUSD are given', async () => {
        const mockTransactionData: TransactionDataInput = {
          recipient: mockQRCodeRecipient,
          tokenAddress: mockCusdAddress,
          tokenId: mockCusdTokenId,
          tokenAmount: new BigNumber('1'),
          inputAmount: new BigNumber('1.33'), // 1 USD in PHP
          amountIsInLocalCurrency: true,
        }

        await expectSaga(handleSendPaymentData, {
          data: mockUriData[5],
          isFromScan: false,
        })
          .withState(createMockStore({}).getState())
          .provide([
            [matchers.call.fn(fetchExchangeRate), '1'], // USD to USD (currencyCode of mockUriData[5] is USD)
          ])
          .run()
        expect(navigate).toHaveBeenCalledWith(
          Screens.SendConfirmation,
          expect.objectContaining({
            origin: SendOrigin.AppSendFlow,
            transactionData: mockTransactionData,
          })
        )
      })
    })

    describe('deeplinks for withdrawing CELO', () => {
      beforeEach(() => {
        jest.clearAllMocks()
      })

      it('should navigate to SendConfirmation screen when address, token = CELO, currencyCode, and amount are given', async () => {
        await expectSaga(handleSendPaymentData, {
          data: mockUriData[0],
          isFromScan: false,
        })
          .withState(createMockStore({}).getState())
          .provide([
            [matchers.call.fn(fetchExchangeRate), '1'], // USD to USD (currencyCode of mockUriData[0] is USD)
          ])
          .run()
        expect(navigate).toHaveBeenCalledWith(
          Screens.SendConfirmation,
          expect.objectContaining({
            origin: SendOrigin.AppSendFlow,
            transactionData: {
              recipient: {
                address: mockUriData[0].address.toLowerCase(),
                recipientType: RecipientType.Address,
              },
              tokenAddress: mockCeloAddress,
              tokenId: mockCeloTokenId,
              tokenAmount: new BigNumber(mockUriData[0].amount!).div(5), // 5 is the CELO price.
              inputAmount: new BigNumber(mockUriData[0].amount!).times(1.33), // 1 USD in PHP
              amountIsInLocalCurrency: true,
            },
          })
        )
      })

      it('should navigate to SendEnterAmount screen when only address & token = CELO are given', async () => {
        await expectSaga(handleSendPaymentData, {
          data: mockUriData[1],
          isFromScan: false,
        })
          .withState(createMockStore({}).getState())
          .run()
        expect(navigate).toHaveBeenCalledWith(
          Screens.SendEnterAmount,
          expect.objectContaining({
            origin: SendOrigin.AppSendFlow,
            recipient: {
              address: mockUriData[1].address.toLowerCase(),
              recipientType: RecipientType.Address,
            },
            forceTokenId: true,
            defaultTokenIdOverride: mockCeloTokenId,
          })
        )
      })
    })
  })

  describe('handlePaymentDeeplink', () => {
    it('should call handleSendPaymentData with parsed payment data', async () => {
      const data = {
        address: '0xf7f551752A78Ce650385B58364225e5ec18D96cB',
        displayName: 'Super 8',
        currencyCode: 'PHP' as LocalCurrencyCode,
        amount: '500',
      }

      const deeplink = urlFromUriData(data)
      const parsed: UriData = {
        ...data,
        e164PhoneNumber: undefined,
        token: undefined,
      }
      await expectSaga(handlePaymentDeeplink, deeplink)
        .withState(createMockStore({}).getState())
        .provide([[matchers.call.fn(handleSendPaymentData), undefined]])
        .call(handleSendPaymentData, { data: parsed, isFromScan: true })
        .run()
    })
  })
})
