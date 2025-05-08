import clsx from 'clsx';
import React from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square' | 'rounded';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 头像图片地址
   */
  src?: string;
  
  /**
   * 头像替代文字，也用于显示文字头像
   */
  alt?: string;
  
  /**
   * 头像尺寸
   * @default 'md'
   */
  size?: AvatarSize;
  
  /**
   * 头像形状
   * @default 'circle'
   */
  shape?: AvatarShape;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 图片加载失败时显示的内容
   */
  fallback?: React.ReactNode;
  
  /**
   * 头像的背景色
   */
  bgColor?: string;
  
  /**
   * 头像的文字颜色
   */
  textColor?: string;
  
  /**
   * 是否显示边框
   * @default false
   */
  bordered?: boolean;
  
  /**
   * 边框颜色
   * @default 'border-gray-200'
   */
  borderColor?: string;
  
  /**
   * 状态标记，小圆点显示在头像右下角
   */
  status?: 'online' | 'offline' | 'away' | 'busy' | 'none';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  size = 'md',
  shape = 'circle',
  className,
  fallback,
  bgColor,
  textColor,
  bordered = false,
  borderColor = 'border-gray-200',
  status = 'none',
  ...props
}) => {
  const [imgError, setImgError] = React.useState(false);
  
  // 头像尺寸样式映射
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };
  
  // 形状样式映射
  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-md',
  };
  
  // 状态样式映射
  const statusClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    none: 'hidden',
  };
  
  // 默认背景色 - 如果没有提供图片或背景色
  const defaultBgColor = bgColor || 'bg-gray-200';
  
  // 获取初始字母作为文字头像
  const getFirstLetter = () => {
    if (!alt) return '';
    return alt.charAt(0).toUpperCase();
  };
  
  // 处理图片加载错误
  const handleImgError = () => {
    setImgError(true);
  };
  
  return (
    <div 
      className={clsx(
        'relative inline-flex items-center justify-center overflow-hidden',
        sizeClasses[size],
        shapeClasses[shape],
        bordered && ['border-2', borderColor],
        className
      )}
      {...props}
    >
      {/* 图片头像 */}
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={handleImgError}
        />
      ) : fallback ? (
        // 自定义备用内容
        <div className={clsx('w-full h-full flex items-center justify-center', defaultBgColor)}>
          {fallback}
        </div>
      ) : (
        // 文字头像
        <div 
          className={clsx(
            'w-full h-full flex items-center justify-center font-medium',
            defaultBgColor,
            textColor || 'text-gray-700'
          )}
        >
          {getFirstLetter()}
        </div>
      )}
      
      {/* 状态标记 */}
      {status !== 'none' && (
        <span 
          className={clsx(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
            statusClasses[status],
            {
              'w-1.5 h-1.5': size === 'xs',
              'w-2 h-2': size === 'sm',
              'w-2.5 h-2.5': size === 'md',
              'w-3 h-3': size === 'lg',
              'w-3.5 h-3.5': size === 'xl',
            }
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
