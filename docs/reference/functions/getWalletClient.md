[**wallet-stack**](../README.md)

---

[wallet-stack](../README.md) / getWalletClient

# Function: getWalletClient()

```ts
function getWalletClient(__namedParameters): Promise<{
  unlockAccount: (passphrase, duration) => Promise<boolean>
}>
```

Defined in: packages/wallet-stack/src/public/getWalletClient.ts:12

## Parameters

### \_\_namedParameters

#### networkId

[`NetworkId`](../type-aliases/NetworkId.md)

## Returns

`Promise`\<\{
`unlockAccount`: (`passphrase`, `duration`) => `Promise`\<`boolean`\>;
\}\>

Viem [`WalletClient`](https://viem.sh/docs/clients/wallet.html) for the given networkId.
