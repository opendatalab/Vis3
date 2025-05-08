import { useCallback, useMemo, useState } from 'react'

import EyeCloseIcon from '../../../assets/eye-close.svg?react'
import EyeOpenIcon from '../../../assets/eye-open.svg?react'
import BinaryButton from '../../../components/BinaryButton'

export default function usePreview(initialPreview = true, onPreview?: (changedValue: boolean) => void): [React.ReactNode, { preview: boolean }, (preview: boolean) => void] {
  const [preview, setPreview] = useState(initialPreview)

  const handleOnChange = useCallback((changedValue: boolean) => {
    setPreview(changedValue)
    onPreview?.(changedValue)
  }, [onPreview])

  const node = useMemo(() => (
    <BinaryButton activated={preview} onTitle="关闭预览" offTitle="预览" onIcon={<EyeOpenIcon />} offIcon={<EyeCloseIcon />} onChange={handleOnChange} />
  ), [preview, handleOnChange])

  const state = useMemo(() => ({ preview }), [preview])

  return [node, state, handleOnChange]
}
