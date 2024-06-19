import { Flex, Button, Text, Box } from '../primitives/index.js'
import type { FC } from 'react'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CustomAddressModal } from '../common/CustomAddressModal.js'
import {
  useCurrencyBalance,
  useENSResolver,
  useMounted,
  useRelayClient,
  useDebounceState
} from '../../hooks/index.js'
import type { Address } from 'viem'
import { formatUnits, parseUnits, zeroAddress } from 'viem'
import { useAccount, useConfig, useWalletClient } from 'wagmi'
import { useCapabilities } from 'wagmi/experimental'
import TokenSelector from '../common/TokenSelector.js'
import type { Token } from '../../types/index.js'
import Anchor, { AnchorButton } from '../primitives/Anchor.js'
import {
  formatNumber,
  formatFixedLength,
  formatDollar
} from '../../utils/numbers.js'
import { mainnet } from 'viem/chains'
import { useQueryClient } from '@tanstack/react-query'
import AmountInput from '../common/AmountInput.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowDown } from '@fortawesome/free-solid-svg-icons/faArrowDown'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight'
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock'
import { faGasPump } from '@fortawesome/free-solid-svg-icons/faGasPump'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons/faInfoCircle'
import { deadAddress } from '../../constants/address.js'
import type { Execute } from '@reservoir0x/relay-sdk'
import {
  calculateRelayerFeeProportionUsd,
  calculateTimeEstimate,
  extractQuoteId,
  isHighRelayerServiceFeeUsd,
  parseFees
} from '../../utils/quote.js'
import { LoadingSpinner } from '../common/LoadingSpinner.js'
import { WidgetErrorWell } from '../common/WidgetErrorWell.js'
import { SwapModal } from '../common/TransactionModal/SwapModal.js'
import { switchChain } from 'wagmi/actions'
import { BalanceDisplay } from '../common/BalanceDisplay.js'
import { useQuote } from '@reservoir0x/relay-kit-hooks'
import { EventNames } from '../../constants/events.js'
import { ProviderOptionsContext } from '../../providers/RelayKitProvider.js'
import Tooltip from '../primitives/Tooltip.js'
import { ReservoirText } from '../../img/ReservoirText.js'

type SwapWidgetProps = {
  defaultFromToken?: Token
  defaultToToken?: Token
  defaultToAddress?: Address
  defaultAmount?: string
  defaultTradeType?: 'EXACT_INPUT' | 'EXACT_OUTPUT'
  lockToToken?: boolean
  lockFromToken?: boolean
  onFromTokenChange?: (token?: Token) => void
  onToTokenChange?: (token?: Token) => void
  onConnectWallet?: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onSwapSuccess?: (data: Execute) => void
  onSwapError?: (error: string, data?: Execute) => void
}

