import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getRehydratePayload, REHYDRATE, RehydrateAction } from 'src/redux/persist-helper'
import { RootState } from 'src/redux/store'

interface ReferralState {
  successfulReferrals: {
    [key: string]: boolean // key is `${divviId}-${campaignIds.join(',')}` where campaignIds are sorted
  }
}

const initialState: ReferralState = {
  successfulReferrals: {},
}

const divviProtocolSlice = createSlice({
  name: 'divviProtocol',
  initialState,
  reducers: {
    markReferralSuccessful: (
      state,
      action: PayloadAction<{ divviId: string; campaignIds: string[] }>
    ) => {
      const { divviId, campaignIds } = action.payload
      const sortedCampaignIds = [...campaignIds].sort()
      const key = `${divviId}-${sortedCampaignIds.join(',')}`
      state.successfulReferrals[key] = true
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action: RehydrateAction) => ({
      ...state,
      ...getRehydratePayload(action, 'divviProtocol'),
    }))
  },
})

export const { markReferralSuccessful } = divviProtocolSlice.actions

export const selectIsReferralSuccessful = (
  state: RootState,
  divviId: string,
  campaignIds: string[]
) => {
  const sortedCampaignIds = [...campaignIds].sort()
  const key = `${divviId}-${sortedCampaignIds.join(',')}`
  return state.divviProtocol.successfulReferrals[key] ?? false
}

export default divviProtocolSlice.reducer
