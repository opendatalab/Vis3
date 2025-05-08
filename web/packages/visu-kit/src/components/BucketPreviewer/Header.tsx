import {
  ArrowUpOutlined,
  CopyOutlined,
  FolderOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useIsFetching } from '@tanstack/react-query'
import type { FormInstance, InputRef, MenuProps } from 'antd'
import { Button, Dropdown, Form, Input, message, Space, Tooltip } from 'antd'
import type { FormProps } from 'antd/lib'
import clsx from 'clsx'
import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { bucketKey } from '../../queries/bucket.key'
import queryClient from '../../queries/queryClient'
import { PAGENATION_CHANGE_EVENT, PATH_CORRECTION_EVENT } from '../Renderer/Block'
import { useBucketContext } from './context'
import styles from './index.module.css'

const rightIcon = <RightOutlined className="text-gray-300 text-[12px]" />

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
    <div className="flex items-center whitespace-nowrap">
      {!hideArrow && rightIcon}
      <div
        className={clsx({
          'cursor-pointer duration-100 hover:bg-blue-50 hover:text-blue-500 rounded': clickable,
          'cursor-text': !clickable,
        }, 'px-1 py-0.5')}
        onClick={clickable ? onClick ?? handleFragmentClick : undefined}
      >
        {fragment}
      </div>

    </div>
  )
}

interface PathContainerRef {
  toggleFocus: (value: boolean) => void
  form: FormInstance<InputValues>
}

interface PathContainerProps {
  containerRef: React.RefObject<PathContainerRef>
}

interface PathFragmentState {
  fragment: string
  path: string
}

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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { path = '', onParamsChange } = useBucketContext()
  const [form] = Form.useForm<InputValues>()
  const inputRef = useRef<InputRef>(null)
  const [focused, setFocused] = useState(false)
  const formInitialValues = useMemo(() => ({ path }), [path])
  const wrapperShadowRef = useRef<HTMLDivElement>(null)
  const [shortPathFragments, setShortPathFragments] = useState<PathFragmentState[]>([])
  const [fragments, setFragments] = useState<PathFragmentState[]>([])

  useEffect(() => {
    setFragments(extractPath(path))
  }, [path])

  useImperativeHandle(containerRef, () => ({
    toggleFocus: (value: boolean) => {
      setFocused(value)
    },
    form,
  }))

  useEffect(() => {
    const handleCorrectPath = (e: CustomEvent<{ detail: string }>) => {
      setTimeout(() => {
        form.setFieldValue('path', e.detail)
        setFragments(extractPath(e.detail as unknown as string))
      })
    }

    document.addEventListener(PATH_CORRECTION_EVENT, handleCorrectPath as EventListener)

    return () => {
      document.removeEventListener(PATH_CORRECTION_EVENT, handleCorrectPath as EventListener)
    }
  }, [form])

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
    form.setFieldValue('path', path ?? '')
  }, [form, path])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      form.submit()
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

  const handleBlur = async () => {
    const valid = await form.validateFields()
    const _path = form.getFieldValue('path')

    if (valid && _path.split('?')[0] === path.split('?')[0]) {
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
    document.dispatchEvent(new CustomEvent(PAGENATION_CHANGE_EVENT, { detail: { pageNo: 1 } }))
  }, [onParamsChange])

  const handleOnFinish = (values: InputValues) => {
    const trimmedPath = values.path.trim()
    queryClient.removeQueries({
      queryKey: bucketKey.detail(trimmedPath),
    })
    onParamsChange?.({ path: trimmedPath })
    setTimeout(() => {
      setFocused(false)
    }, 1000)
  }

  const handleValuesChange: FormProps['onValuesChange'] = (changedFields) => {
    // 去除开头和结尾的空格
    form.setFieldValue('path', changedFields.path.trim())
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
      <Form<InputValues>
        layout="inline"
        form={form}
        className={clsx({
          'w-full': focused || !path,
          'visible': focused || !path,
          'absolute': !focused && path,
          'invisible': !focused && path,
          'z-[-1]': !focused && path,
        })}

        onFinish={handleOnFinish}
        initialValues={formInitialValues}
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          label=""
          name="path"
          className="!flex-1 !m-0"
          rules={[
            {
              pattern: /^s3:\/\//,
              message: '路径必须以s3://开头',
            },
          ]}
        >
          <Input
            className={clsx('w-full rounded-none border-0 !shadow-none')}
            ref={inputRef}
            allowClear
            placeholder="输入地址检索"
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        </Form.Item>
      </Form>
      <div
        id="path-container"
        ref={wrapperRef}
        className={clsx({
          'visible': !focused,
          'invisible': focused || !path,
          'z-[-1]': focused || !path,
          'absolute': focused || !path,
        }, 'flex items-center flex-1 cursor-text overflow-auto w-0 ml-1')}
        onClick={handleFocus}
      >
        <div className="flex items-center">
          <PathFragment fragment="s3" path="" hideArrow onClick={handleGoHome} />
          {rightIcon}
        </div>
        {
          shortPathFragments.length > 0 && (
            <Dropdown
              rootClassName={styles.shortcutPathDropdown}
              menu={dropdownMenuProps}
            >
              <div className="flex items-center">
                <div className="hover:bg-blue-50 hover:text-blue-500 px-1 cursor-pointer rounded duration-100">
                  ...
                </div>
                {rightIcon}
              </div>
            </Dropdown>
          )
        }
        <div className="flex items-center">
          {fragments
            .slice(shortPathFragments.length)
            .map((fragment, index) => (
              <PathFragment key={index} hideArrow={index === 0} clickable={(index + shortPathFragments.length) !== (fragments.length - 1)} onClick={handleFragmentClick(fragment.path)} fragment={fragment.fragment} path={fragment.path} />
            ))}
        </div>
      </div>
      <div id="path-contaner-shadow" className="absolute top-0 left-0 flex items-center flex-1 overflow-auto min-w-0 invisible z-[-1]" ref={wrapperShadowRef} />
    </>
  )
}

