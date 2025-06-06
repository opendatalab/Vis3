import { DownOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import { i18n } from '@vis3/i18n'
import { Divider, Dropdown, type MenuProps } from 'antd'
import { useMemo, useState } from 'react'
export type RenderType = 'raw' | 'image' | 'html' | 'json' | 'markdown' | 'content_list' | 'img_list'

const renderOptions = [
  {
    key: 'raw',
    label: i18n.t('renderer.raw'),
    value: 'raw',
  },
  {
    key: 'image',
    label: i18n.t('renderer.image'),
    value: 'image',
  },
  {
    key: 'html',
    label: i18n.t('renderer.html'),
    value: 'html',
  },
  {
    key: 'json',
    label: i18n.t('renderer.json'),
    value: 'json',
  },
  {
    key: 'markdown',
    label: i18n.t('renderer.markdown'),
    value: 'markdown',
  },
  {
    type: 'divider',
  },
  // build_in_fields
  {
    key: 'content_list',
    label: i18n.t('renderer.contentList'),
    value: 'content_list',
  },
  {
    key: 'img_list',
    label: i18n.t('renderer.imgList'),
    value: 'img_list',
  },
]

const StyledRenderTrigger = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  
`

export default function useRenderType(initialRenderType: RenderType = 'raw'): [React.ReactNode, { renderType: RenderType | undefined }] {
  const [renderType, setRenderType] = useState<RenderType | undefined>(initialRenderType)

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
