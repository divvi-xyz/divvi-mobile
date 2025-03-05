import { fireEvent, render } from '@testing-library/react-native'
import lodash from 'lodash'
import React from 'react'
import { Provider } from 'react-redux'
import InfoBottomSheet from 'src/components/InfoBottomSheet'
import { createMockStore } from 'test/utils'

describe('InfoBottomSheet', () => {
  it('renders the structure properly', () => {
    const { getByTestId } = render(
      <Provider store={createMockStore()}>
        <InfoBottomSheet
          forwardedRef={{ current: null }}
          title="Info Bottom Sheet Title"
          testID="TestInfoBottomSheet"
        >
          Info Bottom Sheet Content
        </InfoBottomSheet>
      </Provider>
    )

    expect(getByTestId('TestInfoBottomSheet')).toHaveTextContent('Info Bottom Sheet Title')
    expect(getByTestId('TestInfoBottomSheet/Content')).toHaveTextContent(
      'Info Bottom Sheet Content'
    )
    expect(getByTestId('TestInfoBottomSheet/DismissButton')).toHaveTextContent(
      'bottomSheetDismissButton'
    )
  })

  it('properly executes dismiss action when dismiss button is pressed', async () => {
    const mockClose = jest.fn() as any
    // this is necessary to eliminate hurdles with the onPress implementation of the Button component
    jest.spyOn(lodash, 'debounce').mockReturnValue(mockClose)

    const { getByTestId } = render(
      <Provider store={createMockStore()}>
        <InfoBottomSheet
          forwardedRef={{ current: { close: mockClose } as any }}
          title="Info Bottom Sheet Title"
          testID="TestInfoBottomSheet"
        >
          Info Bottom Sheet Content
        </InfoBottomSheet>
      </Provider>
    )

    fireEvent.press(getByTestId('TestInfoBottomSheet/DismissButton'))
    expect(mockClose).toHaveBeenCalledTimes(1)
  })
})
