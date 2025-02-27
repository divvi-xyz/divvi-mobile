import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { HomeEvents } from 'src/analytics/Events'
import { getAppConfig } from 'src/appConfig'
import NotificationBell from 'src/home/NotificationBell'
import { PublicAppConfig } from 'src/public'
import { createMockStore } from 'test/utils'

jest.mock('src/analytics/AppAnalytics')

const testId = 'NotificationBell'

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getAppConfig).mockReturnValue({
      displayName: 'Test App',
      deepLinkUrlScheme: 'testapp',
      registryName: 'test',
      features: {
        notificationCenter: true,
      },
    })
  })

  it('renders nothing if notification center is not enabled', () => {
    jest.mocked(getAppConfig).mockReturnValue({
      features: {
        notificationCenter: false,
      },
    } as PublicAppConfig)

    const { toJSON } = render(
      <Provider store={createMockStore()}>
        <NotificationBell testID={testId} />
      </Provider>
    )

    expect(toJSON()).toBeNull()
  })

  it(`emits the analytics event on press when there is no new notification`, () => {
    const storeDataWithoutNotification = {
      account: {
        backupCompleted: true,
        dismissedGetVerified: true,
        celoEducationCompleted: true,
      },
    }

    const { getByTestId } = render(
      <Provider store={createMockStore(storeDataWithoutNotification)}>
        <NotificationBell testID={testId} />
      </Provider>
    )

    expect(getByTestId(testId)).toBeTruthy()
    fireEvent.press(getByTestId(testId))
    expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
    expect(AppAnalytics.track).toHaveBeenCalledWith(HomeEvents.notification_bell_pressed, {
      hasNotifications: false,
    })
  })

  it(`emits the analytics event on press when there are notifications`, () => {
    const { getByTestId } = render(
      <Provider store={createMockStore({})}>
        <NotificationBell testID={testId} />
      </Provider>
    )

    expect(getByTestId(testId)).toBeTruthy()
    fireEvent.press(getByTestId(testId))
    expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
    expect(AppAnalytics.track).toHaveBeenCalledWith(HomeEvents.notification_bell_pressed, {
      hasNotifications: true,
    })
  })
})
