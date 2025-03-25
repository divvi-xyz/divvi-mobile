import { render } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { View } from 'react-native'
import { Provider } from 'react-redux'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { type Recipient } from 'src/recipients/recipient'
import { typeScale } from 'src/styles/fonts'
import { TokenBalance } from 'src/tokens/slice'
import Logger from 'src/utils/Logger'
import { createMockStore } from 'test/utils'
import { mockCeloTokenId, mockCeurTokenId, mockCusdTokenId, mockTokenBalances } from 'test/values'
import {
  ReviewContent,
  ReviewDetailsItem,
  ReviewDetailsItemTotalValue,
  ReviewSummaryItem,
  ReviewSummaryItemContact,
  ReviewTransaction,
  type ReviewDetailsItemProps,
} from './ReviewTransaction'

jest.mock('src/utils/Logger')

describe('ReviewTransaction', () => {
  it('uses the custom headerAction if provided', async () => {
    const tree = render(
      <ReviewTransaction
        testID="Review"
        title="Custom HeaderAction"
        headerLeftButton={<>Custom Left Button</>}
      >
        <ReviewContent>
          <></>
        </ReviewContent>
      </ReviewTransaction>
    )

    expect(tree.getByTestId('Review')).toHaveTextContent('Custom Left Button')
  })
})

describe('ReviewSummaryItem', () => {
  it('renders the title and optional subtitle', () => {
    const tree = render(
      <ReviewSummaryItem
        testID="MyItem"
        label="Item Label"
        primaryValue="Item Primary Value"
        secondaryValue="Item Secondary Value"
        icon={<>Item Icon</>}
      />
    )

    expect(tree.getByTestId('MyItem/Label')).toHaveTextContent('Item Label')
    expect(tree.getByTestId('MyItem/PrimaryValue')).toHaveTextContent('Item Primary Value')
    expect(tree.getByTestId('MyItem/SecondaryValue')).toHaveTextContent('Item Secondary Value')
    expect(tree.getByTestId('MyItem')).toHaveTextContent('Item Icon')
  })

  it('does not render subtitle if not provided', () => {
    const tree = render(
      <ReviewSummaryItem
        testID="NoSubtitleItem"
        label="Label"
        primaryValue="Primary Value"
        icon={<></>}
      />
    )
    expect(tree.queryByTestId('NoSubtitleItem/SecondaryValue')).toBeNull()
  })
})

describe('ReviewSummaryItemContact', () => {
  it('displays name + phone if recipient has a name and phone number', () => {
    const recipient = {
      name: 'John Doe',
      displayNumber: '+111111111',
      e164PhoneNumber: '+222222222',
    } as Recipient
    const tree = render(<ReviewSummaryItemContact recipient={recipient} testID="ContactItem" />)

    expect(tree.getByTestId('ContactItem/PrimaryValue')).toHaveTextContent('John Doe')
    expect(tree.getByTestId('ContactItem/SecondaryValue')).toHaveTextContent('+111111111')
  })

  it.each([
    {
      phoneNumberType: 'displayNumber',
      displayNumber: '+111111111',
      e164PhoneNumber: '+222222222',
      expectedDisplayedValue: '+111111111',
    },

    {
      phoneNumberType: 'e164PhoneNumber',
      displayNumber: undefined,
      e164PhoneNumber: '+222222222',
      expectedDisplayedValue: '+222222222',
    },
  ])(
    'displays only $phoneNumberType phone if name is not available',
    ({ displayNumber, e164PhoneNumber, expectedDisplayedValue }) => {
      const recipient = { displayNumber, e164PhoneNumber } as Recipient
      const tree = render(<ReviewSummaryItemContact recipient={recipient} testID="ContactItem" />)

      expect(tree.getByTestId('ContactItem/PrimaryValue')).toHaveTextContent(expectedDisplayedValue)
      expect(tree.queryByTestId('ContactItem/SecondaryValue')).toBeNull()
    }
  )

  it('displays address if name/phone not available', () => {
    const recipient = {
      address: '0x123456789',
    } as Recipient
    const tree = render(<ReviewSummaryItemContact recipient={recipient} testID="ContactItem" />)

    expect(tree.getByTestId('ContactItem/PrimaryValue')).toHaveTextContent('0x123456789')
  })

  it('logs an error if no name/phone/address exist', () => {
    const recipient = {} as Recipient
    const tree = render(<ReviewSummaryItemContact recipient={recipient} testID="ContactItem" />)
    expect(Logger.error).toHaveBeenCalledTimes(1)
    expect(tree.toJSON()).toBeNull()
  })
})

