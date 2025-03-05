[**@divvi/mobile**](../README.md)

---

[@divvi/mobile](../README.md) / useWalletClient

# Function: useWalletClient()

```ts
function useWalletClient(__namedParameters): object
```

Defined in: [packages/@divvi/mobile/src/public/hooks/useWalletClient.ts:8](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/hooks/useWalletClient.ts#L8)

## Parameters

### \_\_namedParameters

#### networkId

[`NetworkId`](../type-aliases/NetworkId.md)

## Returns

`object`

### data

```ts
data:
  | undefined
  | {
  unlockAccount: (passphrase, duration) => Promise<boolean>;
 } = asyncCallback.result;
```

### error

```ts
error: undefined | Error = asyncCallback.error;
```

### refresh()

```ts
refresh: (...args) =>
  (Promise<{
    unlockAccount: (passphrase, duration) => Promise<boolean>
  }> = asyncCallback.execute)
```

#### Parameters

##### args

...\[\{
`networkId`: [`NetworkId`](../type-aliases/NetworkId.md);
\}\]

#### Returns

`Promise`\<\{
`unlockAccount`: (`passphrase`, `duration`) => `Promise`\<`boolean`\>;
\}\>

### reset()

```ts
reset: () => void = asyncCallback.reset;
```

#### Returns

`void`

### status

```ts
status: AsyncStatus
```
