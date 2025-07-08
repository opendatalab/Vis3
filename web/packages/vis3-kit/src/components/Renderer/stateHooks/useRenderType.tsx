import { DownOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import { Divider, Dropdown, type MenuProps } from 'antd'
import { useMemo, useState } from 'react'
export type RenderType = 'raw' | 'image' | 'html' | 'json' | 'markdown' | 'content_list' | 'img_list'

import { getRenders } from '../textRender'

const StyledRenderTrigger = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  
`

export default function useRenderType(initialRenderType: RenderType = 'raw'): [React.ReactNode, { renderType: RenderType | undefined }] {
  const [renderType, setRenderType] = useState<RenderType | undefined>(initialRenderType)

  const renderOptions = getRenders().map(item => ({
    key: item.name,
    label: item.label,
    value: item.name,
  }))

  const dropdownMenu: MenuProps = useMemo(() => ({
    items: renderOptions as MenuProps['items'],
    onClick: ({ key }) => {
      setRenderType(key as RenderType)
    },
    selectedKeys: [renderType ?? 'raw'],
  }), [renderType])

  const node = useMemo(() => {
    return (
      <>
        <Divider type="vertical" />
        <Dropdown menu={dropdownMenu}>
          <StyledRenderTrigger>
            {renderOptions.find(item => item.value === renderType)?.label}
            <DownOutlined />
          </StyledRenderTrigger>
        </Dropdown>
      </>
    )
  }, [dropdownMenu, renderType])

  const state = useMemo(() => ({
    renderType,
  }), [renderType])

  return [node, state]
}
