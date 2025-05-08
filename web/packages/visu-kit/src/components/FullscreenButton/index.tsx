import { useCallback, useState } from 'react'

import FullscreenIn from '../../assets/full-screen-in.svg?react'
import FullscreenOut from '../../assets/full-screen-out.svg?react'

import BinaryButton from '../BinaryButton'

export interface FullScreenButtonProps {
  elementRef: React.RefObject<HTMLElement>
}

export default function FullScreenButton({ elementRef }: FullScreenButtonProps) {
  const [fullscreen, setFullscreen] = useState(false)

  const handleFullscreenChange = useCallback(() => {
    setFullscreen(!fullscreen)

    // 使元素在网页内全屏，而不是系统层面的全屏
    if (fullscreen) {
      try {
        document.exitFullscreen()
      }
      catch (error) {
        console.error('退出全屏失败:', error)
        // 即使退出全屏失败，也需要更新状态
        setFullscreen(false)
      }
    }
    else {
      try {
        requestFullScreen(elementRef.current as HTMLElement)
      }
      catch (error) {
        console.error('进入全屏失败:', error)
        // 如果进入全屏失败，恢复状态
        setFullscreen(false)
      }
    }
  }, [fullscreen, elementRef])

  return (
    <BinaryButton activated={fullscreen} onTitle="退出全屏" offTitle="全屏" onIcon={<FullscreenIn />} offIcon={<FullscreenOut />} onChange={handleFullscreenChange} />
  )
}

// 从 FieldRenderer 组件复制的功能，用于请求元素全屏
function requestFullScreen(element: HTMLElement) {
  if (!element) { return }

  if (element.requestFullscreen) {
    element.requestFullscreen()
  }
  else if ((element as any).mozRequestFullScreen) {
    /* Firefox */
    (element as any).mozRequestFullScreen()
  }
  else if ((element as any).webkitRequestFullscreen) {
    /* Chrome, Safari and Opera */
    (element as any).webkitRequestFullscreen()
  }
  else if ((element as any).msRequestFullscreen) {
    /* IE/Edge */
    (element as any).msRequestFullscreen()
  }
}
