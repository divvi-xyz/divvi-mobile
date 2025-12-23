import { NativeStackScreenProps, StackParamList } from 'wallet-stack'

type RootStackParamList = StackParamList & {
  Playground: undefined
  CustomScreen: {
    someParam: string
  }
}

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>

// This allows type-safe navigation to known and custom screens using the `navigate` function from `wallet-stack`
declare global {
  namespace DivviNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
