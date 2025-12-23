import { END } from 'redux-saga'
import { expectSaga } from 'redux-saga-test-plan'
import { sendCallsSaga } from 'src/sendCalls/saga'
import { addBatch, pruneExpiredBatches } from 'src/sendCalls/slice'

const NOW = 1_000_000_000_000

describe('sendCallsSaga', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('prunes expired batches whenever addBatch dispatches', async () => {
    await expectSaga(sendCallsSaga)
      .dispatch(
        addBatch({
          id: 'test-batch',
          transactionHashes: ['0x123'],
          atomic: false,
          expiresAt: NOW,
        })
      )
      .put(pruneExpiredBatches({ now: NOW }))
      .dispatch(END)
      .run()
  })
})
