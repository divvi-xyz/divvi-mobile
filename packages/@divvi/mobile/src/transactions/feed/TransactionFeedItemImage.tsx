import React from 'react'
import ContactCircle from 'src/components/ContactCircle'
import IconWithNetworkBadge from 'src/components/IconWithNetworkBadge'
import Activity from 'src/icons/Activity'
import AttentionIcon from 'src/icons/Attention'
import CircledIcon from 'src/icons/CircledIcon'
import EarnCoins from 'src/icons/EarnCoins'
import GreenLoadingSpinner from 'src/icons/GreenLoadingSpinner'
import MagicWand from 'src/icons/MagicWand'
import SwapArrows from 'src/icons/SwapArrows'
import { Recipient } from 'src/recipients/recipient'
import Colors from 'src/styles/colors'
import { NetworkId, TokenTransactionTypeV2, TransactionStatus } from 'src/transactions/types'
import Logger from 'src/utils/Logger'
import { getSupportedNetworkIds } from 'src/web3/utils'

const AVATAR_SIZE = 40

type Props = { networkId: NetworkId; status: TransactionStatus; hideNetworkIcon?: boolean } & (
  | {
      transactionType: Exclude<
        TokenTransactionTypeV2,
        TokenTransactionTypeV2.Sent | TokenTransactionTypeV2.Received
      >
    }
  | {
      transactionType: TokenTransactionTypeV2.Sent | TokenTransactionTypeV2.Received
      recipient: Recipient
      isJumpstart: boolean
    }
)

function TransactionFeedItemBaseImage(props: Props) {
  const { status, transactionType } = props

  if (status === TransactionStatus.Failed) {
    return (
      <CircledIcon backgroundColor={Colors.errorSecondary} radius={AVATAR_SIZE}>
        <AttentionIcon color={Colors.errorPrimary} size={24} testId={'FailedTransactionAlert'} />
      </CircledIcon>
    )
  }
  if (status === TransactionStatus.Pending) {
    return <GreenLoadingSpinner height={AVATAR_SIZE} />
  }
  if (
    transactionType === TokenTransactionTypeV2.SwapTransaction ||
    transactionType === TokenTransactionTypeV2.CrossChainSwapTransaction
  ) {
    return (
      <CircledIcon backgroundColor={Colors.backgroundSecondary} radius={AVATAR_SIZE}>
        <SwapArrows color={Colors.contentPrimary} />
      </CircledIcon>
    )
  }
  if (transactionType === TokenTransactionTypeV2.Approval) {
    return (
      <CircledIcon backgroundColor={Colors.backgroundSecondary} radius={AVATAR_SIZE}>
        <Activity />
      </CircledIcon>
    )
  }

  if (
    transactionType === TokenTransactionTypeV2.Sent ||
    transactionType === TokenTransactionTypeV2.Received
  ) {
    if (props.isJumpstart) {
      return (
        <CircledIcon backgroundColor={Colors.backgroundSecondary} radius={AVATAR_SIZE}>
          <MagicWand size={24} />
        </CircledIcon>
      )
    }

    return <ContactCircle recipient={props.recipient} size={AVATAR_SIZE} />
  }

  if (
    transactionType === TokenTransactionTypeV2.Deposit ||
    transactionType === TokenTransactionTypeV2.Withdraw ||
    transactionType === TokenTransactionTypeV2.ClaimReward ||
    transactionType === TokenTransactionTypeV2.CrossChainDeposit ||
    transactionType === TokenTransactionTypeV2.EarnWithdraw ||
    transactionType === TokenTransactionTypeV2.EarnDeposit ||
    transactionType === TokenTransactionTypeV2.EarnClaimReward ||
    transactionType === TokenTransactionTypeV2.EarnSwapDeposit
  ) {
    return (
      <CircledIcon backgroundColor={Colors.backgroundSecondary} radius={AVATAR_SIZE}>
        <EarnCoins size={24} color={Colors.contentPrimary} />
      </CircledIcon>
    )
  }

  // Should never happen
  Logger.error(
    'TransactionFeedItemImage',
    `Could not render image for transaction for transaction type ${transactionType} and status ${status}`
  )
  return null
}

function TransactionFeedItemImage(props: Props) {
  if (props.hideNetworkIcon || getSupportedNetworkIds().length <= 1) {
    return <TransactionFeedItemBaseImage {...props} />
  }

  return (
    <IconWithNetworkBadge networkId={props.networkId}>
      <TransactionFeedItemBaseImage {...props} />
    </IconWithNetworkBadge>
  )
}

export default TransactionFeedItemImage
