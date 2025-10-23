import { usePrivy } from '@privy-io/expo';
import { useLogin } from '@privy-io/expo/ui';
import React from 'react';
import Button, { BtnSizes, BtnTypes } from 'src/components/Button';
import { PRIVY_ENABLED } from 'src/config';
import { navigate } from 'src/navigator/NavigationService';
import { Screens } from 'src/navigator/Screens';
import { Spacing } from 'src/styles/styles';

function PrivyLoginButtonInner() {
  const { isReady, user } = usePrivy();
  const { login } = useLogin();

  const handlePress = async () => {
    if (user) {
      // User is already logged in, just navigate
      navigate(Screens.DemoPrivy);
    } else {
      // User is not logged in, login first then navigate
      await login({ loginMethods: ['email'] });
      navigate(Screens.DemoPrivy);
    }
  };

  return (
    <Button
      onPress={handlePress}
      text={user ? 'Go to Privy Demo' : 'Login with Privy'}
      size={BtnSizes.FULL}
      type={BtnTypes.PRIMARY}
      testID={'CreateAccountButton'}
      disabled={!isReady}
      style={{ marginBottom: Spacing.Smallest8 }}
    />
  )
}

export default function PrivyLoginButton() {
  // If Privy is not enabled, don't render anything
  if (!PRIVY_ENABLED) {
    return null;
  }

  return <PrivyLoginButtonInner />;
}