import type { RootState } from 'src/redux/reducers'
import type { SendCallsBatch } from 'src/sendCalls/slice'

export const selectBatch = (state: RootState, id: string, notExpiredAt?: number) => {
  const batch: SendCallsBatch | undefined = state.sendCalls?.batchById?.[id]
  if (!batch) return undefined
  if (!notExpiredAt) return batch
  return batch.expiresAt > notExpiredAt ? batch : undefined
}
