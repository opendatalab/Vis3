import { LoadingOutlined } from '@ant-design/icons'
import { Spin } from 'antd'
import clsx from 'clsx'

export type LoadingProps = React.PropsWithChildren<{
  className?: string
  style?: React.CSSProperties
  loading?: boolean
}>

export default function Loading({ loading, children, className, style }: LoadingProps) {
  return (
    <div className={clsx('relative', className)} style={style}>
      {children}
      <Spin
        spinning={loading}
        indicator={<LoadingOutlined spin />}
        rootClassName={clsx('absolute flex items-center justify-center inset-0 bg-white/50 backdrop-blur-sm', {
          block: loading,
          hidden: !loading,
        })}
        style={{ height: '100%' }}
      />
    </div>
  )
}
