import * as React from 'react'
import Svg, { Path } from 'react-native-svg'
import { getAppConfig } from 'src/appConfig'

export default function WelcomeLogo() {
  const CustomWelcomeLogo = getAppConfig().themes?.default?.assets?.welcomeLogo
  if (CustomWelcomeLogo) {
    return <CustomWelcomeLogo />
  }

  return (
    <Svg width={168} height={58} viewBox={`0 0 168 58`} fill="none">
      <Path
        fill="#000"
        d="m30.447 1.167 8.835 3.723V57h-7.331l-1.805-3.685a11.426 11.426 0 0 1-2.143 1.993c-.777.526-1.617.965-2.52 1.316-.876.351-1.816.602-2.819.752-1.003.15-2.055.226-3.158.226-2.757 0-5.301-.502-7.633-1.504-2.33-1.003-4.348-2.382-6.053-4.136-1.68-1.78-3.008-3.86-3.985-6.241C.882 43.34.406 40.783.406 38.051c0-2.757.476-5.327 1.429-7.708.978-2.381 2.306-4.449 3.985-6.203 1.68-1.755 3.685-3.133 6.016-4.136 2.356-1.003 4.913-1.504 7.67-1.504 1.078 0 2.118.088 3.12.263 1.003.151 1.968.389 2.895.715.928.325 1.805.751 2.632 1.278a11.78 11.78 0 0 1 2.294 1.917V1.167Zm.075 36.846c0-1.754-.263-3.321-.79-4.7-.5-1.378-1.228-2.544-2.18-3.496-.928-.953-2.043-1.679-3.346-2.181-1.304-.501-2.758-.752-4.362-.752-1.579 0-3.033.289-4.361.865a9.572 9.572 0 0 0-3.346 2.331c-.928 1.003-1.655 2.181-2.18 3.534-.527 1.354-.79 2.82-.79 4.399 0 1.604.263 3.096.79 4.474.525 1.379 1.252 2.569 2.18 3.572.927.978 2.043 1.755 3.346 2.331 1.328.552 2.782.827 4.361.827 1.604 0 3.058-.238 4.362-.714 1.303-.501 2.418-1.228 3.346-2.181.952-.977 1.68-2.155 2.18-3.534.527-1.404.79-2.995.79-4.775Zm20.227-18.648h8.836V57h-8.836V19.365ZM49.773 5.98c0-.752.138-1.466.413-2.143a6.18 6.18 0 0 1 1.166-1.767A4.994 4.994 0 0 1 53.043.904a4.975 4.975 0 0 1 2.105-.451 5.23 5.23 0 0 1 2.143.451A5.305 5.305 0 0 1 59.06 2.07a5.29 5.29 0 0 1 1.165 1.767c.276.677.414 1.391.414 2.143 0 .752-.138 1.466-.414 2.143A5.29 5.29 0 0 1 59.06 9.89c-.502.501-1.09.89-1.767 1.166a5.639 5.639 0 0 1-2.144.413 5.36 5.36 0 0 1-2.105-.413 4.994 4.994 0 0 1-1.692-1.166 6.18 6.18 0 0 1-1.166-1.767 5.626 5.626 0 0 1-.413-2.143ZM83.159 57l-16.43-37.635h9.436l10.152 24.777 10.678-24.777h9.437L89.325 57h-6.166Zm41.056 0-16.43-37.635h9.437l10.152 24.777 10.677-24.777h9.437L130.381 57h-6.166Zm29.778-37.635h8.835V57h-8.835V19.365Zm-.978-13.385c0-.752.138-1.466.414-2.143.3-.677.689-1.266 1.165-1.767a4.99 4.99 0 0 1 1.692-1.166 4.978 4.978 0 0 1 2.106-.451c.752 0 1.466.151 2.143.451a5.32 5.32 0 0 1 1.767 1.166c.501.501.89 1.09 1.165 1.767a5.62 5.62 0 0 1 .414 2.143 5.62 5.62 0 0 1-.414 2.143 5.282 5.282 0 0 1-1.165 1.767 5.32 5.32 0 0 1-1.767 1.166 5.639 5.639 0 0 1-2.143.413 5.363 5.363 0 0 1-2.106-.413 4.99 4.99 0 0 1-1.692-1.166 6.168 6.168 0 0 1-1.165-1.767 5.62 5.62 0 0 1-.414-2.143Z"
      />
    </Svg>
  )
}
