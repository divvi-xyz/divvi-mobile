[**@divvi/mobile**](../README.md)

---

[@divvi/mobile](../README.md) / useSendTransactions

# Function: useSendTransactions()

```ts
function useSendTransactions(): object
```

Defined in: [packages/@divvi/mobile/src/public/hooks/useSendTransactions.ts:5](https://github.com/divvi-xyz/divvi-mobile/blob/main/packages/@divvi/mobile/src/public/hooks/useSendTransactions.ts#L5)

## Returns

`object`

### data

```ts
data: undefined | `0x${string}`[] = asyncCallback.result;
```

### error

```ts
error: undefined | Error = asyncCallback.error;
```

### reset()

```ts
reset: () => void = asyncCallback.reset;
```

#### Returns

`void`

### sendTransactions()

```ts
sendTransactions: (...args) => (Promise<`0x${string}`[]> = asyncCallback.execute)
```

#### Parameters

##### args

...\[[`PreparedTransactionsPossible`](../interfaces/PreparedTransactionsPossible.md)\]

#### Returns

`Promise`\<`` `0x${string}` ``[]\>

### status

```ts
status: AsyncStatus
```
