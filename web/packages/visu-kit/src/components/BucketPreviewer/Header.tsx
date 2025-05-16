import {
  ArrowUpOutlined,
  CopyOutlined,
  RightOutlined,
  SearchOutlined
} from '@ant-design/icons';
import styled from '@emotion/styled';
import { useIsFetching } from '@tanstack/react-query';
import type { MenuProps } from 'antd';
import { Button, Dropdown, message, Tooltip } from 'antd';
import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Theme } from '@emotion/react';
import { useTranslation } from '@visu/i18n';
import { bucketKey } from '../../queries/bucket.key';
import queryClient from '../../queries/queryClient';
import { useTheme } from '../../theme';
import { PAGENATION_CHANGE_EVENT, PATH_CORRECTION_EVENT } from '../Renderer/Block';
import { useBucketContext } from './context';
import styles from './index.module.css';

const RightIcon = styled(RightOutlined)`
  color: #d1d5db; /* gray-300 */
  font-size: 12px;
`

export interface InputValues {
  path: string
}

interface PathFragmentProps {
  fragment: string
  path: string
  hideArrow?: boolean
  clickable?: boolean
  onClick?: (e: React.MouseEvent) => void
}

const FragmentContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
`

const FragmentItem = styled.div<{ $clickable?: boolean }>`
  padding: 0.125rem 0.25rem;
  ${props => props.$clickable && `
    cursor: pointer;
    transition-duration: 100ms;
    &:hover {
      background-color: rgb(239 246 255); /* blue-50 */
      color: rgb(59 130 246); /* blue-500 */
    }
    border-radius: 0.25rem;
  `}
  ${props => !props.$clickable && `
    cursor: text;
  `}
`

function PathFragment({ fragment, hideArrow, clickable = true, onClick }: PathFragmentProps) {
  const { path = '', onParamsChange } = useBucketContext()

  const handleFragmentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const fullPath = `s3://${path}${path.endsWith('/') ? '' : '/'}`
    queryClient.removeQueries({
      queryKey: bucketKey.detail(fullPath),
    })

    onParamsChange?.({ path: fullPath, pageNo: 1 })
    document.dispatchEvent(new CustomEvent(PAGENATION_CHANGE_EVENT, { detail: { pageNo: 1 } }))
  }, [onParamsChange, path])

  return (
    <FragmentContainer>
      {!hideArrow && <RightIcon />}
      <FragmentItem
        $clickable={clickable}
        onClick={clickable ? onClick ?? handleFragmentClick : undefined}
      >
        {fragment}
      </FragmentItem>
    </FragmentContainer>
  )
}

interface PathContainerRef {
  toggleFocus: (value: boolean) => void
  getInputValue: () => string
  submit: () => void
}

interface PathContainerProps {
  containerRef: React.RefObject<PathContainerRef>
}

interface PathFragmentState {
  fragment: string
  path: string
}

const PathInput = styled.input`
  width: 100%;
  border-radius: 0;
  border: 0;
  box-shadow: none !important;
  background-color: transparent;
  outline: none;
  padding: 0 0.5rem;
`

const PathContainerDiv = styled.div<{ $focused: boolean; $path: string }>`
  ${props => !props.$focused ? `
    visibility: visible;
  ` : `
    visibility: hidden;
    position: absolute;
    z-index: -1;
  `}
  ${props => !props.$path && `
    visibility: hidden;
    position: absolute;
    z-index: -1;
  `}
  display: flex;
  align-items: center;
  flex: 1;
  cursor: text;
  overflow: auto;
  width: 0;
  margin-left: 0.25rem;
`

const FlexItems = styled.div`
  display: flex;
  align-items: center;
`

const ShortcutItem = styled.div`
  &:hover {
    background-color: rgb(239 246 255); /* blue-50 */
    color: rgb(59 130 246); /* blue-500 */
  }
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  cursor: pointer;
  border-radius: 0.25rem;
  transition-duration: 100ms;
`

const PathContainerShadow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  flex: 1;
  overflow: auto;
  min-width: 0;
  visibility: hidden;
  z-index: -1;
`

const PathForm = styled.div<{ $focused: boolean; $path: string }>`
  position: relative;
  flex: 1;
  ${props => props.$focused || !props.$path ? `
    visibility: visible;
  ` : `
    visibility: hidden;
    position: absolute;
    z-index: -1;
  `}
`

const ErrorMessage = styled.div<{ theme: Theme }>`
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  font-size: 14px;
  color: ${props => props.theme.colors.danger[600]};
