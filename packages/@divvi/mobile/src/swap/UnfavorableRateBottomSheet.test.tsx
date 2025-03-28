import { fireEvent, render } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { Provider } from 'react-redux'
import UnfavorableRateBottomSheet from 'src/swap/UnfavorableRateBottomSheet'
import { createMockStore } from 'test/utils'
import { mockCeloTokenBalance, mockCusdTokenBalance } from 'test/values'

const onConfirm = jest.fn()
const onCancel = jest.fn()

function renderSheet({
  fromLocalAmount = new BigNumber(10),
  toLocalAmount = new BigNumber(11),
}: {
  fromTokenAmount?: BigNumber | null
  fromLocalAmount?: BigNumber | null
  toTokenAmount?: BigNumber | null
  toLocalAmount?: BigNumber | null
} = {}) {
  return render(
    <Provider store={createMockStore()}>
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmount={new BigNumber(10.5)}
        fromLocalAmount={fromLocalAmount}
        toTokenAmount={new BigNumber(11.5)}
        toLocalAmount={toLocalAmount}
        fromTokenInfo={mockCeloTokenBalance}
        toTokenInfo={mockCusdTokenBalance}
      />
    </Provider>
  )
}

describe('UnfavorableRateBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const { getByText } = renderSheet()
    expect(getByText('swapUnfavorableRateBottomSheet.title')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.description')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.cancel')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.confirm')).toBeTruthy()
  })

  it('renders correctly with both local amounts present', () => {
    const { getByTestId } = renderSheet({
      fromLocalAmount: new BigNumber(10),
      toLocalAmount: new BigNumber(11),
    })
    expect(getByTestId('FromAmount')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"10.50","localAmount":"10.00","tokenSymbol":"CELO","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('ToAmount')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"11.50","localAmount":"11.00","tokenSymbol":"cUSD","localCurrencySymbol":"₱"}'
    )
  })

  it('renders correctly with from local amount missing', () => {
    const { getByTestId } = renderSheet({
      fromLocalAmount: null,
      toLocalAmount: new BigNumber(11),
    })
    expect(getByTestId('FromAmount')).toHaveTextContent(
      'tokenAndLocalAmount, {"context":"noFiatPrice","tokenAmount":"10.50","localAmount":"","tokenSymbol":"CELO","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('ToAmount')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"11.50","localAmount":"11.00","tokenSymbol":"cUSD","localCurrencySymbol":"₱"}'
    )
  })

  it('renders correctly with to local amount missing', () => {
    const { getByTestId } = renderSheet({
      fromLocalAmount: new BigNumber(10),
      toLocalAmount: null,
    })
    expect(getByTestId('FromAmount')).toHaveTextContent(
      'tokenAndLocalAmount, {"tokenAmount":"10.50","localAmount":"10.00","tokenSymbol":"CELO","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('ToAmount')).toHaveTextContent(
      'tokenAndLocalAmount, {"context":"noFiatPrice","tokenAmount":"11.50","localAmount":"","tokenSymbol":"cUSD","localCurrencySymbol":"₱"}'
    )
  })

  it('renders correctly with both local amounts missing', () => {
    const { getByTestId } = renderSheet({
      fromLocalAmount: null,
      toLocalAmount: null,
    })
    expect(getByTestId('FromAmount')).toHaveTextContent(
      'tokenAndLocalAmount, {"context":"noFiatPrice","tokenAmount":"10.50","localAmount":"","tokenSymbol":"CELO","localCurrencySymbol":"₱"}'
    )
    expect(getByTestId('ToAmount')).toHaveTextContent(
      'tokenAndLocalAmount, {"context":"noFiatPrice","tokenAmount":"11.50","localAmount":"","tokenSymbol":"cUSD","localCurrencySymbol":"₱"}'
    )
  })

  it('calls onCancel when cancel button is pressed', () => {
    const { getByText } = renderSheet()
    fireEvent.press(getByText('swapUnfavorableRateBottomSheet.cancel'))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm when confirm button is pressed', () => {
    const { getByText } = renderSheet()
    fireEvent.press(getByText('swapUnfavorableRateBottomSheet.confirm'))
    expect(onConfirm).toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
