import { useCallback, useMemo, useState } from 'react'

import EyeCloseIcon from '../../../assets/eye-close.svg?react'
import EyeOpenIcon from '../../../assets/eye-open.svg?react'
import { useTranslation } from '../../../i18n'
import BinaryButton from '../../BinaryButton'

export default function usePreview(initialPreview = true, onPreview?: (changedValue: boolean) => void): [React.ReactNode, { preview: boolean }, (preview: boolean) => void] {
  const [preview, setPreview] = useState(initialPreview)
  const { t } = useTranslation()

  const handleOnChange = useCallback((changedValue: boolean) => {
    setPreview(changedValue)
    onPreview?.(changedValue)
  }, [onPreview])

  const previewButton = useMemo(() => (
    <BinaryButton activated={preview} onTitle={t('renderer.closePreview')} offTitle={t('renderer.openPreview')} onIcon={<EyeOpenIcon />} offIcon={<EyeCloseIcon />} onChange={handleOnChange} />
  ), [preview, handleOnChange, t])

  const state = useMemo(() => ({ preview }), [preview])

  return [previewButton, state, handleOnChange]
}
