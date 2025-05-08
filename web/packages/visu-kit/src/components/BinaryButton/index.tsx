import type { TooltipProps } from 'antd'
import { Button, Tooltip } from 'antd'
import type { ForwardedRef } from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'

export interface BinaryButtonProps {
  activated: boolean
  onChange?: (activated: boolean) => void
  title?: string
  onTitle?: string
  offTitle?: string
  icon?: React.ReactNode
  placement?: TooltipProps['placement']
  onIcon?: React.ReactNode
  offIcon?: React.ReactNode
  btnRef?: ForwardedRef<BinaryButtonRef>
}

export interface BinaryButtonRef {
  setActivated: (activated: boolean) => void
}

function InnerBinaryButton({ btnRef, activated: propsActivated, onChange, title, onTitle, offTitle, icon, placement, onIcon, offIcon }: BinaryButtonProps) {
  const [activated, setActivated] = useState(propsActivated)

  useImperativeHandle(btnRef, () => ({
    setActivated,
  }))

  useEffect(() => {
    setActivated(propsActivated)
  }, [propsActivated])

  const handleOnChange = useCallback((value: boolean) => {
    setActivated(value)
    onChange?.(value)
  }, [onChange])

  const finalIcon = useMemo(() => {
    if (onIcon && offIcon) {
      return activated ? onIcon : offIcon
    }

    return icon
  }, [activated, onIcon, offIcon, icon])

  const finalTitle = useMemo(() => {
    if (onTitle && offTitle) {
      return activated ? onTitle : offTitle
    }

    return title
  }, [activated, onTitle, offTitle, title])

  return (
    <Tooltip title={finalTitle} placement={placement}>
      <Button size="small" type={activated ? 'primary' : 'text'} onClick={() => handleOnChange(!activated)} icon={finalIcon} />
    </Tooltip>
  )
}

const ForwardedBinaryButton = forwardRef(InnerBinaryButton)

ForwardedBinaryButton.displayName = 'BinaryButton'

export default ForwardedBinaryButton