const SwapWidget: FC<SwapWidgetProps> = ({
  defaultFromToken,
  defaultToToken,
  defaultToAddress,
  defaultAmount,
  defaultTradeType,
  lockToToken = false,
  lockFromToken = false,
  onFromTokenChange,
  onToTokenChange,
  onConnectWallet,
  onAnalyticEvent,
  onSwapSuccess,
  onSwapError
}) => {
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const wagmiConfig = useConfig()
  const relayClient = useRelayClient()
  const walletClient = useWalletClient()
  const { address, chainId: activeWalletChainId, connector } = useAccount()
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [customToAddress, setCustomToAddress] = useState<Address | undefined>(
    defaultToAddress
  )
  const recipient = customToAddress ?? address
  const { displayName: toDisplayName } = useENSResolver(recipient)
  const isMounted = useMounted()
  const [tradeType, setTradeType] = useState<'EXACT_INPUT' | 'EXACT_OUTPUT'>(
    defaultTradeType ?? 'EXACT_INPUT'
  )
  const queryClient = useQueryClient()
  const [steps, setSteps] = useState<null | Execute['steps']>(null)
  const [details, setDetails] = useState<null | Execute['details']>(null)
  const [waitingForSteps, setWaitingForSteps] = useState(false)
  const {
    value: amountInputValue,
    debouncedValue: debouncedInputAmountValue,
    setValue: setAmountInputValue,
    debouncedControls: debouncedAmountInputControls
  } = useDebounceState<string>(
    !defaultTradeType || defaultTradeType === 'EXACT_INPUT'
      ? defaultAmount ?? ''
      : '',
    500
  )
  const {
    value: amountOutputValue,
    debouncedValue: debouncedOutputAmountValue,
    setValue: setAmountOutputValue,
    debouncedControls: debouncedAmountOutputControls
  } = useDebounceState<string>(
    defaultTradeType === 'EXACT_OUTPUT' ? defaultAmount ?? '' : '',
    500
  )

  const [rateMode, setRateMode] = useState<'input' | 'output'>('input')
  const [swapError, setSwapError] = useState<Error | null>(null)
  const defaultChainId = relayClient?.chains[0].id ?? mainnet.id

  const [fromToken, setFromToken] = useState<Token | undefined>(
    defaultFromToken ?? {
      chainId: defaultChainId,
      address: zeroAddress,
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
      logoURI: 'https://assets.relay.link/icons/1/light.png'
    }
  )
  const [toToken, setToToken] = useState<Token | undefined>(defaultToToken)

  const hasLockedToken = lockFromToken || lockToToken

  const handleSetFromToken = (token?: Token) => {
    setFromToken(token)
    onFromTokenChange?.(token)
  }
  const handleSetToToken = (token?: Token) => {
    setToToken(token)
    onToTokenChange?.(token)
  }

  const {
    value: fromBalance,
    queryKey: fromBalanceQueryKey,
    isLoading: isLoadingFromBalance,
    isError: fromBalanceErrorFetching
  } = useCurrencyBalance({
    chainId: fromToken?.chainId ? fromToken.chainId : 0,
    address: address,
    currency: fromToken?.address ? (fromToken.address as Address) : undefined,
    enabled: fromToken !== undefined
  })

  const {
    value: toBalance,
    queryKey: toBalanceQueryKey,
    isLoading: isLoadingToBalance
  } = useCurrencyBalance({
    chainId: toToken?.chainId ? toToken.chainId : 0,
    address: recipient,
    currency: toToken?.address ? (toToken.address as Address) : undefined,
    enabled: toToken !== undefined
  })

  const invalidateBalanceQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: fromBalanceQueryKey })
    queryClient.invalidateQueries({ queryKey: toBalanceQueryKey })
    queryClient.invalidateQueries({ queryKey: ['useDuneBalances'] })
  }, [queryClient, fromBalanceQueryKey, toBalanceQueryKey, address])
  const { data: capabilities } = useCapabilities({
    query: {
      enabled: connector && connector.id === 'coinbaseWalletSDK'
    }
  })
  const hasAuxiliaryFundsSupport = Boolean(
    fromToken?.chainId
      ? capabilities?.[fromToken?.chainId]?.auxiliaryFunds?.supported
      : false
  )

  const {
    data: quote,
    isLoading: isFetchingQuote,
    executeQuote: executeSwap,
    error
  } = useQuote(
    relayClient ? relayClient : undefined,
    walletClient.data,
    fromToken && toToken
      ? {
          user: address ?? deadAddress,
          originChainId: fromToken.chainId,
          destinationChainId: toToken.chainId,
          originCurrency: fromToken.address,
          destinationCurrency: toToken.address,
          recipient: recipient as string,
          tradeType,
          appFees: providerOptionsContext.appFees,
          amount:
            tradeType === 'EXACT_INPUT'
              ? parseUnits(
                  debouncedInputAmountValue,
                  fromToken.decimals
                ).toString()
              : parseUnits(
                  debouncedOutputAmountValue,
                  toToken.decimals
                ).toString()
        }
      : undefined,
    () => {},
    ({ steps, details }) => {
      onAnalyticEvent?.(EventNames.SWAP_EXECUTE_QUOTE_RECEIVED, {
        wallet_connector: connector?.name,
        quote_id: steps ? extractQuoteId(steps) : undefined,
        amount_in: details?.currencyIn?.amountFormatted,
        currency_in: details?.currencyIn?.currency?.symbol,
        chain_id_in: details?.currencyIn?.currency?.chainId,
        amount_out: details?.currencyOut?.amountFormatted,
        currency_out: details?.currencyOut?.currency?.symbol,
        chain_id_out: details?.currencyOut?.currency?.chainId
      })
    },
    {
      enabled:
        Boolean(
          relayClient &&
            ((tradeType === 'EXACT_INPUT' &&
              debouncedInputAmountValue &&
              debouncedInputAmountValue.length > 0 &&
              Number(debouncedInputAmountValue) !== 0) ||
              (tradeType === 'EXACT_OUTPUT' &&
                debouncedOutputAmountValue &&
                debouncedOutputAmountValue.length > 0 &&
                Number(debouncedOutputAmountValue) !== 0))
        ) &&
        fromToken !== undefined &&
        toToken !== undefined,
      refetchInterval:
        steps === null &&
        debouncedInputAmountValue === amountInputValue &&
        debouncedOutputAmountValue === amountOutputValue
          ? 12000
          : undefined
    }
  )

  useEffect(() => {
    if (tradeType === 'EXACT_INPUT') {
      const amountOut = quote?.details?.currencyOut?.amount ?? ''
      setAmountOutputValue(
        amountOut !== ''
          ? formatUnits(
              BigInt(amountOut),
              Number(quote?.details?.currencyOut?.currency?.decimals ?? 18)
            )
          : ''
      )
    } else if (tradeType === 'EXACT_OUTPUT') {
      const amountIn = quote?.details?.currencyIn?.amount ?? ''
      setAmountInputValue(
        amountIn !== ''
          ? formatUnits(
              BigInt(amountIn),
              Number(quote?.details?.currencyIn?.currency?.decimals ?? 18)
            )
          : ''
      )
    }
    debouncedAmountInputControls.flush()
    debouncedAmountOutputControls.flush()
  }, [quote, tradeType])

  const feeBreakdown = useMemo(() => {
    const chains = relayClient?.chains
    const fromChain = chains?.find((chain) => chain.id === fromToken?.chainId)
    const toChain = chains?.find((chain) => chain.id === toToken?.chainId)
    return fromToken && toToken && fromChain && toChain && quote
      ? parseFees(toChain, fromChain, quote)
      : null
  }, [quote, fromToken, toToken, relayClient])

  const totalAmount = BigInt(quote?.details?.currencyIn?.amount ?? 0n)

  const hasInsufficientBalance = Boolean(
    !fromBalanceErrorFetching &&
      totalAmount &&
      address &&
      (fromBalance ?? 0n) < totalAmount &&
      !hasAuxiliaryFundsSupport
  )

  const fetchQuoteErrorMessage = error
    ? error?.message
      ? (error?.message as string)
      : 'Unknown Error'
    : null
  const isInsufficientLiquidityError = fetchQuoteErrorMessage?.includes(
    'No quotes available'
  )

  const timeEstimate = calculateTimeEstimate(quote?.breakdown)
  const originGasFee = feeBreakdown?.breakdown?.find(
    (fee) => fee.id === 'origin-gas'
  )

  const swapRate = quote?.details?.rate
  const compactSwapRate = Boolean(swapRate && swapRate.length > 8)
  const highRelayerServiceFee = isHighRelayerServiceFeeUsd(quote)
  const relayerFeeProportion = calculateRelayerFeeProportionUsd(quote)

  const isFromETH = fromToken?.symbol === 'ETH'

  const isWrap =
    isFromETH &&
    toToken?.symbol === 'WETH' &&
    fromToken.chainId === toToken.chainId
  const isUnwrap =
    fromToken?.symbol === 'WETH' &&
    toToken?.symbol === 'ETH' &&
    fromToken.chainId === toToken.chainId

  const isSameCurrencySameRecipientSwap =
    fromToken?.address === toToken?.address &&
    fromToken?.chainId === toToken?.chainId &&
    address === recipient

  let ctaCopy = 'Swap'

  if (isWrap) {
    ctaCopy = 'Wrap'
  } else if (isUnwrap) {
    ctaCopy = 'Unwrap'
  }

  if (!fromToken || !toToken) {
    ctaCopy = 'Select a token'
  } else if (isSameCurrencySameRecipientSwap) {
    ctaCopy = 'Invalid recipient'
  } else if (!debouncedInputAmountValue || !debouncedOutputAmountValue) {
    ctaCopy = 'Enter an amount'
  } else if (hasInsufficientBalance) {
    ctaCopy = 'Insufficient Balance'
  } else if (isInsufficientLiquidityError) {
    ctaCopy = 'Insufficient Liquidity'
  } else if (steps !== null) {
    ctaCopy = 'Swapping'
    if (isWrap) {
      ctaCopy = 'Wrapping'
    } else if (isUnwrap) {
      ctaCopy = 'Unwrapping'
    }
  }

  const swap = useCallback(async () => {
    try {
      onAnalyticEvent?.(EventNames.SWAP_CTA_CLICKED)
      setWaitingForSteps(true)

      if (!executeSwap) {
        throw 'Missing a quote'
      }

      if (fromToken && fromToken?.chainId !== activeWalletChainId) {
        onAnalyticEvent?.(EventNames.SWAP_SWITCH_NETWORK)
        await switchChain(wagmiConfig, {
          chainId: fromToken.chainId
        })
      }

      executeSwap(({ steps, details }) => {
        setSteps(steps)
        setDetails(details)
      })
        ?.catch((error: any) => {
          if (
            error &&
            ((typeof error.message === 'string' &&
              error.message.includes('rejected')) ||
              (typeof error === 'string' && error.includes('rejected')))
          ) {
            onAnalyticEvent?.(EventNames.USER_REJECTED_WALLET)
            setSteps(null)
            setDetails(null)
            return
          }

          const errorMessage = error?.response?.data?.message
            ? new Error(error?.response?.data?.message)
            : error

          onAnalyticEvent?.(EventNames.SWAP_ERROR, {
            error_message: errorMessage,
            wallet_connector: connector?.name,
            quote_id: steps ? extractQuoteId(steps) : undefined,
            amount_in: parseFloat(`${debouncedInputAmountValue}`),
            currency_in: fromToken?.symbol,
            chain_id_in: fromToken?.chainId,
            amount_out: parseFloat(`${debouncedOutputAmountValue}`),
            currency_out: toToken?.symbol,
            chain_id_out: toToken?.chainId
          })
          setSwapError(errorMessage)
          onSwapError?.(errorMessage, quote as Execute)
        })
        .finally(() => {
          setWaitingForSteps(false)
          invalidateBalanceQueries()
        })
    } catch (e) {
      setWaitingForSteps(false)
      onAnalyticEvent?.(EventNames.SWAP_ERROR, {
        error_message: e,
        wallet_connector: connector?.name,
        quote_id: steps ? extractQuoteId(steps) : undefined,
        amount_in: parseFloat(`${debouncedInputAmountValue}`),
        currency_in: fromToken?.symbol,
        chain_id_in: fromToken?.chainId,
        amount_out: parseFloat(`${debouncedOutputAmountValue}`),
        currency_out: toToken?.symbol,
        chain_id_out: toToken?.chainId
      })
      onSwapError?.(e as any, quote as Execute)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    relayClient,
    activeWalletChainId,
    wagmiConfig,
    address,
    connector,
    fromToken,
    toToken,
    customToAddress,
    recipient,
    debouncedInputAmountValue,
    debouncedOutputAmountValue,
    tradeType,
    executeSwap,
    setSteps,
    setDetails,
    invalidateBalanceQueries
  ])

  return (
    <div className="relay-kit-reset">
      <Flex
        direction="column"
        css={{
          width: '100%',
          borderRadius: 'widget-border-radius',
          overflow: 'hidden',
          backgroundColor: 'widget-background',
          boxShadow: 'widget-box-shadow',
          border: 'widget-border',
          p: '4',
          minWidth: 300,
          maxWidth: 440
        }}
      >
        <Flex
          align="center"
          justify="between"
          css={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            backgroundColor: 'widget-card-background',
            gap: '3',
            p: '12px 12px',
            borderRadius: 'widget-card-border-radius',
            border: 'widget-card-border'
          }}
        >
          <Text style="subtitle1">From</Text>
          <Flex align="center" justify="between" css={{ gap: '4' }}>
            <TokenSelector
              token={fromToken}
              locked={lockFromToken}
              onAnalyticEvent={onAnalyticEvent}
              setToken={(token) => {
                onAnalyticEvent?.(EventNames.SWAP_TOKEN_SELECT, {
                  direction: 'input',
                  token_symbol: token.symbol
                })
                if (
                  token.address === toToken?.address &&
                  token.chainId === toToken?.chainId &&
                  address === recipient
                ) {
                  handleSetFromToken(toToken)
                  handleSetToToken(fromToken)
                } else {
                  handleSetFromToken(token)
                }
              }}
              context="from"
            />
            <AmountInput
              value={
                tradeType === 'EXACT_INPUT'
                  ? amountInputValue
                  : amountInputValue
                    ? formatFixedLength(amountInputValue, 8)
                    : amountInputValue
              }
              setValue={(e) => {
                setAmountInputValue(e)
                setTradeType('EXACT_INPUT')
                if (Number(e) === 0) {
                  setAmountOutputValue('')
                  debouncedAmountInputControls.flush()
                }
              }}
              onFocus={() => {
                onAnalyticEvent?.(EventNames.SWAP_INPUT_FOCUSED)
              }}
              css={{
                textAlign: 'right',
                color:
                  isFetchingQuote && tradeType === 'EXACT_OUTPUT'
                    ? 'text-subtle'
                    : 'input-color',
                _placeholder: {
                  color:
                    isFetchingQuote && tradeType === 'EXACT_OUTPUT'
                      ? 'text-subtle'
                      : 'input-color'
                }
              }}
            />
          </Flex>
          <Flex
            align="center"
            justify="between"
            css={{ gap: '3', width: '100%' }}
          >
            <Flex align="center" css={{ gap: '3' }}>
              {fromToken ? (
                <BalanceDisplay
                  isLoading={isLoadingFromBalance}
                  balance={fromBalance}
                  decimals={fromToken?.decimals}
                  symbol={fromToken?.symbol}
                  hasInsufficientBalance={hasInsufficientBalance}
                />
              ) : (
                <Flex css={{ height: 18 }} />
              )}
              {fromBalance ? (
                <AnchorButton
                  aria-label="MAX"
                  css={{ fontSize: 12 }}
                  onClick={() => {
                    if (fromToken) {
                      setAmountInputValue(
                        formatUnits(
                          isFromETH ? (fromBalance * 99n) / 100n : fromBalance,
                          fromToken?.decimals
                        )
                      )
                      setTradeType('EXACT_INPUT')
                      debouncedAmountOutputControls.cancel()
                      debouncedAmountInputControls.flush()
                    }
                  }}
                >
                  MAX
                </AnchorButton>
              ) : null}
            </Flex>
            {quote?.details?.currencyIn?.amountUsd &&
            Number(quote.details.currencyIn.amountUsd) > 0 ? (
              <Text style="subtitle3" color="subtle">
                {formatDollar(Number(quote.details.currencyIn.amountUsd))}
              </Text>
            ) : null}
          </Flex>
        </Flex>
        <Box
          css={{
            position: 'relative',
            my: -10,
            mx: 'auto',
            height: hasLockedToken ? 30 : 40
          }}
        >
          {hasLockedToken ? null : (
            <Button
              size="small"
              color="white"
              css={{
                color: 'gray9',
                alignSelf: 'center',
                px: '2',
                py: '2',
                borderWidth: '2px !important',
                minHeight: 30,
                zIndex: 10
              }}
              onClick={() => {
                if (fromToken || toToken) {
                  if (tradeType === 'EXACT_INPUT') {
                    setTradeType('EXACT_OUTPUT')
                    setAmountInputValue('')
                    setAmountOutputValue(amountInputValue)
                  } else {
                    setTradeType('EXACT_INPUT')
                    setAmountOutputValue('')
                    setAmountInputValue(amountOutputValue)
                  }

                  handleSetFromToken(toToken)
                  handleSetToToken(fromToken)
                  debouncedAmountInputControls.flush()
                  debouncedAmountOutputControls.flush()
                }
              }}
            >
              <FontAwesomeIcon icon={faArrowDown} width={16} height={16} />
            </Button>
          )}
        </Box>
        <Flex
          align="center"
          justify="between"
          css={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            backgroundColor: 'widget-card-background',
            gap: '3',
            p: '12px 12px',
            borderRadius: 'widget-card-border-radius',
            border: 'widget-card-border',
            mb: '3'
          }}
        >
          <Flex css={{ width: '100%' }} justify="between">
            <Text style="subtitle1">To</Text>
            {isMounted && (address || customToAddress) ? (
              <AnchorButton
                css={{ display: 'flex', alignItems: 'center', gap: '2' }}
                onClick={() => {
                  setAddressModalOpen(true)
                  onAnalyticEvent?.(EventNames.SWAP_ADDRESS_MODAL_CLICKED)
                }}
              >
                <Text style="subtitle3" css={{ color: 'inherit' }}>
                  {toDisplayName}
                </Text>
                <FontAwesomeIcon icon={faChevronRight} width={8} />
              </AnchorButton>
            ) : null}
          </Flex>
          <Flex align="center" justify="between" css={{ gap: '4' }}>
            <TokenSelector
              token={toToken}
              locked={lockToToken}
              setToken={(token) => {
                onAnalyticEvent?.(EventNames.SWAP_TOKEN_SELECT, {
                  direction: 'output',
                  token_symbol: token.symbol
                })
                if (
                  token.address === fromToken?.address &&
                  token.chainId === fromToken?.chainId &&
                  address === recipient
                ) {
                  handleSetToToken(fromToken)
                  handleSetFromToken(toToken)
                } else {
                  handleSetToToken(token)
                }
              }}
              context="to"
              onAnalyticEvent={onAnalyticEvent}
            />
            <AmountInput
              value={
                tradeType === 'EXACT_OUTPUT'
                  ? amountOutputValue
                  : amountOutputValue
                    ? formatFixedLength(amountOutputValue, 8)
                    : amountOutputValue
              }
              setValue={(e) => {
                setAmountOutputValue(e)
                setTradeType('EXACT_OUTPUT')
                if (Number(e) === 0) {
                  setAmountInputValue('')
                  debouncedAmountOutputControls.flush()
                }
              }}
              disabled={!toToken}
              onFocus={() => {
                onAnalyticEvent?.(EventNames.SWAP_OUTPUT_FOCUSED)
              }}
              css={{
                color:
                  isFetchingQuote && tradeType === 'EXACT_INPUT'
                    ? 'gray11'
                    : 'gray12',
                _placeholder: {
                  color:
                    isFetchingQuote && tradeType === 'EXACT_INPUT'
                      ? 'gray11'
                      : 'gray12'
                },
                textAlign: 'right',
                _disabled: {
                  cursor: 'not-allowed',
                  _placeholder: {
                    color: 'gray10'
                  }
                }
              }}
            />
          </Flex>
          <Flex
            align="center"
            justify="between"
            css={{ gap: '3', width: '100%' }}
          >
            {toToken ? (
              <BalanceDisplay
                isLoading={isLoadingToBalance}
                balance={toBalance}
                decimals={toToken?.decimals}
                symbol={toToken?.symbol}
              />
            ) : (
              <Flex css={{ height: 18 }} />
            )}
            {quote?.details?.currencyOut?.amountUsd &&
            Number(quote.details.currencyOut.amountUsd) > 0 ? (
              <Flex align="center" css={{ gap: '1' }}>
                <Text style="subtitle3" color="subtle">
                  {formatDollar(Number(quote.details.currencyOut.amountUsd))}
                </Text>
                <Tooltip
                  content={
                    <Flex css={{ minWidth: 200 }} direction="column">
                      <Flex align="center" css={{ width: '100%' }}>
                        <Text style="subtitle3" css={{ mr: 'auto' }}>
                          Total Price Impact
                        </Text>
                        <Text style="subtitle3" css={{ mr: '1' }}>
                          {feeBreakdown?.totalFees.priceImpact}
                        </Text>
                        <Text style="subtitle3" color="subtle">
                          ({feeBreakdown?.totalFees.priceImpactPercentage})
                        </Text>
                      </Flex>
                      <Box
                        css={{
                          width: '100%',
                          height: 1,
                          backgroundColor: 'slate.6',
                          marginTop: '2',
                          marginBottom: '2'
                        }}
                      />
                      <Flex align="center" css={{ width: '100%' }}>
                        <Text
                          style="subtitle3"
                          color="subtle"
                          css={{ mr: 'auto' }}
                        >
                          Swap Impact
                        </Text>
                        <Text style="subtitle3">
                          {feeBreakdown?.totalFees.swapImpact}
                        </Text>
                      </Flex>
                      {feeBreakdown?.breakdown.map((fee) => {
                        if (fee.id === 'origin-gas') {
                          return null
                        }
                        return (
                          <Flex
                            key={fee.id}
                            align="center"
                            css={{ width: '100%' }}
                          >
                            <Text
                              style="subtitle3"
                              color="subtle"
                              css={{ mr: 'auto' }}
                            >
                              {fee.name}
                            </Text>
                            <Text style="subtitle3">{fee.usd}</Text>
                          </Flex>
                        )
                      })}
                    </Flex>
                  }
                >
                  <div>
                    <Flex align="center">
                      <Text style="subtitle3" color="subtle">
                        ({feeBreakdown?.totalFees.priceImpactPercentage})
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          width={16}
                          style={{ display: 'inline-block', marginLeft: 4 }}
                        />
                      </Text>
                    </Flex>
                  </div>
                </Tooltip>
              </Flex>
            ) : null}
          </Flex>
        </Flex>
        {isFetchingQuote ? (
          <Flex
            align="center"
            css={{ gap: 14, mb: '3', p: '3 0', m: '0 auto' }}
          >
            <LoadingSpinner css={{ height: 16, width: 16 }} />
            <Text style="subtitle2">Fetching the best price</Text>
          </Flex>
        ) : null}
        {feeBreakdown && !isFetchingQuote ? (
          <Box
            css={{
              borderRadius: 16,
              overflow: 'hidden',
              '--borderColor': 'colors.subtle-border-color',
              border: '1px solid var(--borderColor)',
              p: '3',
              mb: '3'
            }}
          >
            <Flex
              justify="between"
              css={{
                flexDirection: 'row',
                gap: '2',
                width: '100%'
              }}
            >
              <button
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  setRateMode(rateMode === 'input' ? 'output' : 'input')
                  e.preventDefault()
                }}
              >
                {rateMode === 'input' ? (
                  <Text style="subtitle2">
                    1 {fromToken?.symbol} ={' '}
                    {formatNumber(Number(swapRate) / 1, 5, compactSwapRate)}{' '}
                    {toToken?.symbol}
                  </Text>
                ) : (
                  <Text style="subtitle2">
                    1 {toToken?.symbol} ={' '}
                    {formatNumber(1 / Number(swapRate), 5, compactSwapRate)}{' '}
                    {fromToken?.symbol}
                  </Text>
                )}
              </button>

              <Flex
                css={{
                  gap: '2',
                  color:
                    timeEstimate.time <= 30
                      ? '{colors.green.9}'
                      : '{colors.amber.9}'
                }}
                align="center"
              >
                <FontAwesomeIcon icon={faClock} width={16} />
                <Text style="subtitle2">~ {timeEstimate.formattedTime}</Text>
                <Box css={{ width: 1, background: 'gray6', height: 20 }} />
                <FontAwesomeIcon
                  icon={faGasPump}
                  width={16}
                  style={{ color: '#C1C8CD' }}
                />
                <Text style="subtitle2">{originGasFee?.usd}</Text>
              </Flex>
            </Flex>
          </Box>
        ) : null}
        <WidgetErrorWell
          hasInsufficientBalance={hasInsufficientBalance}
          hasInsufficientSafeBalance={false}
          error={error}
          quote={quote as Execute}
          currency={fromToken}
          isHighRelayerServiceFee={highRelayerServiceFee}
          relayerFeeProportion={relayerFeeProportion}
          context="swap"
        />
        {isMounted && address ? (
          <Button
            css={{ justifyContent: 'center' }}
            aria-label="Swap"
            disabled={
              !quote ||
              hasInsufficientBalance ||
              isInsufficientLiquidityError ||
              steps !== null ||
              waitingForSteps ||
              Number(debouncedInputAmountValue) === 0 ||
              Number(debouncedOutputAmountValue) === 0 ||
              isSameCurrencySameRecipientSwap
            }
            onClick={swap}
          >
            {ctaCopy}
          </Button>
        ) : (
          <Button
            css={{ justifyContent: 'center' }}
            aria-label="Connect wallet"
            onClick={() => {
              if (!onConnectWallet) {
                throw 'Missing onWalletConnect function'
              }
              onConnectWallet()
              onAnalyticEvent?.(EventNames.CONNECT_WALLET_CLICKED, {
                context: 'bridge'
              })
            }}
          >
            Connect
          </Button>
        )}
        {isMounted ? (
          <SwapModal
            open={steps !== null}
            onOpenChange={(open) => {
              if (!open) {
                setSteps(null)
                setDetails(null)
                setSwapError(null)
              }
            }}
            fromToken={fromToken}
            toToken={toToken}
            error={swapError}
            steps={steps}
            details={details}
            fees={quote?.fees}
            address={address}
            onAnalyticEvent={onAnalyticEvent}
            onSuccess={onSwapSuccess}
          />
        ) : null}
        <CustomAddressModal
          open={addressModalOpen}
          onAnalyticEvent={onAnalyticEvent}
          onOpenChange={(open) => {
            setAddressModalOpen(open)
          }}
          onConfirmed={(address) => {
            setCustomToAddress(address)
          }}
          onClear={() => {
            setCustomToAddress(undefined)
          }}
        />
        {!providerOptionsContext.disablePoweredByReservoir && (
          <Flex
            align="center"
            css={{
              mx: 'auto',
              alignItems: 'center',
              justifyContent: 'center',
              pt: 12
            }}
          >
            <Text
              style="subtitle3"
              color="subtle"
              css={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                lineHeight: '12px',
                fontWeight: 400,
                color: 'text-subtle'
              }}
            >
              Powered by{' '}
              <Anchor
                href="https://reservoir.tools/"
                target="_blank"
                weight="heavy"
                color="gray"
                css={{
                  height: 12,
                  fontSize: 14,
                  fill: 'gray11',
                  _hover: { fill: 'gray12' }
                }}
              >
                <ReservoirText />
              </Anchor>
            </Text>
          </Flex>
        )}
      </Flex>
    </div>
  )
}

export default SwapWidget
