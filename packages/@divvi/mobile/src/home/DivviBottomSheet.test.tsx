import { render } from '@testing-library/react-native'
import React from 'react'
import { Provider } from 'react-redux'
import { getFeatureGate } from 'src/statsig'
import { createMockStore } from 'test/utils'
import DivviBottomSheet from './DivviBottomSheet'

jest.mock('src/analytics/AppAnalytics')
jest.mock('src/statsig')

describe('DivviBottomSheet', () => {
  beforeEach(() => {
    jest.mocked(getFeatureGate).mockReturnValue(true)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly when bottom sheet has not been seen before and feature gate is true', () => {
    const store = createMockStore({
      home: { hasSeenDivviBottomSheet: false },
    })
    const { getByText } = render(
      <Provider store={store}>
        <DivviBottomSheet />
      </Provider>
    )
    expect(getByText('divviBottomSheet.title')).toBeTruthy()
    expect(getByText('divviBottomSheet.cta')).toBeTruthy()
  })

  it('does not render when bottom sheet has been seen before', () => {
    const store = createMockStore({
      home: { hasSeenDivviBottomSheet: true },
    })
    const { queryByText } = render(
      <Provider store={store}>
        <DivviBottomSheet />
      </Provider>
    )
    expect(queryByText('divviBottomSheet.title')).toBeNull()
    expect(queryByText('divviBottomSheet.cta')).toBeNull()
  })

  it('does not render when bottom sheet has not been seen and feature gate is false', () => {
    jest.mocked(getFeatureGate).mockReturnValue(false)
    const store = createMockStore({
      home: { hasSeenDivviBottomSheet: false },
    })
    const { queryByText } = render(
      <Provider store={store}>
        <DivviBottomSheet />
      </Provider>
    )
    expect(queryByText('divviBottomSheet.title')).toBeNull()
    expect(queryByText('divviBottomSheet.cta')).toBeNull()
  })
})
