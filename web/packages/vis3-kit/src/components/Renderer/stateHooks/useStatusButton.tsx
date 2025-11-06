import styled from '@emotion/styled'
import { CheckboxOptionType, Radio, RadioChangeEvent } from "antd"
import { useCallback, useMemo, useState } from "react"

const RadioButton = styled(Radio.Button)`
  display: flex;
  justify-content: center;
  align-items: center;
`

const RadioGroup = styled(Radio.Group)`
  display: flex;
`

export default function useStatusButton(initialValue: string, options: CheckboxOptionType[]) {
  const [stateValue, setValue] = useState(initialValue)


  const handleOnChange = useCallback((e: RadioChangeEvent) => {
    setValue(e.target.value)
  }, [])

  const node = useMemo(() => {
    return (
      <RadioGroup defaultValue={initialValue} buttonStyle="solid" size="small" value={stateValue} onChange={handleOnChange}>
        {
          options?.map(item => {
            return (
              <RadioButton key={item.value} value={item.value}>{item.label}</RadioButton>
            )
          })
        }
      </RadioGroup>
    )
  }, [options, stateValue, initialValue, handleOnChange])

  return [node, stateValue]
}