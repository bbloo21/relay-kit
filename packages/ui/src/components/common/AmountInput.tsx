import type { ComponentPropsWithoutRef, FC } from 'react'
import { Input } from '../primitives'

type Props = {
  value: string
  setValue: (value: string) => void
} & ComponentPropsWithoutRef<typeof Input>

const AmountInput: FC<Props> = ({ value, setValue, ...inputProps }) => {
  return (
    <Input
      {...inputProps}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      pattern="^[0-9]+(\.[0-9]*)?$"
      ellipsify
      size="large"
      className="ph-no-capture"
      css={{
        width: '100%',
        background: 'none',
        backgroundColor: 'transparent',
        fontWeight: '600',
        fontSize: 32,
        paddingLeft: '0 !important',
        py: '1',
        _focus: {
          boxShadow: 'none',
          outline: 'none'
        },
        _placeholder: {
          color: 'gray12'
        },
        ...inputProps.css
      }}
      placeholder="0"
      value={value}
      onChange={(e) => {
        const inputValue = e.target.value
        const regex = /^[0-9]+(\.[0-9]*)?$/
        if (inputValue === '.' || inputValue.includes(',')) {
          setValue('0.')
        } else if (regex.test(inputValue) || inputValue === '') {
          setValue(inputValue)
        }
      }}
    />
  )
}

export default AmountInput
