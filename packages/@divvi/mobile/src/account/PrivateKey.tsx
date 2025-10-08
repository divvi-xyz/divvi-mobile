import Clipboard from '@react-native-clipboard/clipboard'
import React, { useState } from 'react'
import { useAsync } from 'react-async-hook'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { PrivateKeyEvents } from 'src/analytics/Events'
import { generateKeysFromMnemonic, getStoredMnemonic } from 'src/backup/utils'
import BackButton from 'src/components/BackButton'
import Button, { BtnSizes } from 'src/components/Button'
import CustomHeader from 'src/components/header/CustomHeader'
import InLineNotification, { NotificationVariant } from 'src/components/InLineNotification'
import CopyIcon from 'src/icons/CopyIcon'
import { getPassword } from 'src/pincode/authentication'
import { useSelector } from 'src/redux/hooks'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import variables from 'src/styles/variables'
import Logger from 'src/utils/Logger'
import { walletAddressSelector } from 'src/web3/selectors'

const TAG = 'PrivateKey'

const PrivateKey = () => {
  const { t } = useTranslation()
  const walletAddress = useSelector(walletAddressSelector)
  const [privateKey, setPrivateKey] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useAsync(
    async () => {
      try {
        if (!walletAddress) {
          Alert.alert(t('error'), t('noAccountFound'))
          return
        }

        // Get the password for the account
        const password = await getPassword(walletAddress)

        // Get the stored mnemonic
        const mnemonic = await getStoredMnemonic(walletAddress, password)
        if (!mnemonic) {
          throw new Error('No mnemonic found in storage')
        }

        // Generate private key from mnemonic
        const { privateKey } = await generateKeysFromMnemonic(mnemonic)
        if (!privateKey) {
          throw new Error('Failed to generate private key from mnemonic')
        }

        setPrivateKey(privateKey)
      } catch (error) {
        Logger.error(TAG, 'Error loading private key', error)
        Alert.alert(t('error'), t('failedToLoadPrivateKey'))
      } finally {
        setIsLoading(false)
      }
    },
    [],
    {
      onError: (error) => {
        Logger.error(TAG, 'Error loading private key', error)
        Alert.alert(t('error'), t('failedToLoadPrivateKey'))
      },
    }
  )

  const copyToClipboard = () => {
    AppAnalytics.track(PrivateKeyEvents.copy_private_key)
    Clipboard.setString(privateKey)
    Logger.showMessage(t('privateKeyCopied'))
  }

  const getDisplayKey = () => {
    if (isLoading) {
      return t('loading') + '...'
    }
    if (!privateKey) {
      return '*'.repeat(64)
    }
    // Show asterisks for most of the key, but display last 4 characters
    const asterisks = '*'.repeat(Math.max(0, privateKey.length - 4))
    const lastFour = privateKey.slice(-4)
    return asterisks + lastFour
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        left={<BackButton />}
        title={
          <Text style={styles.title} testID="PrivateKeyTitle">
            {t('privateKey')}
          </Text>
        }
        style={styles.header}
      />
      <View style={styles.topContent}>
        <Text style={styles.sectionTitle}>{t('yourPrivateKey')}</Text>
        <View style={styles.privateKeyContainer}>
          <Text style={styles.privateKeyText} testID="PrivateKeyText">
            {getDisplayKey()}
          </Text>
        </View>
      </View>
      <View style={styles.bottomContent}>
        <InLineNotification
          variant={NotificationVariant.Warning}
          title={t('keepSafe')}
          description={t('privateKeyWarning')}
          style={styles.warningNotification}
        />
        <Button
          text={t('copyPrivateKey')}
          onPress={copyToClipboard}
          icon={<CopyIcon />}
          iconMargin={12}
          testID="CopyPrivateKeyButton"
          disabled={isLoading || !privateKey}
          size={BtnSizes.FULL}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: variables.contentPadding,
  },
  topContent: {
    padding: variables.contentPadding,
  },
  title: {
    ...typeScale.labelSemiBoldMedium,
  },
  sectionTitle: {
    ...typeScale.labelSemiBoldLarge,
    fontSize: 24,
    marginBottom: Spacing.Smallest8,
    color: colors.contentPrimary,
    textAlign: 'left',
  },
  privateKeyContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: Spacing.Regular16,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  privateKeyText: {
    ...typeScale.bodyMedium,
    textAlign: 'left',
    color: colors.contentSecondary,
    lineHeight: 24,
    fontSize: 16,
  },
  bottomContent: {
    marginTop: 'auto',
    padding: variables.contentPadding,
  },
  warningNotification: {
    marginBottom: Spacing.Regular16,
  },
})

export default PrivateKey
