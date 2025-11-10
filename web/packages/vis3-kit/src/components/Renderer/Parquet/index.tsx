import styled from '@emotion/styled'
import { Table, Tag } from 'antd'
import { useMemo, useRef } from 'react'

import FullScreenButton from '../../FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

interface ParquetResponse {
  schema: {
    name: string
    type: string
  }[]
  rows: Record<string, any>[]
  total_rows: number
}

export default function ParquetCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const parsedValue: ParquetResponse = useMemo(() => {
    if (typeof value === 'object') {
      return value
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch (e) {
        return {}
      }
    }

    return {}
  }, [value])

  const columns = useMemo(() => {
    return parsedValue?.schema?.map(field => {
      return {
        dataIndex: field.name,
        title: <div>{field.name}<br /><Tag>{field.type}</Tag></div>,
        type: field.type,
        key: field.name,
        render: (value: any) => {
          if (typeof value === 'object') {
            return <code><pre>{JSON.stringify(value, null, 2)}</pre></code>
          }

          return value
        }
      }
    })
  }, [parsedValue])

  const dataSource = useMemo(() => {
    return parsedValue.rows ?? []
  }, [parsedValue])

  const pagination = useMemo(() => {
    return {
      pageSize: 20,
      hideOnSinglePage: true,
    }
  }, [parsedValue])

  return (
    <RenderCard
      ref={ref}
      className={className}
      titleExtra={titleExtra}
      name={name}
      extra={(
        <ExtraContainer>
          <FullScreenButton elementRef={ref} />
          {extraTail}
        </ExtraContainer>
      )}
    >
      <Table
        size="small"
        columns={columns}
        pagination={pagination}
        dataSource={dataSource}
        footer={parsedValue?.total_rows ? () => <div>共{parsedValue.total_rows}行</div> : undefined}
      />
    </RenderCard>
  )
}
