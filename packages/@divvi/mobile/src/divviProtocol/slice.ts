import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from 'src/redux/store'
import { Address } from 'viem'

interface Referral {
  txHash: Address
  chainId: number
  divviId: string
  campaignIds: string[]
}

interface ReferralState {
  pendingReferral: Referral | null
  successfulReferrals: Record<string, boolean> // key is `${divviId}-${campaignIds} where campaignIds are sorted`
}

const initialState: ReferralState = {
  pendingReferral: null,
  successfulReferrals: {},
}
const divviProtocolSlice = createSlice({
  name: 'divviProtocol',
  initialState,
  reducers: {
    referralSubmitted: (state, action: PayloadAction<Referral>) => {
      state.pendingReferral = action.payload
    },
    referralSuccessful: (state, action: PayloadAction<Referral>) => {
      const { divviId, campaignIds } = action.payload

      state.pendingReferral = null

      const sortedCampaignIds = [...campaignIds].sort()
      const key = `${divviId}-${sortedCampaignIds.join(',')}`
      state.successfulReferrals[key] = true
    },
    referralCancelled: (state, action: PayloadAction<Referral>) => {
      state.pendingReferral = null
    },
  },
})

export const { referralSubmitted, referralSuccessful, referralCancelled } =
  divviProtocolSlice.actions

export const hasReferralSucceededSelector = (
  state: RootState,
  divviId: string,
  campaignIds: string[]
) => {
  const sortedCampaignIds = [...campaignIds].sort()
  const key = `${divviId}-${sortedCampaignIds.join(',')}`
  return state.divviProtocol.successfulReferrals[key] ?? false
}

export const selectSuccessfulReferrals = (state: RootState) => {
  return state.divviProtocol.successfulReferrals
}

export default divviProtocolSlice.reducer
