import React, { RefObject } from 'react'
import { WebViewRef } from 'src/components/WebView'

export const createMockWebViewRef = (): RefObject<WebViewRef> => {
  const ref = React.createRef() as RefObject<WebViewRef>
  Object.defineProperty(ref, 'current', {
    writable: true,
    value: { injectJavaScript: jest.fn() },
  })
  return ref
}
