import { RehydrateAction } from 'redux-persist'
import { Actions, ActionTypes } from 'src/home/actions'
import { getRehydratePayload, REHYDRATE } from 'src/redux/persist-helper'
import { NetworkId } from 'src/transactions/types'

export const DEFAULT_PRIORITY = 20

export interface NotificationTexts {
  body: string
  cta: string
  dismiss: string
}

export interface Notification {
  ctaUri: string
  content: { [lang: string]: NotificationTexts | undefined }
  dismissed?: boolean
  iconUrl?: string
  minVersion?: string
  maxVersion?: string
  countries?: string[]
  blockedCountries?: string[]
  openExternal?: boolean
  priority?: number
  showOnHomeScreen?: boolean
}

export interface IdToNotification {
  [id: string]: Notification | undefined
}

export enum NftCelebrationStatus {
  celebrationReadyToDisplay = 'celebrationReadyToDisplay',
  celebrationDisplayed = 'celebrationDisplayed',
  rewardReadyToDisplay = 'rewardReadyToDisplay',
  rewardDisplayed = 'rewardDisplayed',
  reminderReadyToDisplay = 'reminderReadyToDisplay',
  reminderDisplayed = 'reminderDisplayed',
}

export interface State {
  loading: boolean
  notifications: IdToNotification
  hasVisitedHome: boolean
  hasSeenDivviBottomSheet: boolean
  nftCelebration: {
    networkId: NetworkId
    contractAddress: string
    status: NftCelebrationStatus
    rewardExpirationDate: string
    rewardReminderDate: string
    deepLink: string
  } | null
}

export const initialState = {
  loading: false,
  notifications: {},
  hasVisitedHome: false,
  hasSeenDivviBottomSheet: false,
  nftCelebration: null,
}

export const homeReducer = (
  state: State = initialState,
  action: ActionTypes | RehydrateAction
): State => {
  switch (action.type) {
    case REHYDRATE: {
      // Ignore some persisted properties
      const rehydratedState = getRehydratePayload(action, 'home')
      return {
        ...state,
        ...rehydratedState,
        loading: false,
      }
    }
    case Actions.SET_LOADING:
      return {
        ...state,
        loading: action.loading,
      }
    case Actions.UPDATE_NOTIFICATIONS:
      // Doing it this way removes any notifications not received on the action.
      let updatedNotifications = {}
      for (const [id, updatedNotification] of Object.entries(action.notifications)) {
        if (!updatedNotification) {
          continue
        }
        const existingNotification = state.notifications[id]
        updatedNotifications = {
          ...updatedNotifications,
          [id]: {
            priority: DEFAULT_PRIORITY,
            ...updatedNotification,
            // Keep locally modified fields
            ...(existingNotification
              ? {
                  dismissed: existingNotification.dismissed,
                }
              : undefined),
          },
        }
      }
      return {
        ...state,
        notifications: updatedNotifications,
      }
    case Actions.DISMISS_NOTIFICATION:
      const notification = state.notifications[action.id]
      if (!notification) {
        return state
      }
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [action.id]: {
            ...notification,
            dismissed: true,
          },
        },
      }
    case Actions.VISIT_HOME:
      return {
        ...state,
        hasVisitedHome: true,
      }
    case Actions.CELEBRATED_NFT_FOUND:
      return {
        ...state,
        nftCelebration: {
          networkId: action.networkId,
          contractAddress: action.contractAddress,
          deepLink: action.deepLink,
          rewardExpirationDate: action.rewardExpirationDate,
          rewardReminderDate: action.rewardReminderDate,
          status: NftCelebrationStatus.celebrationReadyToDisplay,
        },
      }
    case Actions.NFT_CELEBRATION_DISPLAYED:
      if (!state.nftCelebration) {
        return state
      }

      return {
        ...state,
        nftCelebration: {
          ...state.nftCelebration,
          status: NftCelebrationStatus.celebrationDisplayed,
        },
      }
    case Actions.NFT_REWARD_READY_TO_DISPLAY:
      if (!state.nftCelebration) {
        return state
      }

      return {
        ...state,
        nftCelebration: {
          ...state.nftCelebration,
          status: action.showReminder
            ? NftCelebrationStatus.reminderReadyToDisplay
            : NftCelebrationStatus.rewardReadyToDisplay,
          ...action.valuesToSync,
        },
      }
    case Actions.NFT_REWARD_DISPLAYED:
      if (!state.nftCelebration) {
        return state
      }

      return {
        ...state,
        nftCelebration: {
          ...state.nftCelebration,
          status:
            state.nftCelebration?.status === NftCelebrationStatus.reminderReadyToDisplay
              ? NftCelebrationStatus.reminderDisplayed
              : NftCelebrationStatus.rewardDisplayed,
        },
      }
    case Actions.DIVVI_BOTTOM_SHEET_SEEN:
      return {
        ...state,
        hasSeenDivviBottomSheet: true,
      }
    default:
      return state
  }
}