describe('ReviewDetailsItem', () => {
  it('renders loading skeleton if isLoading is true', () => {
    const tree = render(
      <ReviewDetailsItem
        isLoading
        type="plain-text"
        testID="LoadingItem"
        label="Loading Label"
        value="Should not show"
      />
    )

    expect(tree.getByTestId('LoadingItem/Loader')).toBeTruthy()
    expect(tree.queryByText('Should not show')).toBeNull()
  })

  it('renders value text if isLoading is false', () => {
    const tree = render(
      <ReviewDetailsItem type="plain-text" testID="DetailsItem" label="Label" value="Value" />
    )
    expect(tree.queryByTestId('DetailsItem/Loader')).toBeNull()
    expect(tree.getByTestId('DetailsItem/Value')).toHaveTextContent('Value')
  })

  it.each([
    { fontSize: 'small', type: 'plain-text', font: typeScale.bodySmall },
    { fontSize: 'medium', type: 'plain-text', font: typeScale.bodyMedium },
    { fontSize: undefined, type: 'plain-text', font: typeScale.bodyMedium },
    { fontSize: 'small', type: 'total-token-amount', font: typeScale.labelSemiBoldSmall },
    { fontSize: 'medium', type: 'total-token-amount', font: typeScale.labelSemiBoldMedium },
    { fontSize: undefined, type: 'total-token-amount', font: typeScale.labelSemiBoldMedium },
  ] as Array<Pick<ReviewDetailsItemProps, 'fontSize' | 'type'> & { font: any }>)(
    'renders correct font style for $fontSize size $type',
    ({ fontSize, type, font }) => {
      const tree = render(
        <ReviewDetailsItem
          fontSize={fontSize}
          type={type}
          testID="DetailsItem"
          label="Label"
          amounts={[]}
          {...({} as any)}
        />
      )

      expect(tree.getByTestId('DetailsItem/Label')).toHaveStyle(font)
      expect(tree.getByTestId('DetailsItem/Value')).toHaveStyle(font)
    }
  )
})

