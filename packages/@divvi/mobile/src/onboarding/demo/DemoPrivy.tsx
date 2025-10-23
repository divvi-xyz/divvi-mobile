import { usePrivy } from '@privy-io/expo'
import { useSmartWallets } from '@privy-io/expo/smart-wallets'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import Logger from 'src/utils/Logger'
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  type Hex,
  http
} from 'viem'
import { base } from 'viem/chains'

// USDC contract address on Base mainnet
const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'

export default function DemoPrivy() {
  const { isReady, user, logout } = usePrivy()
  const { client: smartWalletClient } = useSmartWallets()

  const [usdcBalance, setUsdcBalance] = useState<string>('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [recipientAddress, setRecipientAddress] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Get the smart wallet from linked accounts
  const smartWallet = user?.linked_accounts?.find((account) => account.type === 'smart_wallet')
  console.log('smartWallet', smartWallet)

  // Handle unauthenticated state - redirect to login
  useEffect(() => {
    if (isReady && !user) {
      // User is not authenticated, redirect to login
      navigate(Screens.Welcome)
    }
  }, [isReady, user])

  // Check if user has an active session (user exists = authenticated)
  const hasActiveSession = Boolean(user && smartWallet && smartWalletClient)

  // Fetch USDC balance using public client
  useEffect(() => {
    const fetchBalance = async () => {
      if (!hasActiveSession || !smartWallet?.address) {
        setUsdcBalance('0')
        return
      }

      setIsLoadingBalance(true)
      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const balance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [smartWallet.address as `0x${string}`],
        })

        // USDC has 6 decimals
        setUsdcBalance(formatUnits(balance, 6))
      } catch (error) {
        Logger.error('DemoPrivy', 'Error fetching USDC balance', error)
        setUsdcBalance('0')
      } finally {
        setIsLoadingBalance(false)
      }
    }

    void fetchBalance()
  }, [hasActiveSession, smartWallet?.address])

  const handleSendUSDC = async () => {
    if (!hasActiveSession || !smartWalletClient) {
      Alert.alert('Error', 'No active session. Please log in again.')
      navigate(Screens.Welcome)
      return
    }

    if (!smartWallet || !recipientAddress || !sendAmount) {
      Alert.alert('Error', 'Please enter recipient address and amount')
      return
    }

    // Validate recipient address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      Alert.alert('Error', 'Invalid recipient address')
      return
    }

    // Validate amount
    const amount = parseFloat(sendAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Invalid amount')
      return
    }

    if (amount > parseFloat(usdcBalance)) {
      Alert.alert('Error', 'Insufficient balance')
      return
    }

    setIsSending(true)
    try {
      // Encode the transaction data
      const amountToSend = parseFloat(sendAmount)
      const decimals = 6 // USDC has 6 decimals

      const encodedData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress as Hex, BigInt(amountToSend * 10 ** decimals)],
      })

      Logger.debug('DemoPrivy', 'Encoded data:', encodedData)

      // Send the transaction using smart wallet
      const txHash = await smartWalletClient.sendTransaction({
        account: smartWalletClient.account,
        chain: base,
        to: USDC_ADDRESS,
        data: encodedData,
      })

      Logger.debug('DemoPrivy', 'Transaction hash:', txHash)

      Alert.alert(
        'Success',
        `Transaction sent!\nHash: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh balance after send
              setRecipientAddress('')
              setSendAmount('')
              // Trigger balance refresh
              if (smartWallet?.address) {
                setIsLoadingBalance(true)
                setTimeout(() => fetchBalance(), 2000)
              }
            },
          },
        ]
      )
    } catch (error: any) {
      Logger.error('DemoPrivy', 'Error sending USDC', error)
      Alert.alert('Error', error.message || 'Failed to send transaction')
    } finally {
      setIsSending(false)
    }
  }

  const fetchBalance = async () => {
    if (!smartWallet?.address) return

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [smartWallet.address as `0x${string}`],
      })

      setUsdcBalance(formatUnits(balance, 6))
    } catch (error) {
      Logger.error('DemoPrivy', 'Error fetching USDC balance (refresh)', error)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  // Do nothing while the PrivyProvider initializes with updated user state
  if (!isReady) {
    return null
  }

  // Show loading state while waiting for smart wallet to initialize
  if (isReady && user && !smartWallet) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.loadingIndicator} />
        <Text style={styles.loadingText}>Initializing smart wallet...</Text>
      </View>
    )
  }

  // If user is not authenticated, show a temporary state (will redirect via useEffect)
  if (isReady && !user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.loadingIndicator} />
        <Text style={styles.loadingText}>Redirecting to login...</Text>
      </View>
    )
  }

  // At this point, we know user and smartWallet are not null due to hasActiveSession check
  const activeUser = user!
  const activeWallet = smartWallet!

  return (
    <ScrollView style={styles.container} testID="DemoPrivy">
      {/* User Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privy Account</Text>
        <View style={styles.infoCard}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{activeUser.id || 'N/A'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Smart Wallet Address:</Text>
          <Text style={styles.addressValue}>{activeWallet.address}</Text>
          <Text style={styles.helperText}>Chain: Base (8453)</Text>
        </View>

        {activeUser.linked_accounts && activeUser.linked_accounts.length > 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.label}>Linked Accounts:</Text>
            <Text style={styles.value}>{activeUser.linked_accounts.length} account(s)</Text>
            {activeUser.linked_accounts.map((account, index) => (
              <Text key={index} style={styles.label}>
                • {account.type}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {/* Balance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Base USDC Balance</Text>
        {isLoadingBalance ? (
          <View style={styles.infoCard}>
            <ActivityIndicator size="small" color={colors.loadingIndicator} />
            <Text style={styles.helperText}>Loading balance...</Text>
          </View>
        ) : (
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <Text style={styles.tokenSymbol}>USDC</Text>
              <Text style={styles.tokenBalance}>{parseFloat(usdcBalance).toFixed(2)}</Text>
            </View>
            <Text style={styles.tokenName}>USD Coin</Text>
            <Text style={styles.tokenAddress}>
              {USDC_ADDRESS.slice(0, 6)}...{USDC_ADDRESS.slice(-4)}
            </Text>
          </View>
        )}
      </View>

      {/* Send Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Send USDC on Base</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            placeholder="0x..."
            placeholderTextColor={colors.contentSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            testID="DemoPrivy/RecipientInput"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Amount (USDC)</Text>
          <TextInput
            style={styles.input}
            value={sendAmount}
            onChangeText={setSendAmount}
            placeholder="0.00"
            placeholderTextColor={colors.contentSecondary}
            keyboardType="decimal-pad"
            testID="DemoPrivy/AmountInput"
          />
          <Text style={styles.helperText}>
            Available: {parseFloat(usdcBalance).toFixed(2)} USDC
          </Text>
        </View>

        <Button
          text={isSending ? 'Sending...' : 'Send USDC'}
          onPress={handleSendUSDC}
          size={BtnSizes.FULL}
          type={BtnTypes.PRIMARY}
          disabled={
            isSending ||
            !recipientAddress ||
            !sendAmount ||
            parseFloat(usdcBalance) === 0 ||
            !smartWallet ||
            !smartWalletClient
          }
          style={styles.sendButton}
          testID="DemoPrivy/SendButton"
        />
      </View>

      {/* View All Tokens Button */}
      <View style={styles.section}>
        <Button
          text="View All Tokens"
          onPress={() => navigate(Screens.TabWallet)}
          size={BtnSizes.FULL}
          type={BtnTypes.SECONDARY}
          testID="DemoPrivy/ViewAllTokens"
        />
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <Button
          text="Logout"
          onPress={async () => {
            try {
              await logout()
              navigate(Screens.Welcome)
            } catch (error) {
              Logger.error('DemoPrivy', 'Error logging out', error)
              Alert.alert('Error', 'Failed to logout')
            }
          }}
          size={BtnSizes.FULL}
          type={BtnTypes.SECONDARY}
          testID="DemoPrivy/LogoutButton"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    padding: Spacing.Regular16,
  },
  section: {
    marginBottom: Spacing.Thick24,
  },
  sectionTitle: {
    ...typeScale.labelLarge,
    marginBottom: Spacing.Smallest8,
    color: colors.contentPrimary,
  },
  infoCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: Spacing.Regular16,
    borderRadius: 8,
    marginBottom: Spacing.Smallest8,
  },
  label: {
    ...typeScale.labelSmall,
    color: colors.contentSecondary,
    marginBottom: 4,
  },
  value: {
    ...typeScale.bodyMedium,
    color: colors.contentPrimary,
  },
  addressValue: {
    ...typeScale.labelSmall,
    color: colors.contentPrimary,
    fontFamily: 'Courier',
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: colors.buttonPrimaryBackground as string,
    padding: Spacing.Regular16,
    borderRadius: 12,
    marginBottom: Spacing.Smallest8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.Smallest8,
  },
  tokenSymbol: {
    ...typeScale.labelLarge,
    color: colors.contentTertiary,
  },
  tokenBalance: {
    ...typeScale.titleLarge,
    color: colors.contentTertiary,
  },
  tokenName: {
    ...typeScale.labelSmall,
    color: colors.contentTertiary,
    opacity: 0.8,
  },
  tokenAddress: {
    ...typeScale.labelSmall,
    color: colors.contentTertiary,
    opacity: 0.6,
    marginTop: 4,
  },
  helperText: {
    ...typeScale.labelSmall,
    color: colors.contentSecondary,
    marginTop: Spacing.Smallest8,
  },
  inputContainer: {
    marginBottom: Spacing.Regular16,
  },
  inputLabel: {
    ...typeScale.labelMedium,
    marginBottom: Spacing.Smallest8,
    color: colors.contentPrimary,
  },
  input: {
    ...typeScale.bodyMedium,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 8,
    padding: Spacing.Regular16,
    backgroundColor: colors.backgroundPrimary,
    color: colors.contentPrimary,
  },
  sendButton: {
    marginBottom: Spacing.Smallest8,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.contentSecondary,
    marginTop: Spacing.Regular16,
    textAlign: 'center',
  },
})
