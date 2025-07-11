import { submitReferral } from '@divvi/referral-sdk'
import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { call } from 'redux-saga-test-plan/matchers'
import { throwError } from 'redux-saga-test-plan/providers'
import { Address } from 'viem'
import { submitDivviReferralSaga } from './saga'

const provideDelay = ({ fn }: { fn: { name: string } }, next: () => void) =>
  fn.name === 'delayP' || fn.name === 'delay' ? null : next()

describe('submitDivviReferralSaga', () => {
  const mockParams = {
    txHash: '0x123' as Address,
    chainId: 1,
  }

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('successfully submits a referral on first try', async () => {
    await expectSaga(submitDivviReferralSaga, mockParams)
      .provide([[matchers.call.fn(submitReferral), undefined]])
      .run()
  })

  it('retries on server error and succeeds', async () => {
    const serverError = new Error('Server error')

    await expectSaga(submitDivviReferralSaga, mockParams)
      .provide([
        [call(submitReferral), throwError(serverError)],
        { call: provideDelay },
        [call(submitReferral), undefined],
      ])
      .run()
  })

  it('stops retrying on client error', async () => {
    const clientError = new Error('Client error')

    await expectSaga(submitDivviReferralSaga, mockParams)
      .provide([[matchers.call.fn(submitReferral), throwError(clientError)]])
      .run()
  })
})
