import { CameraView, useCameraPermissions } from 'expo-camera'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dimensions,
  Keyboard,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Defs, Mask, Rect, Svg } from 'react-native-svg'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import Modal from 'src/components/Modal'
import TextButton from 'src/components/TextButton'
import { QrCode } from 'src/send/types'
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import variables from 'src/styles/variables'

interface QRScannerProps {
  onQRCodeDetected: (qrCode: QrCode) => void
}

const SeeThroughOverlay = () => {
  const { width, height } = Dimensions.get('screen')
  const margin = 40
  const centerBoxSize = width - margin * 2
  const centerBoxBorderRadius = 8

  // TODO(jeanregisser): Investigate why the mask is pixelated on iOS.
  // It's visible on the rounded corners but since they are small, I'm ignoring it for now.

  // Node that the Mask component is using hard coded color values solely to
  // create the "cutout" effect.
  return (
    <View style={{ width, height }}>
      <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <Mask id="mask" x="0" y="0" height="100%" width="100%">
            <Rect height="100%" width="100%" fill="#FFFFFF" />
            <Rect
              x={margin}
              y={(height - centerBoxSize) / 2}
              rx={centerBoxBorderRadius}
              ry={centerBoxBorderRadius}
              width={centerBoxSize}
              height={centerBoxSize}
              fill="#000000"
            />
          </Mask>
        </Defs>
        <Rect height="100%" width="100%" fill={`${colors.backgroundScrim}80`} mask="url(#mask)" />
      </Svg>
    </View>
  )
}

const PermissionDeniedView = () => {
  const { t } = useTranslation()
  const openSettings = () => {
    void Linking.openSettings()
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.permissionContainer]}>
      <View style={styles.permissionsDeniedView}>
        <Text style={styles.permissionText} testID="CameraPermissionDeniedText">
          {t('cameraNotAuthorizedDescription')}
        </Text>
      </View>
      <View style={styles.iosButtonWrapper}>
        <Button
          testID="OpenSettingsButton"
          text={t('cameraSettings')}
          onPress={openSettings}
          size={BtnSizes.FULL}
          type={BtnTypes.SECONDARY}
        />
      </View>
    </View>
  )
}

export default function QRScanner({ onQRCodeDetected }: QRScannerProps) {
  const { t } = useTranslation()
  const inset = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const isEmulator = DeviceInfo.useIsEmulator ? DeviceInfo.useIsEmulator().result : false

  /**
   * Emulator only. When in the emulator we want to be able
   * to enter QR codes manually.
   */
  const [value, setValue] = useState('')
  const [displayEntryModal, setDisplayEntryModal] = useState(false)

  useEffect(() => {
    if (!permission || !permission.granted) {
      void requestPermission()
    }
  }, [permission])

  if (!permission || !permission.granted) {
    return <PermissionDeniedView />
  }

  const openModal = () => setDisplayEntryModal(true)
  const closeModal = () => {
    setDisplayEntryModal(false)
    setValue('')
  }

  const submitModal = () => {
    Keyboard.dismiss()
    closeModal()
    // add a delay to allow modal to close before calling onQRCodeDetected,
    // otherwise nothing is clickable in the next screen this navigates to. A
    // better solution is to use onModalHide prop of Modal, but this is an
    // emulator only feature, so this is good enough.
    setTimeout(() => {
      onQRCodeDetected({ type: '', data: value })
    }, 500)
  }

  const onModalTextChange = (text: string) => {
    setValue(text)
  }

  const cameraScanInfo = (
    <Text testID="CameraScanInfo" style={[styles.infoText, { marginBottom: inset.bottom }]}>
      {t('cameraScanInfo')}
    </Text>
  )

  return (
    <View>
      <CameraView
        onBarcodeScanned={onQRCodeDetected}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        mute={true} // Needs to be set otherwise microphone permission is requested
        responsiveOrientationWhenOrientationLocked
        testID="Camera"
      />
      <SeeThroughOverlay />

      <View>
        {isEmulator ? (
          <TouchableOpacity testID="ManualInputButton" onPress={openModal}>
            {cameraScanInfo}
          </TouchableOpacity>
        ) : (
          cameraScanInfo
        )}
      </View>

      <Modal isVisible={displayEntryModal}>
        <Text style={styles.manualTitle}>{t('enterQRCode')}</Text>
        <TextInput
          autoFocus={true}
          value={value}
          style={styles.manualInput}
          autoCapitalize="none"
          onChangeText={onModalTextChange}
          testID="ManualInput"
        />
        <View style={styles.actions}>
          <TextButton style={styles.cancelButton} onPress={closeModal}>
            {t('cancel')}
          </TextButton>
          <TextButton onPress={submitModal} testID="ManualSubmit">
            {t('submit')}
          </TextButton>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  infoText: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 32,
    ...typeScale.labelSemiBoldSmall,
    lineHeight: undefined,
    color: colors.qrTabBarSecondary,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  manualInput: {
    ...typeScale.bodyMedium,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginTop: 8,
    alignItems: 'flex-start',
    borderColor: colors.contentSecondary,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 80,
    maxHeight: 150,
  },
  manualTitle: {
    marginBottom: 6,
    ...typeScale.titleSmall,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    maxWidth: '100%',
    flexWrap: 'wrap',
  },
  cancelButton: {
    color: colors.contentSecondary,
  },
  permissionContainer: {
    flex: 1,
    padding: variables.contentPadding,
    backgroundColor: colors.backgroundScrim,
  },
  permissionsDeniedView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  permissionText: {
    ...typeScale.bodyMedium,
    color: colors.contentTertiary,
    textAlign: 'center',
  },
  // iOS specific styles otherwise button is pinned to bottom of screen
  iosButtonWrapper: Platform.select({
    ios: {
      marginBottom: Spacing.Large32,
    },
    default: {},
  }),
})
