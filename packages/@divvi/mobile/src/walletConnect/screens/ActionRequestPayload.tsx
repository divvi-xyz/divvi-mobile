import { WalletKitTypes } from '@reown/walletkit'
import { SessionTypes } from '@walletconnect/types'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { WalletConnectEvents } from 'src/analytics/Events'
import DataFieldWithCopy from 'src/components/DataFieldWithCopy'
import { activeDappSelector } from 'src/dapps/selectors'
import { useSelector } from 'src/redux/hooks'
import { trimLeading0x } from 'src/utils/address'
import { SerializableTransactionRequest } from 'src/viem/preparedTransactionSerialization'
import {
  getDefaultRequestTrackedProperties,
  getDefaultSessionTrackedProperties,
} from 'src/walletConnect/analytics'
import { SupportedActions } from 'src/walletConnect/constants'
import { MessageMethod, SendCallsMethod, TransactionMethod } from 'src/walletConnect/types'

interface BaseProps {
  session: SessionTypes.Struct
  request: WalletKitTypes.EventArguments['session_request']
}

interface MessageProps extends BaseProps {
  method: MessageMethod
}

interface TransactionProps extends BaseProps {
  method: TransactionMethod | SendCallsMethod
  preparedRequest?: SerializableTransactionRequest | SerializableTransactionRequest[]
}

function ActionRequestPayload(props: MessageProps | TransactionProps) {
  const method = props.method
  const { params } = props.request.params.request

  const { t } = useTranslation()
  const activeDapp = useSelector(activeDappSelector)

  const moreInfoString = useMemo(() => {
    switch (method) {
      case SupportedActions.eth_signTransaction:
      case SupportedActions.eth_sendTransaction:
      case SupportedActions.wallet_sendCalls:
        return JSON.stringify(props.preparedRequest ?? params)
      case SupportedActions.eth_signTypedData:
      case SupportedActions.eth_signTypedData_v4:
        return JSON.stringify(params[1])
      case SupportedActions.personal_sign:
        return (
          Buffer.from(trimLeading0x(params[0]), 'hex').toString() ||
          params[0] ||
          t('action.emptyMessage')
        )
      default:
        return null
    }
  }, [method, params, props])

  const handleTrackCopyRequestPayload = () => {
    const defaultTrackedProps = {
      ...getDefaultSessionTrackedProperties(props.session, activeDapp),
      ...getDefaultRequestTrackedProperties(props.request),
    }

    AppAnalytics.track(WalletConnectEvents.wc_copy_request_payload, defaultTrackedProps)
  }

  if (!moreInfoString) {
    return null
  }

  return (
    <DataFieldWithCopy
      label={t('walletConnectRequest.transactionDataLabel')}
      value={moreInfoString}
      copySuccessMessage={t('walletConnectRequest.transactionDataCopied')}
      testID="WalletConnectRequest/ActionRequestPayload"
      onCopy={handleTrackCopyRequestPayload}
    />
  )
}

export default ActionRequestPayload
