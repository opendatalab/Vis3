import { useMemo, useState } from 'react'

import LineWrapIcon from '../../../assets/line-wrap.svg?react'
import BinaryButton from '../../../components/BinaryButton'

export default function useWrap(parentWrap?: boolean): [React.ReactNode, { wrap: boolean | undefined }] {
  const [wrap, setWrap] = useState<boolean | undefined>(undefined)
  const finalWrap = wrap ?? parentWrap ?? false

  const node = useMemo(() => (
    <BinaryButton activated={finalWrap} onTitle="取消换行" offTitle="换行" onIcon={<LineWrapIcon />} offIcon={<LineWrapIcon />} onChange={setWrap} />
  ), [finalWrap])

  const state = useMemo(() => ({ wrap }), [wrap])

  return [node, state]
}
