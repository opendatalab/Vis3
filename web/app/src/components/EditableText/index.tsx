import { CheckOutlined, CloseOutlined, FormOutlined } from '@ant-design/icons'
import { Button, Input, Space, Tooltip } from 'antd'
import type { InputProps } from 'antd/lib'
import { useCallback, useMemo, useState } from 'react'

export interface EditableTextProps extends Omit<InputProps, 'onChange'> {
  value: string
  onChange?: (value: string) => void
  onEditableChange?: (status: boolean) => void
}

export default function EditableText({ value, onChange, onEditableChange }: EditableTextProps) {
  const [editable, setEditable] = useState(false)
  const [stateValue, setStateValue] = useState(value)

  const handleEditableChange = useCallback((status: boolean) => {
    onEditableChange?.(status)
    setEditable(status)
  }, [onEditableChange])

  const displayValue = useMemo(() => {
    if (typeof value !== 'string') {
      return ''
    }

    if (!editable) {
      return <Tooltip title={value}><span className="text-ellipsis max-w-[120px] overflow-hidden">{value}</span></Tooltip>
    }

    return (
      <Space.Compact className="w-full">
        <Input
          value={stateValue}
          onChange={e => setStateValue(e.target.value)}
          onPressEnter={async () => {
            await onChange?.(stateValue)
            handleEditableChange(false)
          }}
        />
        <Button
          className="!text-[var(--color-success)]"
          
          icon={<CheckOutlined />}
          onClick={async () => {
            await onChange?.(stateValue)
            handleEditableChange(false)
          }}
        />
        <Button
          icon={<CloseOutlined />}
          onClick={() => {
            handleEditableChange(false)
          }}
        />
      </Space.Compact>
    )
  }, [editable, handleEditableChange, onChange, stateValue, value])

  const handleOnClick = () => {
    handleEditableChange(!editable)
  }

  return (
    <div className="flex items-center gap-2">
      {displayValue}
      {
        !editable && (
          <Button
            type="text"
            size="small"
            icon={<FormOutlined />}
            onClick={handleOnClick}
          />
        )
      }
    </div>
  )
}
