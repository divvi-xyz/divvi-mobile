import type { RootState } from 'src/redux/reducers'
import type { SendCallsBatch } from 'src/sendCalls/slice'

export const selectBatch = (state: RootState, id: string, now?: number) => {
  const batch: SendCallsBatch | undefined = state.sendCalls?.batchById?.[id]
  if (!batch) return undefined
  if (!now) return batch
  return batch.expiresAt > now ? batch : undefined
}
