import { Table } from 'antd'
import { useMemo, useRef } from 'react'

import FullScreenButton from '../../../components/FullscreenButton'
import { parseCsv } from '../../../utils'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'

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
        <div className="flex gap-2 items-center">
          <FullScreenButton elementRef={ref} />
          {extraTail}
        </div>
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
