import { addBatch, pruneExpiredBatches } from 'src/sendCalls/slice'
import { safely } from 'src/utils/safely'
import { put, takeEvery } from 'typed-redux-saga'

function* pruneExpiredBatchesOnAdd() {
  yield* put(pruneExpiredBatches({ now: Date.now() }))
}

function* watchAddBatch() {
  yield* takeEvery(addBatch.type, safely(pruneExpiredBatchesOnAdd))
}

export function* sendCallsSaga() {
  yield* watchAddBatch()
}
