import { usePrivy } from '@privy-io/expo';
import { useLogin } from '@privy-io/expo/ui';
import React from 'react';
import Button, { BtnSizes, BtnTypes } from 'src/components/Button';


export default function PrivyLoginButton() {
  const { isReady } = usePrivy();
  const { login } = useLogin();

  return (
    <Button
    onPress={() => login({ loginMethods: ['email'], })}
    text={'login with privy'}
            size={BtnSizes.FULL}
            type={BtnTypes.PRIMARY}
            testID={'CreateAccountButton'}
            disabled={!isReady}
          />
  )
}