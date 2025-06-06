import { useTranslation } from '@vis3/i18n'
import { useMemo, useState } from 'react'

import LineWrapIcon from '../../../assets/line-wrap.svg?react'
import BinaryButton from '../../../components/BinaryButton'

export default function useWrap(initialWrap = false): [React.ReactNode, { wrap: boolean }, (wrap: boolean) => void] {
  const [wrap, setWrap] = useState(initialWrap)
  const { t } = useTranslation()
  
  const finalWrap = wrap ?? false
  const node = useMemo(() => (
    <BinaryButton activated={finalWrap} onTitle={t('renderer.cancelLineWrap')} offTitle={t('renderer.lineWrap')} onIcon={<LineWrapIcon />} offIcon={<LineWrapIcon />} onChange={setWrap} />
  ), [finalWrap, t])

  const state = useMemo(() => ({ wrap: finalWrap }), [finalWrap])

  return [node, state, setWrap]
}
