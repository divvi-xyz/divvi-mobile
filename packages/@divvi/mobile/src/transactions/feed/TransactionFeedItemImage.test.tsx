import { render } from '@testing-library/react-native'
import React from 'react'
import { Provider } from 'react-redux'
import TransactionFeedItemImage from 'src/transactions/feed/TransactionFeedItemImage'
import { NetworkId, TokenTransactionTypeV2, TransactionStatus } from 'src/transactions/types'
import { getSupportedNetworkIds } from 'src/web3/utils'
import { createMockStore } from 'test/utils'
import { mockTokenBalances } from 'test/values'

jest.mock('src/web3/utils')

const store = createMockStore({
  tokens: {
    error: false,
    tokenBalances: mockTokenBalances,
  },
})

describe('TransactionFeedItemImage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(getSupportedNetworkIds)
      .mockReturnValue([NetworkId['celo-alfajores'], NetworkId['ethereum-sepolia']])
  })

  it('renders icon with network badge', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionFeedItemImage
          status={TransactionStatus.Complete}
          transactionType={TokenTransactionTypeV2.SwapTransaction}
          networkId={NetworkId['celo-alfajores']}
        />
      </Provider>
    )

    expect(getByTestId('NetworkBadge')).toBeTruthy()
  })

  it('renders icon without network badge if hideNetworkIcon is set', () => {
    const { queryByTestId } = render(
      <TransactionFeedItemImage
        status={TransactionStatus.Complete}
        transactionType={TokenTransactionTypeV2.SwapTransaction}
        networkId={NetworkId['celo-alfajores']}
        hideNetworkIcon={true}
      />
    )

    expect(queryByTestId('NetworkBadge')).toBeFalsy()
  })

  it('renders icon without network badge if only one network is supported', () => {
    jest.mocked(getSupportedNetworkIds).mockReturnValue([NetworkId['celo-alfajores']])
    const { queryByTestId } = render(
      <TransactionFeedItemImage
        status={TransactionStatus.Complete}
        transactionType={TokenTransactionTypeV2.SwapTransaction}
        networkId={NetworkId['celo-alfajores']}
      />
    )

    expect(queryByTestId('NetworkBadge')).toBeFalsy()
  })
})
