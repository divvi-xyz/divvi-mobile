// @ts-nocheck
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import BigNumber from 'bignumber.js'
import { getSwapToAmountInDecimals } from 'src/earn/utils'
import type { Screens } from 'src/navigator/Screens'
import type { StackParamList } from 'src/navigator/types'

type Props = NativeStackScreenProps<StackParamList, Screens.EarnDepositConfirmationScreen>

export function useDepositTokenAmount(params: Props['route']['params']) {
  const { inputAmount, mode, swapTransaction } = params
  return mode === 'swap-deposit' && swapTransaction
    ? getSwapToAmountInDecimals({ swapTransaction, fromAmount: inputAmount })
    : inputAmount
}

export function useCommonAnalyticsProperties(
  params: Props['route']['params'],
  depositAmount: BigNumber
) {
  const { pool, preparedTransaction, inputAmount, swapTransaction, inputTokenId, mode } = params
  return {
    providerId: pool.appId,
    depositTokenId: pool.dataProps.depositTokenId,
    depositTokenAmount: depositAmount.toString(),
    fromTokenId: inputTokenId,
    fromTokenAmount: inputAmount.toString(),
    fromNetworkId: preparedTransaction.feeCurrency.networkId,
    networkId: pool.networkId,
    poolId: pool.positionId,
    mode,
    swapType: swapTransaction?.swapType,
  }
}

export default function EarnDepositConfirmationScreen(props: Props) {
  return null
}
