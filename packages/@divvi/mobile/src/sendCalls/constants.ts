// Within 24 hours from the corresponding wallet_sendCalls, wallets SHOULD return
// a call-batch status when wallet_getCallsStatus is called with the same id.
// https://eips.ethereum.org/EIPS/eip-5792
export const BATCH_STATUS_TTL = 24 * 60 * 60 * 1000
