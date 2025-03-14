import React, { useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Dimensions,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Card from 'src/components/Card'
import ClipboardAwarePasteButton from 'src/components/ClipboardAwarePasteButton'
import TextInput, { LINE_HEIGHT } from 'src/components/TextInput'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import { useClipboard } from 'src/utils/useClipboard'

export enum RecoveryPhraseInputStatus {
  Inputting = 'Inputting', // input enabled
  Processing = 'Processing', // code validated, now trying to send it
}

interface Props {
  status: RecoveryPhraseInputStatus
  inputValue: string
  inputPlaceholder: string
  onInputChange: (value: string) => void
  shouldShowClipboard: (value: string) => boolean
}

const AVERAGE_WORD_WIDTH = 80
const AVERAGE_SEED_WIDTH = AVERAGE_WORD_WIDTH * 24
// Estimated number of lines needed to enter the Recovery Phrase
const NUMBER_OF_LINES = Math.ceil(AVERAGE_SEED_WIDTH / Dimensions.get('window').width)

const testID = 'ImportWalletBackupKeyInputField'

export default function RecoveryPhraseInput({
  status,
  inputValue,
  inputPlaceholder,
  onInputChange,
  shouldShowClipboard,
}: Props) {
  const [forceShowingPasteIcon, clipboardContent, getFreshClipboardContent] = useClipboard()
  const { t } = useTranslation()
  // LayoutAnimation when switching to/from input
  useLayoutEffect(() => {
    LayoutAnimation.easeInEaseOut()
  }, [status === RecoveryPhraseInputStatus.Inputting])

  function shouldShowClipboardInternal() {
    if (forceShowingPasteIcon) {
      return true
    }
    return (
      !inputValue.toLowerCase().startsWith(clipboardContent.toLowerCase()) &&
      shouldShowClipboard(clipboardContent)
    )
  }

  const showInput = status === RecoveryPhraseInputStatus.Inputting
  const showStatus = status === RecoveryPhraseInputStatus.Processing
  const showPaste = shouldShowClipboardInternal()
  const keyboardType = Platform.OS === 'android' ? 'visible-password' : undefined

  return (
    <Card rounded={true} shadow={null} style={styles.container}>
      {/* These views cannot be combined as it will cause the shadow to be clipped on iOS */}
      <View style={styles.containRadius}>
        <View
          style={[
            styles.content,
            showInput ? styles.contentActive : styles.contentInactive,
            showInput && showPaste && styles.contentActiveWithPaste,
          ]}
        >
          <View style={styles.innerContent}>
            <Text style={[styles.label, !showInput && styles.labelInactive]}>
              {t('accountKey')}
            </Text>
            {showInput ? (
              <TextInput
                showClearButton={false}
                value={inputValue}
                placeholder={inputPlaceholder}
                placeholderTextColor={colors.inactive}
                onChangeText={onInputChange}
                multiline={true}
                // This disables keyboard suggestions on iOS, but unfortunately NOT on Android
                // Though `InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS` is correctly set on the native input,
                // most Android keyboards ignore it :/
                autoCorrect={false}
                // On Android, the only known hack for now to disable keyboard suggestions
                // is to set the keyboard type to 'visible-password' which sets `InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD`
                // on the native input. Though it doesn't work in all cases (see https://stackoverflow.com/a/33227237/158525)
                // and has the unfortunate drawback of breaking multiline autosize.
                // We use numberOfLines to workaround this last problem.
                keyboardType={keyboardType}
                // numberOfLines is currently Android only on TextInput
                // workaround is to set the minHeight on iOS :/
                numberOfLines={Platform.OS === 'ios' ? undefined : NUMBER_OF_LINES}
                inputStyle={{
                  minHeight:
                    Platform.OS === 'ios' && NUMBER_OF_LINES
                      ? LINE_HEIGHT * NUMBER_OF_LINES
                      : undefined,
                  backgroundColor: colors.textInputBackground,
                }}
                autoCapitalize="none"
                testID={testID}
              />
            ) : (
              <Text style={styles.codeValueLong} numberOfLines={1}>
                {inputValue || ' '}
              </Text>
            )}
          </View>
          {showStatus && (
            <View style={styles.statusContainer}>
              {showStatus && <ActivityIndicator size="small" color={colors.loadingIndicator} />}
            </View>
          )}
        </View>
        {showInput && (
          <ClipboardAwarePasteButton
            getClipboardContent={getFreshClipboardContent}
            shouldShow={showPaste}
            onPress={onInputChange}
          />
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: colors.textInputBackground,
    borderColor: colors.borderSecondary,
    borderRadius: Spacing.Smallest8,
    borderWidth: 1,
  },
  // Applying overflow 'hidden' to `Card` also hides its shadow
  // that's why we're using a separate container
  containRadius: {
    borderRadius: Spacing.Smallest8,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.Regular16,
  },
  contentInactive: {
    paddingVertical: Spacing.Small12,
  },
  contentActive: {
    paddingBottom: Spacing.Tiny4,
  },
  contentActiveWithPaste: {
    borderBottomWidth: 1,
    borderColor: colors.borderSecondary,
  },
  innerContent: {
    flex: 1,
  },
  label: {
    ...typeScale.labelSemiBoldSmall,
  },
  labelInactive: {
    color: colors.contentSecondary,
    opacity: 0.5,
    marginBottom: 4,
  },
  codeValueLong: {
    ...typeScale.bodyMedium,
    color: colors.contentSecondary,
  },
  statusContainer: {
    width: 32,
    marginLeft: 4,
  },
})