`

function extractPath(path: string) {
  const _fragments = path.replace(/^s3:\/\//, '').split('/')
  return _fragments
    .map((fragment, index) => {
      return {
        fragment,
        path: _fragments.slice(0, index + 1).join('/'),
      }
    })
}

function PathContainer({ containerRef }: PathContainerProps) {
  const { tokens } = useTheme();
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { path = '', onParamsChange } = useBucketContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [inputValue, setInputValue] = useState(path)
  const wrapperShadowRef = useRef<HTMLDivElement>(null)
  const [shortPathFragments, setShortPathFragments] = useState<PathFragmentState[]>([])
  const [fragments, setFragments] = useState<PathFragmentState[]>([])
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    setFragments(extractPath(path))
  }, [path])

  useImperativeHandle(containerRef, () => ({
    toggleFocus: (value: boolean) => {
      setFocused(value)
    },
    getInputValue: () => inputValue,
    submit,
  }))

  useEffect(() => {
    const handleCorrectPath = (e: CustomEvent<{ detail: string }>) => {
      setTimeout(() => {
        setInputValue(e.detail as unknown as string)
        // form.setFieldValue('path', e.detail)
        setFragments(extractPath(e.detail as unknown as string))
      })
    }

    document.addEventListener(PATH_CORRECTION_EVENT, handleCorrectPath as EventListener)

    return () => {
      document.removeEventListener(PATH_CORRECTION_EVENT, handleCorrectPath as EventListener)
    }
  }, [])

  useLayoutEffect(() => {
    // 通过在dom中测量，计算出当前路径的宽度，如果宽度超过了容器宽度，则需要隐藏部分路径
    if (!wrapperRef.current || !wrapperShadowRef.current) {
      return
    }

    wrapperShadowRef.current.style.width = `${wrapperRef.current.offsetWidth}px`
    wrapperShadowRef.current.style.height = `${wrapperRef.current.offsetHeight}px`
    let cursor = 0

    wrapperShadowRef.current.innerHTML = ''
    const pathItems = []
    const extraPathItems = [
      {
        fragment: 's3',
        path: '',
      },
      ...fragments,
    ]

    for (let i = 0; i < extraPathItems.length; i++) {
      const pathItem = document.createElement('div')
      pathItem.style.display = 'flex'
      pathItem.style.alignItems = 'center'
      pathItem.style.whiteSpace = 'nowrap'
      pathItem.innerHTML = `
        <div style="display: flex;align-items: center;white-space: nowrap;">
          <div style="width: 14px;height: 14px;background-color: #000;"></div>
          <div style="padding-left: 0.25rem;padding-right: 0.25rem;">${extraPathItems[i].fragment}</div>
        </div>
      `
      pathItems.push(pathItem)
    }

    wrapperShadowRef.current.append(...pathItems)

    while (wrapperShadowRef.current.scrollWidth - wrapperShadowRef.current.offsetWidth > 0) {
      wrapperShadowRef.current.childNodes[0].remove()
      cursor += 1
    }

    setShortPathFragments(fragments.slice(0, cursor))
  }, [fragments, focused])

  useEffect(() => {
    setInputValue(path ?? '')
  }, [path])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submit()
    }
  }

  const handleFocus = (e: React.MouseEvent) => {
    if (document.querySelector('.shortcut-path-dropdown')?.contains(e.target as Node)) {
      return
    }

    setFocused(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleValidate = async (value: string) => {
    // 以s3://开头
    if (value && !value.startsWith('s3://')) {
      setError(t('bucket.pathMustStartWithS3'))
      return false
    }

    setError('')
    return true
  }

  const handleBlur = async () => {
    const valid = await handleValidate(inputValue).catch(error => {
      setError(error.message)
    })

    if (valid && inputValue.split('?')[0] === path.split('?')[0]) {
      setFocused(false)
    }
  }

  const handleGoHome = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    onParamsChange?.({ path: '', pageNo: 1 })
  }

  const handleFragmentClick = useCallback((_path: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const fullPath = `s3://${_path}${_path.endsWith('/') ? '' : '/'}`
    queryClient.removeQueries({
      queryKey: bucketKey.detail(fullPath),
    })

    onParamsChange?.({ path: fullPath, pageNo: 1 })
  }, [onParamsChange])

  const submit = useCallback(async () => {
    const valid = await handleValidate(inputValue).catch(error => {
      setError(error.message)
    })

    if (!valid) {
      return
    }

    const trimmedPath = inputValue.trim()
    queryClient.removeQueries({
      queryKey: bucketKey.detail(trimmedPath),
    })
    onParamsChange?.({ path: trimmedPath })
    setTimeout(() => {
      setFocused(false)
    }, 1000)
  }, [onParamsChange, inputValue])

  const handleValuesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 去除开头和结尾的空格
    setInputValue(e.target.value.trim())
  }

  const dropdownMenuProps: MenuProps = useMemo(() => {
    return {
      onClick: ({ key, domEvent }) => {
        handleFragmentClick(key)(domEvent as React.MouseEvent)
      },
      items: shortPathFragments.map(fragment => ({
        key: fragment.path,
        label: fragment.fragment,
      })),
    }
  }, [handleFragmentClick, shortPathFragments])

  return (
    <>
      <PathForm $focused={focused} $path={path}>
        <PathInput
          ref={inputRef}
          type="text"
          placeholder={t('bucket.searchPlaceholder')}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          value={inputValue}
          theme={tokens}
          onChange={handleValuesChange}
        />
        <ErrorMessage theme={tokens}>
          {error}
        </ErrorMessage>
      </PathForm>
      <PathContainerDiv
        id="path-container"
        ref={wrapperRef}
        $focused={focused}
        $path={path}
        onClick={handleFocus}
      >
        <FlexItems>
          <PathFragment fragment="s3" path="" hideArrow onClick={handleGoHome} />
          <RightIcon />
        </FlexItems>
        {
          shortPathFragments.length > 0 && (
            <Dropdown
              rootClassName={styles.shortcutPathDropdown}
              menu={dropdownMenuProps}
            >
              <FlexItems>
                <ShortcutItem>
                  ...
                </ShortcutItem>
                <RightIcon />
              </FlexItems>
            </Dropdown>
          )
        }
        <FlexItems>
          {fragments
            .slice(shortPathFragments.length)
            .map((fragment, index) => (
              <PathFragment key={index} hideArrow={index === 0} clickable={(index + shortPathFragments.length) !== (fragments.length - 1)} onClick={handleFragmentClick(fragment.path)} fragment={fragment.fragment} path={fragment.path} />
            ))}
        </FlexItems>
      </PathContainerDiv>
      <PathContainerShadow id="path-contaner-shadow" ref={wrapperShadowRef} />
    </>
  )
}

