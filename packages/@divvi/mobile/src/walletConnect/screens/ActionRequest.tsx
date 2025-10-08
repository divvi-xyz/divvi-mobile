import { getSdkError } from '@walletconnect/utils'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import InLineNotification, { NotificationVariant } from 'src/components/InLineNotification'
import { useDispatch, useSelector } from 'src/redux/hooks'
import { NETWORK_NAMES } from 'src/shared/conts'
import { Spacing } from 'src/styles/styles'
import Logger from 'src/utils/Logger'
import { acceptRequest, denyRequest } from 'src/walletConnect/actions'
import { chainAgnosticActions, getDisplayTextFromAction } from 'src/walletConnect/constants'
import ActionRequestPayload from 'src/walletConnect/screens/ActionRequestPayload'
import DappsDisclaimer from 'src/walletConnect/screens/DappsDisclaimer'
import EstimatedNetworkFee from 'src/walletConnect/screens/EstimatedNetworkFee'
import RequestContent, { useDappMetadata } from 'src/walletConnect/screens/RequestContent'
import { useIsDappListed } from 'src/walletConnect/screens/useIsDappListed'
import { sessionsSelector } from 'src/walletConnect/selectors'
import {
  isSendCallsMethod,
  isTransactionMethod,
  MessageRequest,
  SendCallsRequest,
  TransactionRequest,
} from 'src/walletConnect/types'
import { walletConnectChainIdToNetworkId } from 'src/web3/networkConfig'

export type ActionRequestProps =
  | TransactionRequestProps
  | MessageRequestProps
  | SendCallsRequestProps

type RequestProps = {
  version: 2
  supportedChains: string[]
}

type TransactionRequestProps = RequestProps & TransactionRequest

type MessageRequestProps = RequestProps & MessageRequest

type SendCallsRequestProps = RequestProps & SendCallsRequest

function isTransactionRequest(props: ActionRequestProps): props is TransactionRequestProps {
  return isTransactionMethod(props.method)
}

function isSendCallsRequest(props: ActionRequestProps): props is SendCallsRequestProps {
  return isSendCallsMethod(props.method)
}

function ActionRequest(props: ActionRequestProps) {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const { request, supportedChains, method } = props

  const sessions = useSelector(sessionsSelector)
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.topic === request.topic)
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

  const chainId = request.params.chainId
  const networkId = walletConnectChainIdToNetworkId[chainId]
  const networkName = NETWORK_NAMES[networkId]

  const { description, title, action } = getDisplayTextFromAction(
    t,
    method,
    dappName,
    networkName,
    (isSendCallsRequest(props) &&
      props.preparedTransactions.success &&
      props.preparedTransactions.transactionRequests.length) ||
      0
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
        onDismiss={() => dispatch(denyRequest(request, getSdkError('UNSUPPORTED_CHAINS')))}
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

  if ((isTransactionRequest(props) || isSendCallsRequest(props)) && props.hasInsufficientGasFunds) {
    return (
      <RequestContent
        type="dismiss"
        onDismiss={() => dispatch(denyRequest(request, getSdkError('USER_REJECTED')))}
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
            feeCurrencies: props.feeCurrenciesSymbols.join(', '),
          })}
          style={styles.warning}
        />
      </RequestContent>
    )
  }

  let errorMessage: string | undefined
  if (isTransactionRequest(props) && !props.preparedTransaction.success) {
    errorMessage = props.preparedTransaction.errorMessage
  }
  if (isSendCallsRequest(props) && !props.preparedTransactions.success) {
    errorMessage = props.preparedTransactions.errorMessage
  }

  if (errorMessage) {
    return (
      <RequestContent
        type="dismiss"
        onDismiss={() => dispatch(denyRequest(request, getSdkError('USER_REJECTED')))}
        dappName={dappName}
        dappImageUrl={dappImageUrl}
        title={title}
        description={description}
        testId="WalletConnectActionRequest"
      >
        <ActionRequestPayload session={activeSession} request={request} method={method} />
        <InLineNotification
          variant={NotificationVariant.Warning}
          title={t('walletConnectRequest.failedToPrepareTransaction.title')}
          description={t('walletConnectRequest.failedToPrepareTransaction.description', {
            errorMessage,
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
      onAccept={() => dispatch(acceptRequest(props))}
      onDeny={() => {
        dispatch(denyRequest(request, getSdkError('USER_REJECTED')))
      }}
      dappName={dappName}
      dappImageUrl={dappImageUrl}
      title={title}
      description={description}
      testId="WalletConnectActionRequest"
    >
      <ActionRequestPayload
        session={activeSession}
        request={request}
        method={method}
        preparedTransaction={
          isTransactionRequest(props) && props.preparedTransaction.success
            ? props.preparedTransaction.transactionRequest
            : undefined
        }
        preparedTransactions={
          isSendCallsRequest(props) && props.preparedTransactions.success
            ? props.preparedTransactions.transactionRequests
            : undefined
        }
      />
      {isTransactionRequest(props) && props.preparedTransaction.success && (
        <EstimatedNetworkFee
          isLoading={false}
          networkId={networkId}
          transactions={[props.preparedTransaction.transactionRequest]}
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
