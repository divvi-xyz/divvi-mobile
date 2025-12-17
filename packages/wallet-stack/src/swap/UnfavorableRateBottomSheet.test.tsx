import { fireEvent, render, waitFor } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React, { act } from 'react'
import { PanResponder } from 'react-native'
import { Provider } from 'react-redux'
import UnfavorableRateBottomSheet from 'src/swap/UnfavorableRateBottomSheet'
import { createMockStore } from 'test/utils'
import { mockCeloTokenBalance, mockCusdTokenBalance } from 'test/values'

jest.unmock('src/swap/UnfavorableRateBottomSheet')

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
    jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config: any) => ({ panHandlers: config }))
    jest.useFakeTimers()
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

  it('calls onConfirm when slider is completed and then resets', async () => {
    const { getByTestId, getByText, queryByText } = renderSheet()
    const slider = getByTestId('SlideButton/Slider')
    // Simulate sliding action
    slider.props.onPanResponderRelease(null, { dx: 2 })

    await waitFor(() => {
      expect(getByText('swapUnfavorableRateBottomSheet.confirmed')).toBeTruthy()
      expect(queryByText('swapUnfavorableRateBottomSheet.confirm')).toBeFalsy()
    })

    jest.advanceTimersByTime(600)

    expect(onConfirm).toHaveBeenCalled()

    await act(() => jest.advanceTimersByTime(600))

    await waitFor(() => {
      expect(queryByText('swapUnfavorableRateBottomSheet.confirmed')).toBeFalsy()
      expect(queryByText('swapUnfavorableRateBottomSheet.confirm')).toBeTruthy()
    })

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('does not call onConfirm when slider is not completed', () => {
    const { getByTestId } = renderSheet()
    const slider = getByTestId('SlideButton/Slider')
    slider.props.onPanResponderRelease(null, { dx: 1 })

    jest.advanceTimersByTime(600)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
