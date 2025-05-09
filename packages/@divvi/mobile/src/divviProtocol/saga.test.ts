import { submitReferral } from '@divvi/referral-sdk'
import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { call } from 'redux-saga-test-plan/matchers'
import { throwError } from 'redux-saga-test-plan/providers'
import { Address } from 'viem'
import { submitReferralSaga } from './saga'
import { referralCancelled, referralSubmitted, referralSuccessful } from './slice'

const provideDelay = ({ fn }: { fn: { name: string } }, next: () => void) =>
  fn.name === 'delayP' || fn.name === 'delay' ? null : next()

describe('submitReferralSaga', () => {
  const mockReferral = {
    txHash: '0x123' as Address,
    chainId: 1,
    divviId: '0x456' as Address,
    campaignIds: ['0x789' as Address],
    status: 'pending' as const,
  }

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('successfully submits a referral on first try', async () => {
    await expectSaga(submitReferralSaga, referralSubmitted(mockReferral))
      .provide([[matchers.call.fn(submitReferral), undefined]])
      .put(referralSuccessful(mockReferral))
      .run()
  })

  it('retries on server error and succeeds', async () => {
    const serverError = new Error('Server error')

    await expectSaga(submitReferralSaga, referralSubmitted(mockReferral))
      .provide([
        [call(submitReferral), throwError(serverError)],
        { call: provideDelay },
        [call(submitReferral), undefined],
      ])
      .put(referralSuccessful(mockReferral))
      .run()
  })

  it('cancels referral on client error', async () => {
    const clientError = new Error('Client error')

    await expectSaga(submitReferralSaga, referralSubmitted(mockReferral))
      .provide([[matchers.call.fn(submitReferral), throwError(clientError)]])
      .put(referralCancelled(mockReferral))
      .run()
  })

  it('gives up after max retries', async () => {
    const serverError = new Error('Server error')
    ;(serverError as any).status = 500

    await expectSaga(submitReferralSaga, referralSubmitted(mockReferral))
      .provide([
        [matchers.call.fn(submitReferral), throwError(serverError)],
        { call: provideDelay },
      ])
      .not.put(referralSuccessful(mockReferral))
      .not.put(referralCancelled(mockReferral))
      .run()
  })
})
