import AppAnalytics from 'src/analytics/AppAnalytics'
import { getCurrentUserTraits } from 'src/analytics/selectors'
import { call, select, spawn, take } from 'typed-redux-saga'

export function* updateUserTraits() {
  let prevTraits
  while (true) {
    const traits = yield* select(getCurrentUserTraits)
    if (traits !== prevTraits) {
      const { walletAddress } = traits
      yield* call([AppAnalytics, 'identify'], walletAddress as string | null, traits)
      prevTraits = traits
    }

    yield* take()
  }
}

export function* analyticsSaga() {
  yield* spawn(updateUserTraits)
}