const PathOuter = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #e5e7eb; /* gray-200 */
  border-radius: 0.25rem;
  background-color: #fff;
`

const GoParentButton = styled(Button)`
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: 1px solid #e5e7eb; /* gray-200 */
`

const PathSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  font-size: 14px;
`

const InnerRightContainer = styled.div`
  display: flex;
  align-items: center;
`

const SearchButton = styled(Button)`
  border-radius: 0;
`

const CopyButton = styled(Button)`
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
`

export default function BucketHeader({ className }: { className?: string }) {
  const { t } = useTranslation();
  const pathContainerRef = useRef<PathContainerRef>(null)
  const { path = '', onParamsChange } = useBucketContext()
  const isFetching = useIsFetching()

  const handleGoParent = () => {
    let newPath = path
    if (path.endsWith('/')) {
      // s3://abc/ab/ => s3://abc/
      newPath = path.replace(/[^/]+\/$/, '')
    }
    else {
      // s3://abc/ab => s3://abc/
      newPath = path.replace(/[^/]+$/, '')
    }

    if (newPath === 's3://') {
      newPath = ''
    }

    const params = {
      path: newPath,
    } as any

    onParamsChange?.(params)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(path)
    message.success(t('copied'))
  }

  return (
    <PathOuter className={className}>
      <Tooltip title={t('bucket.returnToParent')} placement="bottomLeft">
        <GoParentButton type="text" disabled={!path || path === 's3://'} icon={<ArrowUpOutlined />} onClick={handleGoParent} />
      </Tooltip>
      <PathSection>
        <PathContainer containerRef={pathContainerRef} />
        <InnerRightContainer>
          <Tooltip title={t('bucket.searchPath')}>
            <SearchButton type="text" disabled={isFetching > 0} icon={<SearchOutlined />} onClick={() => pathContainerRef.current?.toggleFocus(true)} />
          </Tooltip>
          <Tooltip title={t('bucket.copyPath')}>
            <CopyButton type="text" disabled={!path} icon={<CopyOutlined />} onClick={handleCopy} />
          </Tooltip>
        </InnerRightContainer>
      </PathSection>
    </PathOuter>
  )
}
