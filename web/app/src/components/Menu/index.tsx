import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';

export interface MenuItemProps {
  label: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface MenuProps {
  trigger: React.ReactNode;
  items: MenuItemProps[];
  align?: 'left' | 'right';
  className?: string;
  buttonClassName?: string;
  itemsClassName?: string;
  /** 菜单的触发方式 */
  triggerMode?: 'click' | 'hover' | 'both';
  /** 悬浮触发时的延迟时间(ms) */
  hoverDelay?: number;
}

export const Menu: React.FC<MenuProps> = ({
  trigger,
  items,
  align = 'right',
  className,
  buttonClassName,
  itemsClassName,
  triggerMode = 'click',
  hoverDelay = 100,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const closeMenu = () => {
    setIsOpen(false);
  };

  const openMenu = () => {
    setIsOpen(true);
  };

  // 处理鼠标进入触发元素
  const handleMouseEnter = () => {
    if (triggerMode === 'hover' || triggerMode === 'both') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        openMenu();
      }, hoverDelay);
    }
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    if (triggerMode === 'hover' || triggerMode === 'both') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        // 只有当鼠标不在菜单上时才关闭
        if (!menuRef.current?.contains(document.activeElement)) {
          closeMenu();
        }
      }, hoverDelay);
    }
  };

  // 点击处理
  const handleClick = () => {
    if (triggerMode === 'click' || triggerMode === 'both') {
      setIsOpen(!isOpen);
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isOpen && 
          triggerRef.current && 
          !triggerRef.current.contains(event.target as Node) &&
          menuRef.current && 
          !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className={clsx('relative inline-block text-left', className)}>
      {/* 触发器 */}
      <div 
        ref={triggerRef}
        className={clsx('inline-flex w-full justify-center', buttonClassName)}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {trigger}
      </div>

      {/* 菜单内容 */}
      {isOpen && (
        <div 
          ref={menuRef}
          className={clsx(
            'absolute z-10 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-gray-100 ring-opacity-5 focus:outline-none',
            {
              'right-0': align === 'right',
              'left-0': align === 'left',
            },
            itemsClassName
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="py-1 cursor-pointer">
            {items.map((item, index) => (
              <div
                key={index}
                className={clsx(
                  'flex w-full items-center px-4 py-2 text-sm cursor-pointer',
                  {
                    'text-gray-700 hover:bg-gray-100 hover:text-gray-900': !item.disabled,
                    'opacity-50 cursor-not-allowed text-gray-500': item.disabled,
                  },
                  item.className
                )}
                onClick={() => {
                  if (!item.disabled && item.onClick) {
                    item.onClick();
                    closeMenu();
                  }
                }}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
