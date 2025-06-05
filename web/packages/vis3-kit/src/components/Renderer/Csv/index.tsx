import styled from '@emotion/styled'
import { Table } from 'antd'
import { useMemo, useRef } from 'react'

import { parseCsv } from '../../../utils'
import FullScreenButton from '../../FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

export default function CsvCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  const { headers, data } = useMemo(() => {
    return parseCsv(value)
  }, [value])

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
        scroll={{ x: 1200 }}
        columns={headers.map(item => ({
          title: item,
          dataIndex: item,
          width: 900,
          key: item,
        }))}
        dataSource={data}
      />
    </RenderCard>
  )
}
