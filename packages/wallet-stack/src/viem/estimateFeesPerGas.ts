import networkConfig from 'src/web3/networkConfig'
import { Address, Client } from 'viem'
import { estimateFeesPerGas as defaultEstimateFeesPerGas, getBlock } from 'viem/actions'

export async function estimateFeesPerGas(
  client: Client,
  feeCurrency?: Address
): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; baseFeePerGas: bigint }> {
  // Wrap chain.fees.estimateFeesPerGas to capture the baseFeePerGas
  // This way we still rely on Celo's (or other chains') estimateFeesPerGas
  // with fee currency support and proper multiplier applied, but we can capture the baseFeePerGas
  // See https://github.com/wevm/viem/blob/8c425c3be08f6cedc3d8fcca9f8cfe1fe493a4a3/src/celo/fees.ts#L21-L46
  // TODO: contribute this somehow to viem so we don't need this hack
  let capturedBaseFeePerGas: bigint | undefined = undefined
  const chainEstimateFeesPerGas = client.chain?.fees?.estimateFeesPerGas
  if (client.chain?.fees && typeof chainEstimateFeesPerGas === 'function') {
    client = {
      ...client,
      chain: {
        ...client.chain,
        fees: {
          ...client.chain.fees,
          estimateFeesPerGas: async (params) => {
            return chainEstimateFeesPerGas({
              ...params,
              multiply: (base: bigint) => {
                capturedBaseFeePerGas = base
                return params.multiply(base)
              },
            })
          },
        },
      },
    }
  }

  if (feeCurrency && client.chain?.id !== networkConfig.viemChain.celo.id) {
    throw new Error('feeCurrency is only supported on Celo')
  }

  const block = await getBlock(client)

  if (!block.baseFeePerGas) {
    // should never happen since baseFeePerGas is present on the latest block
    // always since the EIP-1559 upgrade
    throw new Error(`missing baseFeePerGas on block: ${block.hash}`)
  }

  const { maxFeePerGas, maxPriorityFeePerGas } = await defaultEstimateFeesPerGas(client, {
    // estimateFeesPerGas calls internal_estimateFeesPerGas
    // which accepts a block as an argument, but it's not exposed publicly
    // We do this so we don't fetch the latest block twice.
    // See https://github.com/wevm/viem/blob/7c479d86ad68daf2fd8874cbc6eec08d6456e540/src/actions/public/estimateFeesPerGas.ts#L91
    // @ts-expect-error
    block,
    // Celo estimateFeesPerGas needs it to estimate using a feeCurrency
    request: feeCurrency ? { feeCurrency } : undefined,
  })

  if (feeCurrency && !capturedBaseFeePerGas) {
    // This should never happen
    throw new Error('Unable to capture baseFeePerGas')
  }

  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
    baseFeePerGas: capturedBaseFeePerGas ?? block.baseFeePerGas,
  }
}
