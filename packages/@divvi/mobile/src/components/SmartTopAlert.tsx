import React, { useEffect, useRef, useState } from 'react'
import { Animated, FlexStyle, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AlertTypes } from 'src/alert/actions'
import SmallButton from 'src/components/SmallButton'
import Error from 'src/icons/Error'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { vibrateError, vibrateInformative } from 'src/styles/hapticFeedback'
interface Props {
  alert: {
    type: AlertTypes
    title?: string | null
    message: string
    dismissAfter?: number | null
    buttonMessage?: string | null
    onPress: () => void
  } | null
}

// This component needs to be always mounted for the hide animation to be visible
function SmartTopAlert({ alert }: Props) {
  const [visibleAlertState, setVisibleAlertState] = useState(alert)
  const insets = useSafeAreaInsets()
  const yOffset = useRef(new Animated.Value(-500))
  const containerRef = useRef<View>(null)

  function hide() {
    if (!containerRef.current) {
      return
    }

    containerRef.current.measure((l, t, w, height) => {
      Animated.timing(yOffset.current, {
        toValue: -height,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setVisibleAlertState(null)
        }
      })
    })
  }

  useEffect(() => {
    if (alert) {
      // show
      setVisibleAlertState(alert)
      if (type === AlertTypes.ERROR) {
        vibrateError()
      } else {
        vibrateInformative()
      }
    } else {
      // hide
      hide()
    }
  }, [alert])

  useEffect(() => {
    let timeoutHandle: number

    if (!visibleAlertState) {
      return
    }

    const rafHandle: number = requestAnimationFrame(() => {
      if (!containerRef.current) {
        return
      }

      containerRef.current.measure((l, t, w, height) => {
        Animated.timing(yOffset.current, {
          // @ts-ignore, react-native type defs are missing this one!
          fromValue: -height,
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start()

        if (visibleAlertState.dismissAfter) {
          timeoutHandle = window.setTimeout(hide, visibleAlertState.dismissAfter)
        }
      })
    })

    return () => {
      if (rafHandle) {
        cancelAnimationFrame(rafHandle)
      }
      if (timeoutHandle) {
        window.clearTimeout(timeoutHandle)
      }
    }
  }, [visibleAlertState])

  if (!visibleAlertState || visibleAlertState.type === AlertTypes.TOAST) {
    return null
  }

  const { type, title, message, buttonMessage, onPress } = visibleAlertState
  const isError = type === AlertTypes.ERROR

  const testID = isError ? 'errorBanner' : 'infoBanner'

  return (
    <View style={styles.overflowContainer} testID={testID}>
      <TouchableWithoutFeedback onPress={onPress} testID="SmartTopAlertTouchable">
        <Animated.View
          ref={containerRef}
          style={[
            styles.container,
            (buttonMessage && styles.containerWithButton) as FlexStyle,
            isError && styles.containerError,
            {
              // TODO(jeanregisser): Handle case where SmartTopAlert are stacked and only the first one would need the inset
              paddingTop: insets.top + PADDING_VERTICAL,
              transform: [{ translateY: yOffset.current }],
            },
          ]}
        >
          {isError && <Error color={colors.contentTertiary} style={styles.errorIcon} />}
          <Text style={[typeScale.bodySmall, isError && typeScale.labelSmall, styles.text]}>
            {!!title && <Text style={[typeScale.labelSmall, styles.text]}> {title} </Text>}
            {message}
          </Text>
          {!!buttonMessage && (
            <SmallButton
              onPress={onPress}
              text={buttonMessage}
              style={styles.button}
              textStyle={styles.buttonText}
              testID={'SmartTopAlertButton'}
            />
          )}
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  )
}

const PADDING_VERTICAL = 10

const styles = StyleSheet.create({
  overflowContainer: {
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.warningPrimary,
    paddingBottom: PADDING_VERTICAL,
    paddingHorizontal: 25,
  },
  containerError: {
    backgroundColor: colors.errorPrimary,
  },
  containerWithButton: {
    flexDirection: 'column',
  },
  text: {
    color: colors.contentTertiary,
    // Unset explicit lineHeight set by fonts.tsx otherwise the text is not centered vertically
    lineHeight: undefined,
    textAlign: 'center',
  },
  errorIcon: {
    marginLeft: 5,
    marginRight: 8,
  },
  button: {
    marginTop: 8,
    borderColor: colors.contentTertiary,
    alignSelf: 'center',
  },
  buttonText: {
    color: colors.contentTertiary,
  },
})

export default SmartTopAlert
