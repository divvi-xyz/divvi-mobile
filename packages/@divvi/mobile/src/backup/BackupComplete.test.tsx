import { render } from '@testing-library/react-native'
import * as React from 'react'
import 'react-native'
import { Provider } from 'react-redux'
import AppAnalytics from 'src/analytics/AppAnalytics'
import BackupComplete from 'src/backup/BackupComplete'
import { navigate, navigateInitialTab } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { createMockStore, getMockStackScreenProps } from 'test/utils'

describe('BackupComplete', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })
  it('renders correctly', () => {
    const tree = render(
      <Provider
        store={createMockStore({
          account: { backupCompleted: true },
        })}
      >
        <BackupComplete {...getMockStackScreenProps(Screens.BackupComplete)} />
      </Provider>
    )
    expect(tree).toMatchSnapshot()
  })

  it('navigates to settings on account removal', () => {
    render(
      <Provider
        store={createMockStore({
          account: { backupCompleted: true },
        })}
      >
        <BackupComplete
          {...getMockStackScreenProps(Screens.BackupComplete, { isAccountRemoval: true })}
        />
      </Provider>
    )
    jest.advanceTimersByTime(2000)
    expect(navigate).toHaveBeenCalledWith(Screens.SecuritySubmenu, {
      promptConfirmRemovalModal: true,
    })
  })

  it('navigates home and fires analytics event when not on account removal', () => {
    render(
      <Provider
        store={createMockStore({
          account: { backupCompleted: true },
        })}
      >
        <BackupComplete {...getMockStackScreenProps(Screens.BackupComplete)} />
      </Provider>
    )
    jest.advanceTimersByTime(2000)
    expect(navigateInitialTab).toHaveBeenCalledWith()
    expect(AppAnalytics.track).toHaveBeenCalledWith('backup_complete')
  })
})
