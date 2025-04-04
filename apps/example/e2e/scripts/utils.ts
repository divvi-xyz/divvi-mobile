import { Contract, providers, utils, Wallet } from 'ethers'
import { Address, createPublicClient, erc20Abi, http } from 'viem'
import { celo } from 'viem/chains'
import { REFILL_TOKENS } from './consts'
import { Token } from './types'

export async function checkBalance(
  address: Address,
  minBalance = 10,
  tokenSymbols: string[] = REFILL_TOKENS
) {
  const balance = (await getCeloTokensBalance(address)) ?? {}
  for (const [tokenSymbol, tokenBalance] of Object.entries(balance)) {
    if (tokenSymbols.includes(tokenSymbol) && tokenBalance < minBalance) {
      throw new Error(
        `${balance} balance of ${address} is below ${minBalance}. Please refill from the faucet or run ./fund-e2e-accounts.ts if a Valora Dev.`
      )
    }
  }
}

export async function getCeloTokensBalance(walletAddress: Address) {
  try {
    const supportedTokenAddresses: Address[] = [
      '0x765de816845861e75a25fca122bb6898b8b1282a',
      '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73',
      '0x471ece3750da237f93b8e339c536989b8978a438',
      '0xe8537a3d056da446677b9e9d6c5db704eaab4787',
    ] // cUSD, cEUR, CELO, cREAL
    const supportedTokenSymbols: string[] = ['cUSD', 'cEUR', 'CELO', 'cREAL']

    const celoClient = createPublicClient({
      chain: celo,
      transport: http(),
    })

    const results = await celoClient.multicall({
      contracts: supportedTokenAddresses.map((tokenAddress) => ({
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      })),
      allowFailure: false,
    })

    const balances: Record<string, number> = {}
    results.forEach((result, index) => {
      balances[supportedTokenSymbols[index]] = Number(BigInt(result) / BigInt(10 ** 18))
    })
    return balances
  } catch (err) {
    console.log(err)
  }
}

export async function transferToken(
  token: Token,
  amount: string, // in decimal
  to: string,
  signer: Wallet
): Promise<providers.TransactionReceipt> {
  const abi = ['function transfer(address to, uint256 value) returns (bool)']
  const contract = new Contract(token.address, abi, signer)

  const amountInSmallestUnit = utils.parseUnits(amount, token.decimals)
  const txObj = await contract.populateTransaction.transfer(to, amountInSmallestUnit)
  const tx = await signer.sendTransaction(txObj)
  const receipt = await tx.wait()
  console.log(`Received transfer tx hash ${receipt.transactionHash} with status ${receipt.status}`)

  if (receipt.status !== 1) {
    throw new Error(`Transfer reverted. Tx hash: ${receipt.transactionHash}`)
  }

  return receipt
}
