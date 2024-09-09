import { useState, type Dispatch, type FC, type ReactNode } from 'react'
import { CustomAddressModal } from '../common/CustomAddressModal.js'
import { SwapModal } from '../common/TransactionModal/SwapModal.js'
import { useMounted } from '../../hooks/index.js'
import type { ChildrenProps } from './SwapWidgetRenderer.js'
import type { Execute } from '@reservoir0x/relay-sdk'
import type { RelayChain } from '@reservoir0x/relay-sdk'

export type WidgetContainerProps = {
  transactionModalOpen: boolean
  isSvmSwap: boolean
  toChain?: RelayChain
  setTransactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  children: (props: WidgetChildProps) => ReactNode
  onSwapModalOpenChange: (open: boolean) => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onSwapSuccess?: (data: Execute) => void
  invalidateBalanceQueries: () => void
} & Pick<
  ChildrenProps,
  | 'fromToken'
  | 'toToken'
  | 'amountInputValue'
  | 'amountOutputValue'
  | 'debouncedInputAmountValue'
  | 'debouncedOutputAmountValue'
  | 'recipient'
  | 'customToAddress'
  | 'tradeType'
  | 'swapError'
  | 'price'
  | 'address'
  | 'setCustomToAddress'
  | 'useExternalLiquidity'
  | 'timeEstimate'
>

export type WidgetChildProps = {
  addressModalOpen: boolean
  setAddressModalOpen: Dispatch<React.SetStateAction<boolean>>
}

const WidgetContainer: FC<WidgetContainerProps> = ({
  transactionModalOpen,
  setTransactionModalOpen,
  children,
  fromToken,
  toToken,
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  amountInputValue,
  amountOutputValue,
  tradeType,
  customToAddress,
  swapError,
  price,
  address,
  useExternalLiquidity,
  timeEstimate,
  recipient,
  isSvmSwap,
  toChain,
  onSwapModalOpenChange,
  onSwapSuccess,
  onAnalyticEvent,
  invalidateBalanceQueries,
  setCustomToAddress
}) => {
  const isMounted = useMounted()
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  return (
    <div className="relay-kit-reset">
      {children({
        addressModalOpen,
        setAddressModalOpen
      })}
      {isMounted ? (
        <SwapModal
          open={transactionModalOpen}
          onOpenChange={(open) => {
            onSwapModalOpenChange(open)
            setTransactionModalOpen(open)
          }}
          fromToken={fromToken}
          toToken={toToken}
          amountInputValue={amountInputValue}
          amountOutputValue={amountOutputValue}
          debouncedInputAmountValue={debouncedInputAmountValue}
          debouncedOutputAmountValue={debouncedOutputAmountValue}
          tradeType={tradeType}
          useExternalLiquidity={useExternalLiquidity}
          address={address}
          recipient={recipient}
          isCanonical={useExternalLiquidity}
          timeEstimate={timeEstimate}
          onAnalyticEvent={onAnalyticEvent}
          onSuccess={onSwapSuccess}
          invalidateBalanceQueries={invalidateBalanceQueries}
        />
      ) : null}
      <CustomAddressModal
        open={addressModalOpen}
        toAddress={customToAddress ?? address}
        isSvmSwap={isSvmSwap}
        toChain={toChain}
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
    </div>
  )
}

export default WidgetContainer
