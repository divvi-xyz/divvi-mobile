import { NodeDetailManager } from '@toruslabs/fetch-node-details'
import { Torus } from '@toruslabs/torus.js'
import { jwtDecode } from 'jwt-decode'
import { getAppConfig } from 'src/appConfig'
import { TORUS_NETWORK } from 'src/config'
import Logger from 'src/utils/Logger'

const TAG = 'keylessBackup/torus'

export async function getTorusPrivateKey({ verifier, jwt }: { verifier: string; jwt: string }) {
  const web3AuthClientId = getAppConfig().features?.cloudBackup?.web3AuthClientId
  if (!web3AuthClientId) {
    throw new Error('web3AuthClientId not set in app config')
  }

  // largely copied from CustomAuth triggerLogin
  Logger.debug(TAG, `decoding jwt ${jwt}`)
  const sub = jwtDecode<{ sub: string }>(jwt).sub
  const nodeDetailManager = new NodeDetailManager({
    network: TORUS_NETWORK,
  })
  const torus = new Torus({
    network: TORUS_NETWORK,
    clientId: web3AuthClientId,
  })
  Logger.debug(TAG, `getting node details for verifier ${verifier} and sub ${sub}`)
  const { torusNodeEndpoints, torusNodePub, torusIndexes } = await nodeDetailManager.getNodeDetails(
    {
      verifier,
      verifierId: sub,
    }
  )
  Logger.debug(
    TAG,
    `getting public address with torusNodeEndpoints ${JSON.stringify(torusNodeEndpoints)}`
  )
  const torusPubKey = await torus.getPublicAddress(torusNodeEndpoints, torusNodePub, {
    verifier,
    verifierId: sub,
  })

  Logger.debug(TAG, `getting shares with torusPubKey ${JSON.stringify(torusPubKey)}`)
  const shares = await torus.retrieveShares({
    endpoints: torusNodeEndpoints,
    indexes: torusIndexes,
    verifier,
    verifierParams: { verifier_id: sub },
    idToken: jwt,
    nodePubkeys: torusNodePub,
  })
  Logger.debug(TAG, `got shares of private key`)
  const sharesEthAddressLower = shares.finalKeyData.walletAddress?.toLowerCase()
  if (sharesEthAddressLower !== torusPubKey.finalKeyData.walletAddress.toLowerCase()) {
    throw new Error('sharesEthAddressLower does not match torusPubKey')
  }
  if (!shares.finalKeyData.privKey) {
    throw new Error('private key missing from share data')
  }
  return shares.finalKeyData.privKey
}
