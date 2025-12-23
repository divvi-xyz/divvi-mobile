import { useEffect, useState } from 'react'
import { useAsync } from 'react-async-hook'
import { Linking } from 'react-native'
import { deepLinkDeferred, openDeepLink } from 'src/app/actions'
import { pendingDeepLinkSelector } from 'src/app/selectors'
import { hasVisitedHomeSelector } from 'src/home/selectors'
import { useDispatch, useSelector } from 'src/redux/hooks'
import Logger from 'src/utils/Logger'
import { walletAddressSelector } from 'src/web3/selectors'

export const useDeepLinks = () => {
  const [isConsumingInitialLink, setIsConsumingInitialLink] = useState(false)
  const dispatch = useDispatch()

  const pendingDeepLink = useSelector(pendingDeepLinkSelector)
  const address = useSelector(walletAddressSelector)
  // having seen the home screen is a proxy for having finished onboarding. we
  // want to prevent consuming deep links during the onboarding flow in case the
  // deep link includes navigation.
  const hasVisitedHome = useSelector(hasVisitedHomeSelector)

  const shouldConsumeDeepLinks = address && hasVisitedHome

  const handleOpenURL = (event: { url: string }) => {
    Logger.debug(
      'useDeepLinks/handleOpenURL',
      `Handling url: ${event.url}, shouldConsumeDeepLinks: ${shouldConsumeDeepLinks}`
    )
    // defer consuming deep links until the user has completed onboarding
    if (shouldConsumeDeepLinks) {
      dispatch(openDeepLink(event.url, false))
    } else {
      dispatch(deepLinkDeferred(event.url, false))
    }
  }

  useEffect(() => {
    if (pendingDeepLink && shouldConsumeDeepLinks) {
      Logger.debug('useDeepLinks/useEffect', 'Consuming pending deep link', pendingDeepLink.url)
      dispatch(openDeepLink(pendingDeepLink.url, pendingDeepLink.isSecureOrigin))
    }
  }, [pendingDeepLink, address, hasVisitedHome])

  const handleOpenInitialURL = (event: { url: string }) => {
    if (!isConsumingInitialLink) {
      setIsConsumingInitialLink(true)
      handleOpenURL(event)
    }
  }

  useAsync(async () => {
    const initialUrl = await Linking.getInitialURL()
    if (initialUrl) {
      Logger.debug('useDeepLinks/useAsync', 'Linking InitialUrl', initialUrl)
      handleOpenInitialURL({ url: initialUrl })
    }
  }, [])

  useEffect(() => {
    // Handles opening any deep links. This listener is also triggered when the
    // app is closed, so the openDeepLink action could be dispatched multiple
    // times in this case.
    const linkingEventListener = Linking.addEventListener('url', (event) => {
      Logger.debug('useDeepLinks/useEffect', 'Linking url event', event)
      handleOpenURL(event)
    })

    return () => {
      linkingEventListener.remove()
    }
  }, [])
}
