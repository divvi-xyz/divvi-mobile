import { getSdkError } from '@walletconnect/utils'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import InLineNotification, { NotificationVariant } from 'src/components/InLineNotification'
import { useDispatch, useSelector } from 'src/redux/hooks'
import { Spacing } from 'src/styles/styles'
import Logger from 'src/utils/Logger'
import { acceptRequest, denyOptionalUpgrade, denyRequest } from 'src/walletConnect/actions'
import ActionRequestPayload from 'src/walletConnect/screens/ActionRequestPayload'
import DappsDisclaimer from 'src/walletConnect/screens/DappsDisclaimer'
import EstimatedNetworkFee from 'src/walletConnect/screens/EstimatedNetworkFee'
import RequestContent, { useDappMetadata } from 'src/walletConnect/screens/RequestContent'
import { useIsDappListed } from 'src/walletConnect/screens/useIsDappListed'
import { sessionsSelector } from 'src/walletConnect/selectors'
import { SmartAccountConversionRequest } from 'src/walletConnect/types'
import { walletConnectChainIdToNetworkId } from 'src/web3/networkConfig'

export type SmartAccountConversionRequestProps = SmartAccountConversionRequest & {
  version: 2
  supportedChains: string[]
}

function SmartAccountConversionRequestComponent(props: SmartAccountConversionRequestProps) {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const { request, method, atomicRequired } = props

  const sessions = useSelector(sessionsSelector)
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.topic === request.topic)
  }, [sessions])
  const { url, dappName, dappImageUrl } = useDappMetadata(activeSession?.peer.metadata)
  const isDappListed = useIsDappListed(url)

  if (!activeSession) {
    // should never happen
    Logger.error(
      'WalletConnectRequest/SmartAccountConversionRequest',
      'No active WallectConnect session could be found'
    )
    return null
  }

  const chainId = request.params.chainId
  const networkId = walletConnectChainIdToNetworkId[chainId]

  // Note: We don't use getDisplayTextFromAction here since we have custom titles and descriptions

  const handleAcceptSmartAccountConversion = () => {
    // TODO: Implement smart account conversion logic
    Logger.info('SmartAccountConversionRequest', 'User accepted smart account conversion')
    // For now, just accept the original request
    dispatch(acceptRequest(props))
  }

  const handleDenySmartAccountConversion = () => {
    // TODO: Implement smart account conversion denial logic
    Logger.info('SmartAccountConversionRequest', 'User denied smart account conversion')
    if (atomicRequired) {
      // If atomic is required and user denies conversion, cancel the transaction
      dispatch(denyRequest(request, getSdkError('USER_REJECTED')))
    } else {
      // If atomic is not required, proceed with regular transaction without showing upgrade prompt again
      dispatch(denyOptionalUpgrade(request))
    }
  }

  return (
    <RequestContent
      type="confirm"
      buttonText={t('walletConnectRequest.smartAccountConversion.convertButton')}
      secondaryButtonText={
        atomicRequired
          ? t('dismiss')
          : t('walletConnectRequest.smartAccountConversion.continueWithoutConverting')
      }
      onAccept={handleAcceptSmartAccountConversion}
      onDeny={handleDenySmartAccountConversion}
      dappName={dappName}
      dappImageUrl={dappImageUrl}
      title={t('walletConnectRequest.smartAccountConversion.title')}
      description={
        atomicRequired
          ? t('walletConnectRequest.smartAccountConversion.descriptionRequired', { dappName })
          : t('walletConnectRequest.smartAccountConversion.descriptionOptional', { dappName })
      }
      testId="WalletConnectSmartAccountConversionRequest"
    >
      <InLineNotification
        variant={NotificationVariant.Info}
        title={t('walletConnectRequest.smartAccountConversion.notificationTitle')}
        description={
          atomicRequired
            ? t('walletConnectRequest.smartAccountConversion.notificationDescriptionRequired')
            : t('walletConnectRequest.smartAccountConversion.notificationDescriptionOptional')
        }
        style={styles.notification}
      />

      <ActionRequestPayload
        session={activeSession}
        request={request}
        method={method}
        preparedRequest={
          props.preparedRequest.success ? props.preparedRequest.data : undefined
        }
      />

      {props.preparedRequest.success && (
        <EstimatedNetworkFee
          isLoading={false}
          networkId={networkId}
          transactions={props.preparedRequest.data}
        />
      )}

      <DappsDisclaimer isDappListed={isDappListed} />
    </RequestContent>
  )
}

const styles = StyleSheet.create({
  notification: {
    marginBottom: Spacing.Thick24,
  },
})

export default SmartAccountConversionRequestComponent
