[**@divvi/mobile**](../README.md)

---

[@divvi/mobile](../README.md) / usePrepareTransactions

# Function: usePrepareTransactions()

```ts
function usePrepareTransactions(): object
```

Defined in: [packages/@divvi/mobile/src/public/hooks/usePrepareTransactions.ts:5](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/hooks/usePrepareTransactions.ts#L5)

## Returns

`object`

### data

```ts
data:
  | undefined
  | PreparedTransactionsResult = asyncCallback.result;
```

### error

```ts
error: undefined | Error = asyncCallback.error;
```

### prepareTransactions()

```ts
prepareTransactions: (...args) => (Promise<PreparedTransactionsResult> = asyncCallback.execute)
```

#### Parameters

##### args

...\[\{
`networkId`: [`NetworkId`](../type-aliases/NetworkId.md);
`transactionRequests`: [`TransactionRequest`](../type-aliases/TransactionRequest.md)[];
\}\]

#### Returns

`Promise`\<[`PreparedTransactionsResult`](../type-aliases/PreparedTransactionsResult.md)\>

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
