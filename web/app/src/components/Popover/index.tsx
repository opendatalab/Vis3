import { Popover as HeadlessPopover, PopoverButton, PopoverPanel } from '@headlessui/react';
import clsx from 'clsx';
import React, { Fragment, useEffect, useRef, useState } from 'react';

export type PopoverTriggerType = 'click' | 'hover';

export interface PopoverProps {
  /**
   * 弹出层触发器
   */
  trigger: React.ReactNode;
  
  /**
   * 弹出层内容
   */
  children: React.ReactNode;
  
  /**
   * 弹出层位置
   * @default 'bottom'
   */
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  
  /**
   * 弹出层偏移量（以像素为单位）
   * @default 8
   */
  offset?: number;
  
  /**
   * 自定义面板类名
   */
  panelClassName?: string;
  
  /**
   * 自定义容器类名
   */
  className?: string;
  
  /**
   * 点击外部时是否关闭
   * @default true
   */
  closeOnClickOutside?: boolean;
  
  /**
   * 触发方式
   * @default 'click'
   */
  triggerMode?: PopoverTriggerType;
  
  /**
   * hover触发时的延迟（毫秒）
   * @default 200
   */
  hoverDelay?: number;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  placement = 'bottom',
  offset = 8,
  panelClassName,
  className,
  closeOnClickOutside = true,
  triggerMode: triggerType = 'click',
  hoverDelay = 100,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 根据位置计算面板样式
  const getPlacementStyles = () => {
    switch (placement) {
      case 'top':
        return `bottom-full left-1/2 -translate-x-1/2 mb-${offset / 4}`;
      case 'topLeft':
        return `bottom-full left-0 mb-${offset / 4}`;
      case 'topRight':
        return `bottom-full right-0 mb-${offset / 4}`;
      case 'right':
        return `left-full top-1/2 -translate-y-1/2 ml-${offset / 4}`;
      case 'left':
        return `right-full top-1/2 -translate-y-1/2 mr-${offset / 4}`;
      case 'bottomLeft':
        return `top-full left-0 mt-${offset / 4}`;
      case 'bottomRight':
        return `top-full right-0 mt-${offset / 4}`;
      case 'bottom':
      default:
        return `top-full left-1/2 -translate-x-1/2 mt-${offset / 4}`;
    }
  };

  // 面板样式
  const panelClasses = clsx(
    'absolute z-10 w-auto min-w-max bg-white rounded shadow-lg ring-1 ring-gray-100 ring-opacity-5 focus:outline-none',
    'transition ease-out duration-200',
    'data-[enter]:opacity-100 data-[leave]:opacity-0 data-[enter]:transform-none data-[leave]:scale-95',
    getPlacementStyles(),
    panelClassName
  );

  // 处理鼠标进入
  const handleMouseEnter = () => {
    if (triggerType === 'hover') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsOpen(true);
      }, hoverDelay);
    }
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    if (triggerType === 'hover') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, hoverDelay);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 处理点击外部事件
  useEffect(() => {
    if (!closeOnClickOutside || triggerType !== 'click') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeOnClickOutside, triggerType]);

  // 使用自定义事件处理hover触发方式
  if (triggerType === 'hover') {
    return (
      <div 
        ref={popoverRef}
        className={clsx('relative inline-block text-left', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div>
          {trigger}
        </div>
        
        {isOpen && (
          <div className={panelClasses}>
            {children}
          </div>
        )}
      </div>
    );
  }

  // 使用HeadlessUI的Popover组件处理click触发方式
  return (
    <HeadlessPopover as="div" className={clsx('relative inline-block text-left', className)} ref={popoverRef}>
      <PopoverButton as={Fragment}>
        {trigger}
      </PopoverButton>

      <PopoverPanel className={panelClasses}>
        {children}
      </PopoverPanel>
    </HeadlessPopover>
  );
};

export default Popover;