describe('ReviewDetailsItemTotalValue', () => {
  const celoToken = mockTokenBalances[mockCeloTokenId] as unknown as TokenBalance
  const cUSDToken = mockTokenBalances[mockCusdTokenId] as unknown as TokenBalance
  const cEURToken = mockTokenBalances[mockCeurTokenId] as unknown as TokenBalance
  it.each([
    {
      amounts: [
        {
          tokenInfo: { ...celoToken, priceUsd: new BigNumber(1) },
          tokenAmount: new BigNumber(10),
          localAmount: new BigNumber(10),
        },
      ],
      title:
        'returns the token and fiat amount when fee info is missing and local price is available',
      result:
        'tokenAndLocalAmount, {"tokenAmount":"10.00","localAmount":"10.00","tokenSymbol":"CELO","localCurrencySymbol":"₱"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(10),
          localAmount: null,
        },
      ],
      title:
        'returns only the token amount when fee info is missing and no local price is available',
      result: 'tokenAmount, {"tokenAmount":"10.00","tokenSymbol":"CELO"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...celoToken, priceUsd: new BigNumber(1) },
          tokenAmount: new BigNumber(10),
          localAmount: new BigNumber(10),
        },
        {
          tokenInfo: { ...celoToken, priceUsd: new BigNumber(1) },
          tokenAmount: new BigNumber(0.5),
          localAmount: new BigNumber(0.5),
        },
      ],
      title:
        'returns the token and local amount when the token and fee token are the same and local price is available',
      result:
        'tokenAndLocalAmount, {"tokenAmount":"10.50","localAmount":"10.50","tokenSymbol":"CELO","localCurrencySymbol":"₱"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(10),
          localAmount: null,
        },
        {
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.5),
          localAmount: null,
        },
      ],
      title:
        "returns only the token amount when token and fee token are the same but they don't have local price",
      result: 'tokenAmount, {"tokenAmount":"10.50","tokenSymbol":"CELO"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...cUSDToken, priceUsd: new BigNumber(1) },
          tokenAmount: new BigNumber(10),
          localAmount: new BigNumber(10),
        },
        {
          tokenInfo: { ...celoToken, priceUsd: new BigNumber(1) },
          tokenAmount: new BigNumber(0.5),
          localAmount: new BigNumber(0.5),
        },
      ],
      title:
        'returns only the local amount when token and fee token are different but local prices are available for both',
      result: 'localAmount, {"localAmount":"10.50","localCurrencySymbol":"₱"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...cUSDToken, priceUsd: null },
          tokenAmount: new BigNumber(10),
          localAmount: null,
        },
        {
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.5),
          localAmount: null,
        },
      ],
      title:
        'returns multiple token amounts when token and fee token are different and no local prices available',
      result:
        'tokenAmount, {"tokenAmount":"10","tokenSymbol":"cUSD"} + tokenAmount, {"tokenAmount":"0.5","tokenSymbol":"CELO"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...cUSDToken, priceUsd: null },
          tokenAmount: new BigNumber(10),
          localAmount: new BigNumber(10),
        },
        {
          isDeductible: true,
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.5),
          localAmount: new BigNumber(0.5),
        },
      ],
      title:
        'deducts the fee local amount from the input local amount when fiat price is available for both and shows the final fiat amount',
      result: 'localAmount, {"localAmount":"9.50","localCurrencySymbol":"₱"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...cUSDToken, priceUsd: null },
          tokenAmount: new BigNumber(10),
          localAmount: new BigNumber(10),
        },
        {
          isDeductible: true,
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.5),
          localAmount: null,
        },
      ],
      title:
        'shows token amounts with a minus sign when fiat price is unavailable for any of the amounts',
      result:
        'tokenAmount, {"tokenAmount":"10","tokenSymbol":"cUSD"} - tokenAmount, {"tokenAmount":"0.5","tokenSymbol":"CELO"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.0001),
          localAmount: null,
        },
        {
          isDeductible: true,
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.5),
          localAmount: null,
        },
      ],
      title: 'shows negative token amount for the same token',
      result: 'tokenAmount, {"tokenAmount":"- 0.50","tokenSymbol":"CELO"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.1),
          localAmount: new BigNumber(0.1),
        },
        {
          isDeductible: true,
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.5),
          localAmount: new BigNumber(0.5),
        },
      ],
      title: 'shows negative token and fiat amounts for the same token',
      result:
        'tokenAndLocalAmount, {"tokenAmount":"- 0.40","localAmount":"-0.40","tokenSymbol":"CELO","localCurrencySymbol":"₱"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.1),
          localAmount: new BigNumber(0.1),
        },
        {
          isDeductible: true,
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(0.5),
          localAmount: new BigNumber(0.5),
        },
        {
          isDeductible: true,
          tokenInfo: { ...cUSDToken, priceUsd: null },
          tokenAmount: new BigNumber(0.5),
          localAmount: new BigNumber(0.5),
        },
        {
          tokenInfo: { ...cEURToken, priceUsd: null },
          tokenAmount: new BigNumber(0.3),
          localAmount: new BigNumber(0.3),
        },
      ],
      title: 'shows negative fiat amount for multiple different tokens',
      result: 'localAmount, {"localAmount":"0.60","localCurrencySymbol":"- ₱"}',
    },

    {
      amounts: [
        {
          tokenInfo: { ...cUSDToken, priceUsd: null },
          tokenAmount: new BigNumber(10),
          localAmount: new BigNumber(10),
        },
        {
          isDeductible: true,
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(1.5),
          localAmount: new BigNumber(1.5),
        },
        {
          tokenInfo: { ...cEURToken, priceUsd: null },
          tokenAmount: new BigNumber(5.5),
          localAmount: new BigNumber(5.5),
        },
        {
          tokenInfo: { ...cEURToken, priceUsd: null },
          tokenAmount: new BigNumber(1.5),
          localAmount: new BigNumber(1.5),
        },
        {
          tokenInfo: { ...cEURToken, priceUsd: null },
          tokenAmount: new BigNumber(3),
          localAmount: new BigNumber(3),
        },
      ],
      title:
        'properly sums all fiat amounts and shows the single final fiat amount that includes both addition and deduction',
      result: 'localAmount, {"localAmount":"18.50","localCurrencySymbol":"₱"}',
    },
    {
      amounts: [
        {
          tokenInfo: { ...cUSDToken, priceUsd: null },
          tokenAmount: new BigNumber(10),
          localAmount: null,
        },
        {
          isDeductible: true,
          tokenInfo: { ...celoToken, priceUsd: null },
          tokenAmount: new BigNumber(1.5),
          localAmount: null,
        },
        {
          tokenInfo: { ...cEURToken, priceUsd: null },
          tokenAmount: new BigNumber(5.5),
          localAmount: null,
        },
        {
          isDeductible: true,
          tokenInfo: { ...cEURToken, priceUsd: null },
          tokenAmount: new BigNumber(1.5),
          localAmount: null,
        },
        {
          tokenInfo: { ...cEURToken, priceUsd: null },
          tokenAmount: new BigNumber(3),
          localAmount: null,
        },
      ],
      title:
        'properly sums amounts on a per-token basis and shows the sum of token amounts with plus or minus sign based on a final token amount for that token',
      result:
        'tokenAmount, {"tokenAmount":"10","tokenSymbol":"cUSD"} - tokenAmount, {"tokenAmount":"1.5","tokenSymbol":"CELO"} + tokenAmount, {"tokenAmount":"7","tokenSymbol":"cEUR"}',
    },
  ])('$title', ({ amounts, result }) => {
    const tree = render(
      <Provider store={createMockStore()}>
        <View testID="Total">
          <ReviewDetailsItemTotalValue
            amounts={amounts}
            localCurrencySymbol={LocalCurrencySymbol.PHP}
          />
        </View>
      </Provider>
    )
    expect(tree.getByTestId('Total')).toHaveTextContent(result)
  })
})