export default function BucketHeader() {
  const pathContainerRef = useRef<PathContainerRef>(null)
  const { pageNo, path = '', onParamsChange, total, pageSize } = useBucketContext()
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

    if (newPath === '') {
      params.cluster = ''
    }

    onParamsChange?.(params)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(pathContainerRef.current?.form.getFieldValue('path') ?? '')
    message.success('已复制到剪贴板')
  }

  const handlePageChange = (direction: 'prev' | 'next') => () => {
    const newPage = direction === 'prev' ? pageNo - 1 : pageNo + 1

    queryClient.removeQueries({
      queryKey: bucketKey.detail(path),
    })

    document.dispatchEvent(new CustomEvent(PAGENATION_CHANGE_EVENT, { detail: { pageNo: newPage } }))
    onParamsChange?.({ pageNo: newPage })
  }

  return (
    <div className={clsx('flex gap-2 justify-between px-6 flex-nowrap', styles.header)}>
      <div className="left flex flex-1 items-center border rounded-[4px] h-full">
        {path && (
          <Tooltip title="返回上级目录" placement="bottomLeft">
            <Button type="text" className="rounded-tr-none rounded-br-none border-r-[1px] border-r-solid border-r-gray-200" icon={<ArrowUpOutlined />} onClick={handleGoParent} />
          </Tooltip>
        )}
        <div className="path flex items-center justify-between flex-1">
          <PathContainer containerRef={pathContainerRef} />
          <div className="inner-right flex items-center">
            <Tooltip title="检索路径">
              <Button type="text" className="rounded-none" disabled={isFetching > 0} icon={<SearchOutlined />} onClick={() => pathContainerRef.current?.form.submit()} />
            </Tooltip>
            <Tooltip title="复制路径">
              <Button type="text" className="rounded-tl-none rounded-bl-none" icon={<CopyOutlined />} onClick={handleCopy} />
            </Tooltip>
          </div>
        </div>
      </div>
      <div className="right flex items-center gap-2">
        {path.endsWith('/') && (
          <Space.Compact>
            <Tooltip title="上一页">
              <Button
                disabled={!pageNo || pageNo === 1}
                onClick={handlePageChange('prev')}
                icon={<LeftOutlined />}
              />
            </Tooltip>
            <Input className="w-[60px] text-center" min={1} readOnly value={pageNo ?? '1'} />
            <Tooltip title="下一页">
              <Button disabled={total < pageSize} onClick={handlePageChange('next')} icon={<RightOutlined />} />
            </Tooltip>
          </Space.Compact>
        )}
        {
          !path.endsWith('/') && path !== '' && path !== '/' && (
            <Button icon={<FolderOutlined />} onClick={() => document.dispatchEvent(new CustomEvent('open-bucket-list'))}>目录</Button>
          )
        }
      </div>
    </div>
  )
}
