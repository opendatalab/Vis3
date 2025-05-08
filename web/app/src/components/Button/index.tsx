import { Button as HeadlessButton } from '@headlessui/react';
import clsx from 'clsx';
import React from 'react';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮尺寸
   * @default 'md'
   */
  size?: ButtonSize;
  
  /**
   * 按钮风格变体
   * @default 'primary'
   */
  variant?: ButtonVariant;
  
  /**
   * 按钮内容
   */
  children?: React.ReactNode;
  
  /**
   * 是否为全宽按钮
   * @default false
   */
  fullWidth?: boolean;
  
  /**
   * 按钮左侧图标
   */
  leftIcon?: React.ReactNode;
  
  /**
   * 按钮右侧图标
   */
  rightIcon?: React.ReactNode;
  
  /**
   * 当按钮仅包含图标时使用
   */
  icon?: React.ReactNode;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 链接地址，当提供时按钮将作为链接呈现
   */
  href?: string;
  
  /**
   * 链接打开方式
   * @default '_self'
   */
  target?: string;
  
  /**
   * rel属性，当target="_blank"时自动设置为"noopener noreferrer"
   */
  rel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  size = 'md',
  variant = 'primary',
  children,
  fullWidth = false,
  leftIcon,
  rightIcon,
  icon,
  className,
  disabled,
  href,
  target = '_self',
  rel,
  ...props
}) => {
  // 按钮尺寸样式映射
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-2.5 text-lg',
  };

  // 图标按钮尺寸样式映射
  const iconSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  // 按钮变体样式映射
  const variantClasses = {
    primary: 'bg-blue-600 text-white data-[hover]:bg-blue-500 data-[active]:bg-blue-700 data-[disabled]:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-800 data-[hover]:bg-gray-300 data-[active]:bg-gray-400 data-[disabled]:bg-gray-100 data-[disabled]:text-gray-400',
    outline: 'bg-transparent border border-gray-300 text-gray-700 data-[hover]:bg-gray-50 data-[active]:bg-gray-100 data-[disabled]:text-gray-300',
    ghost: 'bg-transparent text-gray-700 data-[hover]:bg-gray-100 data-[active]:bg-gray-200 data-[disabled]:text-gray-300',
    danger: 'bg-red-600 text-white data-[hover]:bg-red-500 data-[active]:bg-red-700 data-[disabled]:bg-red-300',
    link: 'bg-transparent text-blue-600 underline px-0 py-0 data-[hover]:text-blue-700 data-[active]:text-blue-800 data-[disabled]:text-blue-300',
  };

  // 组合所有样式
  const buttonClasses = clsx(
    // 基础样式
    'inline-flex items-center justify-center rounded font-medium transition-colors cursor-pointer',
    'focus:outline-none data-[focus]:ring-2 data-[focus]:ring-offset-2',
    
    // 变体样式
    variantClasses[variant],
    
    // 变体特定的focus ring颜色
    variant === 'primary' && 'data-[focus]:ring-sky-500',
    variant === 'secondary' && 'data-[focus]:ring-gray-400',
    variant === 'outline' && 'data-[focus]:ring-gray-400',
    variant === 'ghost' && 'data-[focus]:ring-gray-400',
    variant === 'danger' && 'data-[focus]:ring-red-500',
    variant === 'link' && 'data-[focus]:ring-sky-400 data-[focus]:ring-offset-0',
    
    // 链接样式特殊调整
    variant === 'link' && 'py-0',
    
    // 尺寸样式（link 变体不应用 padding）
    icon && !children ? iconSizeClasses[size] : sizeClasses[size],
    
    // 全宽样式
    fullWidth && 'w-full',
    
    // 禁用样式
    disabled && 'cursor-not-allowed',
    
    // 自定义样式
    className
  );

  // 按钮内容
  const buttonContent = (
    <>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {icon && !children ? icon : children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </>
  );

  // 确定是否渲染为链接
  const isLink = href && !disabled;
  
  // 如果是链接
  if (isLink) {
    const finalRel = target === '_blank' ? 'noopener noreferrer' : rel;
    
    return (
      <a 
        href={href}
        target={target}
        rel={finalRel}
        className={buttonClasses}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {buttonContent}
      </a>
    );
  }
  
  // 如果是按钮
  return (
    <HeadlessButton
      as="button"
      disabled={disabled}
      className={buttonClasses}
      {...props}
    >
      {buttonContent}
    </HeadlessButton>
  );
};

export default Button;
