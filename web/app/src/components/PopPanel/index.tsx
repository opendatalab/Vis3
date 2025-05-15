import { CloseOutlined } from "@ant-design/icons"
import { Button } from "antd"
import { useEffect, useState } from "react"

export interface PopPanelProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title: string
  /** 面板宽度，默认400px */
  width?: number | string
  /** 与边界的距离配置 */
  offset?: {
    /** 与右侧边界的距离，默认24px */
    right?: number
    /** 与顶部的距离，默认0px */
    top?: number
    /** 与底部的距离，默认0px */
    bottom?: number
  }
}
  
export default function PopPanel({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  width = 400,
  offset = { right: 24, top: 0, bottom: 0 }
}: PopPanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // 合并默认offset值
  const finalOffset = {
    right: offset.right ?? 24,
    top: offset.top ?? 0,
    bottom: offset.bottom ?? 0
  }

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // 等待DOM更新后再添加动画类
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false);
      // 等待动画完成后再隐藏面板
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // 与CSS过渡时间匹配
      return () => clearTimeout(timer);
    }
  }, [isOpen])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* 添加半透明背景遮罩，点击时关闭面板 */}
      <div 
        className="absolute inset-0 bg-opacity-25 transition-opacity duration-300"
        style={{ opacity: isAnimating ? 1 : 0 }}
      />
      <div 
        className="absolute right-0 bg-white shadow-lg rounded-lg"
        style={{ 
          width: typeof width === 'number' ? `${width}px` : width,
          transform: isAnimating ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.9)',
          transformOrigin: 'right center',
          right: `${finalOffset.right}px`,
          top: finalOffset.top > 0 ? finalOffset.top : 0,
          bottom: finalOffset.bottom > 0 ? finalOffset.bottom : 0,
          height: finalOffset.top > 0 || finalOffset.bottom > 0 ? 'auto' : '100%',
          pointerEvents: 'auto',
          overflowY: 'auto',
          maxHeight: `calc(100vh - ${finalOffset.top + finalOffset.bottom}px)`,
          boxShadow: '-4px 0 15px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">{title}</h3>
          <Button 
            onClick={onClose} 
            type="text"
            size="small"
            icon={<CloseOutlined />}
          />
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
