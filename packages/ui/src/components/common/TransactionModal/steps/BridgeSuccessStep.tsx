import { FC } from 'react'
import { BridgeType } from '../../../bridge/BridgeTypeSelector'
import {
  Anchor,
  Box,
  Button,
  ChainIcon,
  Flex,
  Pill,
  Text
} from '../../../primitives'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt, faCheck, faClockFour } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { RelayChain } from '@reservoir0x/relay-sdk'
import { Currency } from '../../../../lib/constants/currencies'
import { truncateAddress } from '../../../../lib/utils/truncate'
import getChainBlockExplorerUrl from '../../../../lib/utils/getChainBlockExplorerUrl'
import { TxHashes } from '../TransactionModalRenderer'
import { useUserTransactions } from '../../../../hooks'

type BridgeSuccessStepProps = {
  bridgeType?: BridgeType
  toChain: RelayChain
  fromChain: RelayChain
  currency: Currency
  amount: {
    raw: bigint
    formatted: string | number
  }
  requestId: string | null
  timeEstimate?: string
  allTxHashes: TxHashes
  transaction: ReturnType<typeof useUserTransactions>['data']['0']
  seconds: number
  fillTime: string
  onOpenChange: (open: boolean) => void
}

export const BridgeSuccessStep: FC<BridgeSuccessStepProps> = ({
  bridgeType,
  toChain,
  fromChain,
  currency,
  amount,
  requestId,
  timeEstimate,
  allTxHashes,
  transaction,
  fillTime,
  seconds,
  onOpenChange
}) => {
  if (bridgeType === 'canonical')
    return (
      <>
        <Flex direction="column" align="center" justify="between">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20
            }}
          >
            <Flex
              alignItems="center"
              justifyContent="center"
              css={{
                height: 80,
                width: 78,
                position: 'relative',
                backgroundColor: 'amber2',
                borderRadius: '999999px'
              }}
            >
              <svg
                style={{ position: 'absolute', top: 7, left: 0, zIndex: 0 }}
                width="76"
                height="80"
                viewBox="0 0 64 54"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id="path-1-inside-1_1551_3458" fill="white">
                  <path d="M60.5983 22C62.477 22 64.0187 23.5272 63.8194 25.3953C63.3839 29.4763 62.1661 33.4465 60.2215 37.0847C57.7408 41.7257 54.1538 45.6834 49.7782 48.607C45.4027 51.5307 40.3736 53.3301 35.1366 53.8459C29.8995 54.3617 24.616 53.578 19.7541 51.5641C14.8923 49.5503 10.6021 46.3685 7.26367 42.3006C3.92522 38.2327 1.64152 33.4042 0.614871 28.2429C-0.411778 23.0816 -0.149694 17.7467 1.37791 12.7109C2.57543 8.7632 4.52167 5.09478 7.09947 1.90114C8.27945 0.439263 10.4495 0.449489 11.7779 1.77792C13.1063 3.10635 13.0848 5.24829 11.9473 6.74343C10.1382 9.12126 8.76082 11.8094 7.88827 14.6858C6.68544 18.651 6.47907 22.8516 7.28745 26.9156C8.09583 30.9796 9.89401 34.7816 12.5227 37.9846C15.1514 41.1877 18.5294 43.693 22.3576 45.2787C26.1859 46.8644 30.346 47.4815 34.4697 47.0754C38.5934 46.6692 42.5532 45.2524 45.9985 42.9503C49.4438 40.6482 52.2682 37.532 54.2215 33.8776C55.6384 31.2267 56.5653 28.352 56.9674 25.3914C57.2203 23.5298 58.7197 22 60.5983 22Z" />
                </mask>
                <path
                  d="M60.5983 22C62.477 22 64.0187 23.5272 63.8194 25.3953C63.3839 29.4763 62.1661 33.4465 60.2215 37.0847C57.7408 41.7257 54.1538 45.6834 49.7782 48.607C45.4027 51.5307 40.3736 53.3301 35.1366 53.8459C29.8995 54.3617 24.616 53.578 19.7541 51.5641C14.8923 49.5503 10.6021 46.3685 7.26367 42.3006C3.92522 38.2327 1.64152 33.4042 0.614871 28.2429C-0.411778 23.0816 -0.149694 17.7467 1.37791 12.7109C2.57543 8.7632 4.52167 5.09478 7.09947 1.90114C8.27945 0.439263 10.4495 0.449489 11.7779 1.77792C13.1063 3.10635 13.0848 5.24829 11.9473 6.74343C10.1382 9.12126 8.76082 11.8094 7.88827 14.6858C6.68544 18.651 6.47907 22.8516 7.28745 26.9156C8.09583 30.9796 9.89401 34.7816 12.5227 37.9846C15.1514 41.1877 18.5294 43.693 22.3576 45.2787C26.1859 46.8644 30.346 47.4815 34.4697 47.0754C38.5934 46.6692 42.5532 45.2524 45.9985 42.9503C49.4438 40.6482 52.2682 37.532 54.2215 33.8776C55.6384 31.2267 56.5653 28.352 56.9674 25.3914C57.2203 23.5298 58.7197 22 60.5983 22Z"
                  stroke="#FFB224"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  mask="url(#path-1-inside-1_1551_3458)"
                />
              </svg>

              <Box css={{ color: 'amber9', mr: '$2', zIndex: 1 }}>
                <FontAwesomeIcon icon={faClockFour} style={{ height: 32 }} />
              </Box>
            </Flex>
          </motion.div>

          <Text
            style="subtitle1"
            css={{ mt: '4', mb: '2', textAlign: 'center' }}
          >
            Processing the order to bridge {amount?.formatted} {currency.symbol}{' '}
            , this will take ~{timeEstimate}.
          </Text>

          <Flex align="center" css={{ gap: '2', mb: 24 }}>
            {fromChain ? (
              <Pill
                color="gray"
                css={{ alignItems: 'center', py: '2', px: '3' }}
              >
                <ChainIcon chainId={fromChain.id} height={20} width={20} />
                <Text style="subtitle1">{fromChain.displayName}</Text>
              </Pill>
            ) : (
              <Text style="subtitle1">?</Text>
            )}
            <Text style="subtitle1" color="subtle">
              to
            </Text>
            {toChain ? (
              <Pill color="gray" css={{ alignItems: 'center', py: '2' }}>
                <ChainIcon chainId={toChain.id} height={20} width={20} />
                <Text style="subtitle1">{toChain.displayName}</Text>
              </Pill>
            ) : (
              <Text style="subtitle1">?</Text>
            )}
          </Flex>
          <Text
            css={{
              background: 'gray2',
              p: '4',
              borderRadius: 12,
              textAlign: 'center'
            }}
            style="body2"
          >
            You can close this modal while it finalizes on the blockchain. The
            Transaction will continue in the background.
          </Text>
        </Flex>

        <Flex css={{ width: '100%', mt: 8, gap: '3' }}>
          <Button
            color="secondary"
            onClick={() => {
              onOpenChange(false)
            }}
            css={{
              justifyContent: 'center',
              width: '100%'
            }}
          >
            Done
          </Button>
          <Link
            href={`/transaction/${transaction?.data?.inTxs?.[0]?.hash}`}
            style={{ width: '100%' }}
            target="_blank"
          >
            <Button
              css={{
                justifyContent: 'center',
                width: 'max-content'
              }}
            >
              Track Progress
            </Button>
          </Link>
        </Flex>
      </>
    )
  else {
    return (
      <>
        <Flex direction="column" align="center" justify="between">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20
            }}
          >
            <Flex
              alignItems="center"
              justifyContent="center"
              css={{
                height: 80,
                width: 80,
                backgroundColor: 'green2',
                '--borderColor': 'colors.green10',
                border: '6px solid var(--borderColor)',
                borderRadius: '999999px',
                position: 'relative'
              }}
            >
              {fillTime !== '-' && seconds <= 30 ? (
                <Text style="h3">{fillTime}</Text>
              ) : (
                <Box css={{ color: 'success', mr: '$2' }}>
                  <FontAwesomeIcon icon={faCheck} style={{ height: 40 }} />
                </Box>
              )}
              <Flex
                align="center"
                justify="center"
                css={{
                  position: 'absolute',
                  width: 50,
                  height: 50,
                  background: 'primary3',
                  color: 'primary9',
                  border: '3px solid neutralBg',
                  borderRadius: '999999px',
                  right: -40,
                  bottom: -12
                }}
              >
                <Box css={{ width: 29, height: 27 }}>
                  <FontAwesomeIcon icon={faBolt} width={29} height={27} />
                </Box>
              </Flex>
            </Flex>
          </motion.div>

          <Text
            style="subtitle1"
            css={{ mt: '4', mb: '2', textAlign: 'center' }}
          >
            Successfully bridged {amount?.formatted} {currency.symbol}.{' '}
          </Text>

          <Flex align="center" css={{ gap: '2', mb: 24 }}>
            {fromChain ? (
              <Pill
                color="gray"
                css={{ alignItems: 'center', py: '2', px: '3' }}
              >
                <ChainIcon chainId={fromChain.id} height={20} width={20} />
                <Text style="subtitle1">{fromChain.displayName}</Text>
              </Pill>
            ) : (
              <Text style="subtitle1">?</Text>
            )}
            <Text style="subtitle1" color="subtle">
              to
            </Text>
            {toChain ? (
              <Pill
                color="gray"
                css={{ alignItems: 'center', py: '2', px: '3' }}
              >
                <ChainIcon chainId={toChain.id} height={20} width={20} />
                <Text style="subtitle1">{toChain.displayName}</Text>
              </Pill>
            ) : (
              <Text style="subtitle1">?</Text>
            )}
          </Flex>
          {allTxHashes.map(({ txHash, chainId }) => {
            const blockExplorerBaseUrl = getChainBlockExplorerUrl(chainId)
            return (
              <Anchor
                key={txHash}
                href={`${blockExplorerBaseUrl}/tx/${txHash}`}
                target="_blank"
              >
                View Tx: {truncateAddress(txHash)}
              </Anchor>
            )
          })}
        </Flex>

        <Flex css={{ width: '100%', mt: 8, gap: '3' }}>
          {transaction?.data?.inTxs?.[0]?.hash ? (
            <Link
              href={`/transaction/${transaction?.data?.inTxs?.[0]?.hash}`}
              style={{ width: '100%' }}
            >
              <Button
                color="secondary"
                css={{
                  justifyContent: 'center',
                  width: 'max-content'
                }}
              >
                View Details
              </Button>
            </Link>
          ) : null}
          <Button
            onClick={() => {
              onOpenChange(false)
            }}
            css={{
              justifyContent: 'center',
              width: '100%'
            }}
          >
            Done
          </Button>
        </Flex>
      </>
    )
  }
}
