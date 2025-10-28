import { WebViewMessageEvent } from '@interaxyz/react-native-webview'
import { useCallback, useEffect, useRef, useState } from 'react'
import { WebViewRef } from 'src/components/WebView'
import { networkConnectedSelector } from 'src/networkInfo/selectors'
import { useSelector } from 'src/redux/hooks'
import Logger from 'src/utils/Logger'
import networkConfig, { networkIdToNetwork } from 'src/web3/networkConfig'
import { toHex } from 'viem'
import { emitConnect, emitDisconnect } from './events'
import { getInjectedProviderScript } from './injectedProvider'
import { handleProviderRequest } from './requests'
import { ProviderMessage } from './types'

const TAG = 'ethereumProvider/useEthereumProvider'

export function useEthereumProvider(webViewRef: React.RefObject<WebViewRef>) {
  const isNetworkConnected = useSelector(networkConnectedSelector)
  const prevIsConnected = useRef<boolean | null>(null)

  const defaultChainId = toHex(
    networkConfig.viemChain[networkIdToNetwork[networkConfig.defaultNetworkId]].id
  )

  const [injectedJavaScript] = useState(() =>
    getInjectedProviderScript({ isConnected: isNetworkConnected, chainId: defaultChainId })
  )

  // Handle incoming messages from WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: ProviderMessage = JSON.parse(event.nativeEvent.data)

        if (message.type === 'request') {
          handleProviderRequest(webViewRef, message.data)
        }
      } catch (error) {
        Logger.error(TAG, 'Error parsing provider message', error)
      }
    },
    [webViewRef]
  )

  // Handle online/offline transitions
  useEffect(() => {
    if (webViewRef.current) {
      if (prevIsConnected.current !== null && prevIsConnected.current !== isNetworkConnected) {
        // Only emit events when connection status actually changes
        if (isNetworkConnected) {
          // Network came back online
          emitConnect(webViewRef, defaultChainId)
        } else {
          // Network went offline
          emitDisconnect(webViewRef)
        }
      }

      prevIsConnected.current = isNetworkConnected
    }
  }, [webViewRef.current, isNetworkConnected, defaultChainId])

  return {
    injectedJavaScript,
    handleMessage,
  }
}
