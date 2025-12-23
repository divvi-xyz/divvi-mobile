import { startOnboardingTimeSelector } from 'src/account/selectors'
import { walletAddressSelector } from 'src/web3/selectors'

export function getDefaultStatsigUser() {
  // Inlined to avoid require cycles
  // like src/statsig/index.ts -> src/redux/store.ts -> src/redux/sagas.ts -> src/positions/saga.ts -> src/statsig/index.ts
  // and similar
  const { store } = require('src/redux/store')
  const state = store.getState()
  return {
    userID: walletAddressSelector(state) ?? undefined,
    custom: {
      startOnboardingTime: startOnboardingTimeSelector(state),
      loadTime: Date.now(),
    },
  }
}
