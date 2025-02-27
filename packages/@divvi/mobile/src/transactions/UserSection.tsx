import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutAnimation, StyleSheet, Text, View } from 'react-native'
import AccountNumber from 'src/components/AccountNumber'
import Expandable from 'src/components/Expandable'
import Touchable from 'src/components/Touchable'
import { Screens } from 'src/navigator/Screens'
import { getDisplayName, Recipient, recipientHasNumber } from 'src/recipients/recipient'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { getDisplayNumberInternational } from 'src/utils/phoneNumbers'

interface Props {
  type: 'sent' | 'received' | 'withdrawn'
  addressHasChanged?: boolean
  recipient: Recipient
  avatar: React.ReactNode
  expandable?: boolean
  testID?: string
}

export default function UserSection({
  type,
  addressHasChanged = false,
  recipient,
  avatar,
  expandable = true,
  testID = '',
}: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(expandable && addressHasChanged)

  const toggleExpanded = () => {
    LayoutAnimation.easeInEaseOut()
    setExpanded(!expanded)
  }

  const displayName = getDisplayName(recipient, t)
  const displayNumber = recipientHasNumber(recipient)
    ? getDisplayNumberInternational(recipient.e164PhoneNumber)
    : undefined
  const address = recipient.address || ''

  const sectionLabel = {
    received: t('receivedFrom'),
    sent: t('sentTo'),
    withdrawn: t('withdrawnTo'),
  }[type]

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.userContainer}>
          <Text style={styles.sectionLabel}>{sectionLabel}</Text>
          <Touchable onPress={toggleExpanded} disabled={!expandable}>
            <>
              <Expandable isExpandable={expandable && !displayNumber} isExpanded={expanded}>
                <Text style={styles.username} testID={`${testID}/name`}>
                  {displayName}
                </Text>
              </Expandable>
              {!!displayNumber && (
                <Expandable isExpandable={expandable && !!displayNumber} isExpanded={expanded}>
                  <Text style={styles.phoneNumber} testID={`${testID}/number`}>
                    {displayNumber}
                  </Text>
                </Expandable>
              )}
            </>
          </Touchable>
        </View>
        <View style={styles.avatarContainer}>{avatar}</View>
      </View>
      {expanded && (
        <View style={styles.expandedContainer}>
          {addressHasChanged && (
            <Text style={styles.addressHasChanged} testID={'transferAddressChanged'}>
              {t('transferAddressChanged')}
            </Text>
          )}
          <View style={styles.accountBox}>
            <Text style={styles.accountLabel}>{t('accountAddressLabel')}</Text>
            <AccountNumber address={address} location={Screens.TransactionDetailsScreen} />
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
  },
  sectionLabel: {
    ...typeScale.labelSemiBoldSmall,
    color: colors.contentSecondary,
    marginBottom: 4,
  },
  userContainer: {
    flex: 3,
    marginRight: 8,
  },
  username: {
    ...typeScale.bodyMedium,
  },
  phoneNumber: {
    ...typeScale.bodySmall,
    color: colors.contentSecondary,
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  expandedContainer: {
    marginTop: 8,
  },
  addressHasChanged: {
    ...typeScale.bodySmall,
    color: colors.contentSecondary,
    marginBottom: 8,
  },
  accountBox: {
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
    flexDirection: 'column',
    padding: 16,
  },
  accountLabel: {
    ...typeScale.labelSemiBoldSmall,
    color: colors.contentSecondary,
  },
})
