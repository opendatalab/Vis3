import { css, SerializedStyles } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';
import { useTheme } from '../../theme';
import tokens from '../../theme/tokens';

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

interface StyledButtonProps {
  $size: ButtonSize;
  $variant: ButtonVariant;
  $fullWidth: boolean;
  $isIconOnly: boolean;
}

// 使用主题的基础按钮样式
const getBaseButtonStyles = ({ theme }: { theme: any }) => css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme?.borderRadius?.DEFAULT || tokens.borderRadius.DEFAULT};
  font-weight: ${theme?.typography?.fontWeight?.medium || tokens.typography.fontWeight.medium};
  transition: colors 0.2s ease;
  cursor: pointer;
  
  &:focus {
    outline: none;
  }
  
  &:focus-visible {
    ring: 2px;
    ring-offset: 2px;
  }
  
  &:disabled {
    cursor: not-allowed;
  }
`;

// 使用主题的尺寸样式
const getSizeStyles = (size: ButtonSize, { theme }: { theme: any }): SerializedStyles => {
  const buttonTokens = theme?.components?.button || tokens.components.button;
  
  return css`
    padding: ${buttonTokens.size[size].padding};
    font-size: ${buttonTokens.size[size].fontSize};
  `;
};

// 使用主题的图标尺寸样式
const getIconSizeStyles = (size: ButtonSize, { theme }: { theme: any }): SerializedStyles => {
  const buttonTokens = theme?.components?.button || tokens.components.button;
  
  return css`
    padding: ${buttonTokens.size[size].iconPadding};
  `;
};

// 使用主题的变体样式
const getVariantStyles = (variant: ButtonVariant, { theme }: { theme: any }): SerializedStyles => {
  const buttonTokens = theme?.components?.button || tokens.components.button;
  const variantToken = buttonTokens.variant[variant];
  
  if (variant === 'link') {
    return css`
      background-color: ${variantToken.background};
      color: ${variantToken.color};
      text-decoration: ${variantToken.textDecoration};
      padding: ${variantToken.padding};
      
      &:hover:not(:disabled) {
        color: ${variantToken.hoverColor};
      }
      
      &:active:not(:disabled) {
        color: ${variantToken.activeColor};
      }
      
      &:disabled {
        color: ${variantToken.disabledColor};
      }
      
      &:focus-visible {
        ring-color: ${variantToken.focusRingColor};
        ring-offset: 0;
      }
    `;
  }
  
  if (variant === 'outline') {
    return css`
      background-color: ${variantToken.background};
      border: ${variantToken.border};
      color: ${variantToken.color};
      
      &:hover:not(:disabled) {
        background-color: ${variantToken.hoverBackground};
      }
      
      &:active:not(:disabled) {
        background-color: ${variantToken.activeBackground};
      }
      
      &:disabled {
        color: ${variantToken.disabledColor};
      }
      
      &:focus-visible {
        ring-color: ${variantToken.focusRingColor};
      }
    `;
  }
  
  if (variant === 'ghost') {
    return css`
      background-color: ${variantToken.background};
      color: ${variantToken.color};
      
      &:hover:not(:disabled) {
        background-color: ${variantToken.hoverBackground};
      }
      
      &:active:not(:disabled) {
        background-color: ${variantToken.activeBackground};
      }
      
      &:disabled {
        color: ${variantToken.disabledColor};
      }
      
      &:focus-visible {
        ring-color: ${variantToken.focusRingColor};
      }
    `;
  }
  
  // 默认按钮样式 (primary, secondary, danger)
  return css`
    background-color: ${variantToken.background};
    color: ${variantToken.color};
    
    &:hover:not(:disabled) {
      background-color: ${variantToken.hoverBackground};
    }
    
    &:active:not(:disabled) {
      background-color: ${variantToken.activeBackground};
    }
    
    &:disabled {
      background-color: ${variantToken.disabledBackground};
      ${variantToken.disabledColor ? `color: ${variantToken.disabledColor};` : ''}
    }
    
    &:focus-visible {
      ring-color: ${variantToken.focusRingColor};
    }
  `;
};

// 创建styled button组件
const StyledButton = styled.button<StyledButtonProps>`
  ${getBaseButtonStyles}
  ${({ $variant, $isIconOnly, $size, theme }) => 
    $variant === 'link' ? null : ($isIconOnly ? getIconSizeStyles($size, { theme }) : getSizeStyles($size, { theme }))}
  ${({ $variant, theme }) => getVariantStyles($variant, { theme })}
  
  ${({ $fullWidth }) => $fullWidth && css`
    width: 100%;
  `}
`;

// 创建styled anchor组件
const StyledAnchor = styled.a<StyledButtonProps>`
  ${getBaseButtonStyles}
  ${({ $variant, $isIconOnly, $size, theme }) => 
    $variant === 'link' ? null : ($isIconOnly ? getIconSizeStyles($size, { theme }) : getSizeStyles($size, { theme }))}
  ${({ $variant, theme }) => getVariantStyles($variant, { theme })}
  
  ${({ $fullWidth }) => $fullWidth && css`
    width: 100%;
  `}
  
  text-decoration: none;
`;

// 图标容器样式
const LeftIconWrapper = styled.span`
  margin-right: ${({ theme }) => theme?.spacing?.[2] || tokens.spacing[2]};
`;

const RightIconWrapper = styled.span`
  margin-left: ${({ theme }) => theme?.spacing?.[2] || tokens.spacing[2]};
`;

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
  // 获取主题
  const { tokens: themeTokens } = useTheme();
  
  // 按钮内容
  const buttonContent = (
    <>
      {leftIcon && <LeftIconWrapper>{leftIcon}</LeftIconWrapper>}
      {icon && !children ? icon : children}
      {rightIcon && <RightIconWrapper>{rightIcon}</RightIconWrapper>}
    </>
  );

  // 确定是否为仅图标按钮
  const isIconOnly = Boolean(icon && !children);
  
  // 确定是否渲染为链接
  const isLink = href && !disabled;
  
  // 如果是链接
  if (isLink) {
    const finalRel = target === '_blank' ? 'noopener noreferrer' : rel;
    
    return (
      <StyledAnchor 
        href={href}
        target={target}
        rel={finalRel}
        className={className}
        $size={size}
        $variant={variant}
        $fullWidth={fullWidth}
        $isIconOnly={isIconOnly}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {buttonContent}
      </StyledAnchor>
    );
  }
  
  // 如果是按钮
  return (
    <StyledButton
      disabled={disabled}
      className={className}
      $size={size}
      $variant={variant}
      $fullWidth={fullWidth}
      $isIconOnly={isIconOnly}
      {...props}
    >
      {buttonContent}
    </StyledButton>
  );
};

export default Button;
