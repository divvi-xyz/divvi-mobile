import { getDataSuffix } from '@divvi/referral-sdk'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from 'src/redux/store'
import { Address } from 'viem'

interface Referral {
  txHash: Address
  chainId: number
  divviId: Address
  campaignIds: Address[]
  status: 'pending' | 'successful' | 'cancelled'
}

interface ReferralState {
  referrals: Record<string, Referral>
}

const initialState: ReferralState = {
  referrals: {},
}
const divviProtocolSlice = createSlice({
  name: 'divviProtocol',
  initialState,
  reducers: {
    referralSubmitted: (state, action: PayloadAction<Referral>) => {
      const { divviId, campaignIds } = action.payload
      const key = getDataSuffix({ consumer: divviId, providers: campaignIds })
      state.referrals[key] = action.payload
    },
    referralSuccessful: (state, action: PayloadAction<Referral>) => {
      const { divviId, campaignIds } = action.payload
      const key = getDataSuffix({ consumer: divviId, providers: campaignIds })
      state.referrals[key].status = 'successful'
    },
    referralCancelled: (state, action: PayloadAction<Referral>) => {
      const { divviId, campaignIds } = action.payload
      const key = getDataSuffix({ consumer: divviId, providers: campaignIds })
      state.referrals[key].status = 'cancelled'
    },
  },
})

export const { referralSubmitted, referralSuccessful, referralCancelled } =
  divviProtocolSlice.actions

export const hasReferralSucceededSelector = (
  state: RootState,
  divviId: Address,
  campaignIds: Address[]
) => {
  const key = getDataSuffix({ consumer: divviId, providers: campaignIds })
  return state.divviProtocol.referrals[key]?.status === 'successful'
}

export const selectReferrals = (state: RootState) => {
  return state.divviProtocol.referrals
}

export default divviProtocolSlice.reducer
