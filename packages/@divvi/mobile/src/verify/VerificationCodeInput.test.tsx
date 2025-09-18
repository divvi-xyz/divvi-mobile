import Clipboard from '@react-native-clipboard/clipboard'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { PhoneNumberVerificationStatus } from 'src/verify/hooks'
import VerificationCodeInputWrapper from 'src/verify/VerificationCodeInput'

jest.mock('@react-native-clipboard/clipboard')
jest.mock('src/utils/IosVersionUtils')

describe('VerificationCodeInputWrapper', () => {
  const mockOnSuccess = jest.fn()
  const mockOnResendSms = jest.fn()
  const mockSetSmsCode = jest.fn()
  const mockPhoneNumber = '+15555555555'

  const renderComponent = (
    verificationStatus = PhoneNumberVerificationStatus.NONE,
    showResend = true
  ) =>
    render(
      <VerificationCodeInputWrapper
        phoneNumber={mockPhoneNumber}
        verificationStatus={verificationStatus}
        onSuccess={mockOnSuccess}
        onResendSms={showResend ? mockOnResendSms : undefined}
        setSmsCode={mockSetSmsCode}
      />
    )

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Clipboard.getString).mockResolvedValue('')
    jest.mocked(Clipboard.hasString).mockResolvedValue(false)
  })

  it('displays the correct components', () => {
    const { getByText, getByTestId } = renderComponent()

    expect(
      getByText(`phoneVerificationInput.description, {"phoneNumber":"${mockPhoneNumber}"}`)
    ).toBeTruthy()
    expect(getByTestId('PhoneVerificationResendSmsBtn')).toBeDisabled()
  })

  it('hides resend button if onResendSms is not set', () => {
    const { getByText, queryByTestId } = renderComponent(PhoneNumberVerificationStatus.NONE, false)

    expect(
      getByText(`phoneVerificationInput.description, {"phoneNumber":"${mockPhoneNumber}"}`)
    ).toBeTruthy()
    expect(queryByTestId('PhoneVerificationResendSmsBtn')).toBeFalsy()
  })

  it('invokes setSmsCode if code is set', async () => {
    const { getByText, getByTestId } = renderComponent()

    expect(
      getByText(`phoneVerificationInput.description, {"phoneNumber":"${mockPhoneNumber}"}`)
    ).toBeTruthy()
    await act(() => {
      fireEvent.changeText(getByTestId('PhoneVerificationCode'), '123456')
    })
    expect(mockSetSmsCode).toHaveBeenCalledWith('123456')
  })

  it('displays tick mark and invokes onSuccess if verification status is success', () => {
    const { getByText, getByTestId } = renderComponent(PhoneNumberVerificationStatus.SUCCESSFUL)

    expect(
      getByText(`phoneVerificationInput.description, {"phoneNumber":"${mockPhoneNumber}"}`)
    ).toBeTruthy()
    expect(getByTestId('PhoneVerificationCode/CheckIcon')).toBeTruthy()
    jest.runOnlyPendingTimers()
    expect(mockOnSuccess).toHaveBeenCalledWith()
  })

  it('displays error icon verification status is failed', () => {
    const { getByText, getByTestId } = renderComponent(PhoneNumberVerificationStatus.FAILED)

    expect(
      getByText(`phoneVerificationInput.description, {"phoneNumber":"${mockPhoneNumber}"}`)
    ).toBeTruthy()
    expect(getByTestId('PhoneVerificationCode/ErrorIcon')).toBeTruthy()
  })

  it.todo('reads SMS code on Android automatically')
})
