import BigNumber from 'bignumber.js'
import type { PreparedTransactionsPossible } from 'src/public'
import { getDeserializedTokenBalance, getSerializableTokenBalance } from 'src/tokens/utils'
import { NetworkId } from 'src/transactions/types'
import {
  getDeserializedPossibleTransaction,
  getPreparedTransactions,
  getSerializablePossibleTransaction,
  getSerializablePreparedTransactions,
  type SerializablePreparedTransactionsPossible,
} from 'src/viem/preparedTransactionSerialization'

const mockFeeCurrency = {
  address: '0xfee2',
  balance: new BigNumber(70), // 70k units, 70.0 decimals
  decimals: 3,
  priceUsd: null,
  lastKnownPriceUsd: null,
  tokenId: 'celo-mainnet:0xfee2',
  symbol: 'FEE2',
  name: 'Fee token 2',
  networkId: NetworkId['celo-mainnet'],
  isNative: false, // means we add 50_000 units / 50.0 decimal padding for gas
  isFeeCurrency: true,
}

describe(getSerializablePreparedTransactions, () => {
  it('should turn bigints into strings for known bigint keys', () => {
    expect(
      getSerializablePreparedTransactions([
        {
          from: '0x123',
          to: '0x456',
          value: BigInt(123),
          gas: BigInt(456),
          maxFeePerGas: BigInt(789),
          maxPriorityFeePerGas: BigInt(1011),
          // @ts-expect-error: unknown key, will be ignored, but TS will prevent in normal use
          unknown: BigInt(1415),
        },
      ])
    ).toStrictEqual([
      {
        from: '0x123',
        to: '0x456',
        value: '123',
        gas: '456',
        maxFeePerGas: '789',
        maxPriorityFeePerGas: '1011',
        unknown: BigInt(1415), // not touched
      },
    ])
  })

  it('should not touch undefined values', () => {
    expect(
      getSerializablePreparedTransactions([
        {
          from: '0x123',
          to: '0x456',
          value: undefined,
          gas: BigInt(456),
        },
      ])
    ).toStrictEqual([
      {
        from: '0x123',
        to: '0x456',
        value: undefined,
        gas: '456',
      },
    ])
  })
})

describe(getPreparedTransactions, () => {
  it('should turn strings into bigints for known bigint keys', () => {
    expect(
      getPreparedTransactions([
        {
          from: '0x123',
          to: '0x456',
          value: '123',
          gas: '456',
          maxFeePerGas: '789',
          maxPriorityFeePerGas: '1011',
          // @ts-expect-error: unknown key, will be ignored, but TS will prevent in normal use
          unknown: BigInt(1415), // not touched
        },
      ])
    ).toStrictEqual([
      {
        from: '0x123',
        to: '0x456',
        value: BigInt(123),
        gas: BigInt(456),
        maxFeePerGas: BigInt(789),
        maxPriorityFeePerGas: BigInt(1011),
        unknown: BigInt(1415), // not touched
      },
    ])
  })

  it('should not touch undefined values', () => {
    expect(
      getPreparedTransactions([
        {
          from: '0x123',
          to: '0x456',
          value: undefined,
          gas: '456',
        },
      ])
    ).toStrictEqual([
      {
        from: '0x123',
        to: '0x456',
        value: undefined,
        gas: BigInt(456),
      },
    ])
  })
})

describe(getSerializablePossibleTransaction, () => {
  const possibleTransaction: PreparedTransactionsPossible = {
    type: 'possible',
    transactions: [
      {
        from: '0x123',
        to: '0x456',
        value: BigInt(123),
        gas: BigInt(456),
        maxFeePerGas: BigInt(789),
        maxPriorityFeePerGas: BigInt(1011),
      },
    ],
    feeCurrency: mockFeeCurrency,
  }
  it('should serialize possible transaction by converting bigint fields to strings', () => {
    const serialized = getSerializablePossibleTransaction(possibleTransaction)
    expect(serialized).toEqual({
      type: 'possible',
      transactions: [
        {
          from: '0x123',
          to: '0x456',
          value: '123',
          gas: '456',
          maxFeePerGas: '789',
          maxPriorityFeePerGas: '1011',
        },
      ],
      feeCurrency: getSerializableTokenBalance(mockFeeCurrency),
    })
  })
})

describe(getDeserializedPossibleTransaction, () => {
  const serializedPossibleTransaction: SerializablePreparedTransactionsPossible = {
    type: 'possible',
    transactions: [
      {
        from: '0x123',
        to: '0x456',
        value: '123',
        gas: '456',
        maxFeePerGas: '789',
        maxPriorityFeePerGas: '1011',
      },
    ],
    feeCurrency: getSerializableTokenBalance(mockFeeCurrency),
  }

  it('should deserialize possible transaction by converting string fields back to bigint', () => {
    const deserialized = getDeserializedPossibleTransaction(serializedPossibleTransaction)
    expect(deserialized).toEqual({
      type: 'possible',
      transactions: [
        {
          from: '0x123',
          to: '0x456',
          value: BigInt(123),
          gas: BigInt(456),
          maxFeePerGas: BigInt(789),
          maxPriorityFeePerGas: BigInt(1011),
        },
      ],
      feeCurrency: getDeserializedTokenBalance(serializedPossibleTransaction.feeCurrency),
    })
  })
})
