import React from 'react'
import { Image as RNImage } from 'react-native'

// Mock the expo-image Image component with React Native's Image
export const Image = React.forwardRef((props, ref) => {
  // Convert expo-image props to React Native Image props
  const { contentFit, source, onLoad, onError, ...otherProps } = props

  return (
    <RNImage
      {...otherProps}
      ref={ref}
      source={source}
      resizeMode={contentFit === 'contain' ? 'contain' : 'cover'}
      onLoad={onLoad}
      onError={onError}
    />
  )
})

// Mock other expo-image exports
export const ImageBackground = React.forwardRef((props, ref) => {
  const { ImageBackground: RNImageBackground } = require('react-native')
  return <RNImageBackground {...props} ref={ref} />
})

export default {
  Image,
  ImageBackground,
}
