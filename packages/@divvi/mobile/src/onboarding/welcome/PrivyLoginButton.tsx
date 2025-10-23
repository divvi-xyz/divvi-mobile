import { usePrivy } from '@privy-io/expo';
import { useLogin } from '@privy-io/expo/ui';
import React, { useEffect } from 'react';
import Button, { BtnSizes, BtnTypes } from 'src/components/Button';
import { navigate } from 'src/navigator/NavigationService';
import { Screens } from 'src/navigator/Screens';


export default function PrivyLoginButton() {
  const { isReady, user } = usePrivy();
  const { login } = useLogin();

  // Navigate to DemoPrivy when user successfully logs in
  useEffect(() => {
    if (user) {
      navigate(Screens.DemoPrivy);
    }
  }, [user]);

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