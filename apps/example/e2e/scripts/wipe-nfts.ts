import { E2E_TEST_WALLET } from './consts'
import { wipe1155AssetsForAddress } from './utils'
;(async () => {
  console.log('Wiping ERC-1155 assets for E2E_TEST_WALLET')
  await wipe1155AssetsForAddress(E2E_TEST_WALLET)
})()
