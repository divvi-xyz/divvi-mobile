import { WalletKitTypes } from '@reown/walletkit'
import { getSdkError } from '@walletconnect/utils'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import InLineNotification, { NotificationVariant } from 'src/components/InLineNotification'
import { useDispatch, useSelector } from 'src/redux/hooks'
import { NETWORK_NAMES } from 'src/shared/conts'
import { Spacing } from 'src/styles/styles'
import Logger from 'src/utils/Logger'
import { SerializableTransactionRequest } from 'src/viem/preparedTransactionSerialization'
import { acceptRequest, denyRequest } from 'src/walletConnect/actions'
import {
  SupportedActions,
  chainAgnosticActions,
  getDisplayTextFromAction,
} from 'src/walletConnect/constants'
import ActionRequestPayload from 'src/walletConnect/screens/ActionRequestPayload'
import DappsDisclaimer from 'src/walletConnect/screens/DappsDisclaimer'
import EstimatedNetworkFee from 'src/walletConnect/screens/EstimatedNetworkFee'
import RequestContent, { useDappMetadata } from 'src/walletConnect/screens/RequestContent'
import { useIsDappListed } from 'src/walletConnect/screens/useIsDappListed'
import { sessionsSelector } from 'src/walletConnect/selectors'
import { walletConnectChainIdToNetworkId } from 'src/web3/networkConfig'

export interface ActionRequestProps {
  version: 2
  pendingAction: WalletKitTypes.EventArguments['session_request']
  supportedChains: string[]
  hasInsufficientGasFunds: boolean
  feeCurrenciesSymbols: string[]
  preparedTransaction?: SerializableTransactionRequest
  prepareTransactionErrorMessage?: string
}

function ActionRequest({
  pendingAction,
  supportedChains,
  hasInsufficientGasFunds,
  feeCurrenciesSymbols,
  preparedTransaction,
  prepareTransactionErrorMessage,
}: ActionRequestProps) {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const sessions = useSelector(sessionsSelector)
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.topic === pendingAction.topic)
  }, [sessions])
  const { url, dappName, dappImageUrl } = useDappMetadata(activeSession?.peer.metadata)
  const isDappListed = useIsDappListed(url)

  if (!activeSession) {
    // should never happen
    Logger.error(
      'WalletConnectRequest/ActionRequestV2',
      'No active WallectConnect session could be found'
    )
    return null
  }

  const chainId = pendingAction.params.chainId
  const networkId = walletConnectChainIdToNetworkId[chainId]
  const networkName = NETWORK_NAMES[networkId]
  const method = pendingAction.params.request.method

  const { description, title, action } = getDisplayTextFromAction(
    t,
    method as SupportedActions,
    dappName,
    networkName
  )

  // Reject and warn if the chain is not supported
  // Note: we still allow off-chain actions like personal_sign on unsupported
  // chains (Cred Protocol does this) as this does not depend on the chainId
  if (!supportedChains.includes(chainId) && !chainAgnosticActions.includes(method)) {
    const supportedNetworkNames = supportedChains
      .map((chain) => NETWORK_NAMES[walletConnectChainIdToNetworkId[chain]])
      .join(`, `)

    return (
      <RequestContent
        type="dismiss"
        onDismiss={() => dispatch(denyRequest(pendingAction, getSdkError('UNSUPPORTED_CHAINS')))}
        dappName={dappName}
        dappImageUrl={dappImageUrl}
        title={title}
        description={description}
        testId="WalletConnectActionRequest"
      >
        <InLineNotification
          variant={NotificationVariant.Warning}
          title={t('walletConnectRequest.unsupportedChain.title', { dappName, chainId })}
          description={t('walletConnectRequest.unsupportedChain.descriptionV1_74', {
            dappName,
            chainId,
            supportedNetworkNames,
            count: supportedChains.length,
          })}
          style={styles.warning}
        />
      </RequestContent>
    )
  }

  if (hasInsufficientGasFunds) {
    return (
      <RequestContent
        type="dismiss"
        onDismiss={() => dispatch(denyRequest(pendingAction, getSdkError('USER_REJECTED')))}
        dappName={dappName}
        dappImageUrl={dappImageUrl}
        title={title}
        description={description}
        testId="WalletConnectActionRequest"
      >
        <InLineNotification
          variant={NotificationVariant.Warning}
          title={t('walletConnectRequest.notEnoughBalanceForGas.title')}
          description={t('walletConnectRequest.notEnoughBalanceForGas.description', {
            feeCurrencies: feeCurrenciesSymbols.join(', '),
          })}
          style={styles.warning}
        />
      </RequestContent>
    )
  }

  if (
    !preparedTransaction &&
    (method === SupportedActions.eth_signTransaction ||
      method === SupportedActions.eth_sendTransaction)
  ) {
    return (
      <RequestContent
        type="dismiss"
        onDismiss={() => dispatch(denyRequest(pendingAction, getSdkError('USER_REJECTED')))}
        dappName={dappName}
        dappImageUrl={dappImageUrl}
        title={title}
        description={description}
        testId="WalletConnectActionRequest"
      >
        <ActionRequestPayload
          session={activeSession}
          request={pendingAction}
          preparedTransaction={preparedTransaction}
        />
        <InLineNotification
          variant={NotificationVariant.Warning}
          title={t('walletConnectRequest.failedToPrepareTransaction.title')}
          description={t('walletConnectRequest.failedToPrepareTransaction.description', {
            errorMessage: prepareTransactionErrorMessage,
          })}
          style={styles.warning}
        />
      </RequestContent>
    )
  }

  return (
    <RequestContent
      type="confirm"
      buttonText={action}
      onAccept={() => dispatch(acceptRequest(pendingAction, preparedTransaction))}
      onDeny={() => {
        dispatch(denyRequest(pendingAction, getSdkError('USER_REJECTED')))
      }}
      dappName={dappName}
      dappImageUrl={dappImageUrl}
      title={title}
      description={description}
      testId="WalletConnectActionRequest"
    >
      <ActionRequestPayload
        session={activeSession}
        request={pendingAction}
        preparedTransaction={preparedTransaction}
      />
      {preparedTransaction && (
        <EstimatedNetworkFee
          isLoading={false}
          networkId={networkId}
          transactions={[preparedTransaction]}
        />
      )}
      <DappsDisclaimer isDappListed={isDappListed} />
    </RequestContent>
  )
}

const styles = StyleSheet.create({
  warning: {
    marginBottom: Spacing.Thick24,
  },
})

export default ActionRequest
