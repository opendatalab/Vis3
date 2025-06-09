import {
  ArrowUpOutlined,
  CopyOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from '@vis3/i18n';
import type { FormInstance, FormProps, MenuProps } from 'antd';
import { Button, Dropdown, Form, Input, message, Space, Tooltip } from 'antd';
import clsx from 'clsx';
import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';

import _ from 'lodash';
import { useBucketQueryKey, useCachedBucket } from '../../api/bucket.query';
import { openBucketManager } from '../BucketManager';
import { DirectoryTreeTrigger } from '../DirectoryTree';
import styles from './index.module.css';

const rightIcon = <RightOutlined className="text-gray-300 text-[12px]" />

export interface InputValues {
  path: string
}

interface PathFragmentProps {
  fragment: string
  path: string
  hideArrow?: boolean
  clickable?: boolean
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

function PathFragment({ fragment, hideArrow, clickable = true, onClick, className }: PathFragmentProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const search = location.search as Record<string, string | number>
  const path = search.path as string || ''

  const handleFragmentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const fullPath = `s3://${path}${path.endsWith('/') ? '' : '/'}`
    queryClient.invalidateQueries()
    navigate({
      to: '/',
      search: { ...search, id: !path ? undefined : search.id, path: fullPath, page_no: 1 },
    })
  }, [path, search, navigate])

  return (
    <div className={clsx('flex items-center whitespace-nowrap', className)}>
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

export function correctPath(path: string) {
  document.dispatchEvent(new CustomEvent('correct-path', { detail: path }))
}

function PathContainer({ containerRef }: PathContainerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()
  const wrapperShadowRef = useRef<HTMLDivElement>(null)
  const [shortPathFragments, setShortPathFragments] = useState<PathFragmentState[]>([])
  const [fragments, setFragments] = useState<PathFragmentState[]>([])
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const location = useLocation()
  const search = location.search as Record<string, string | number>
  const path = search.path as string || ''
  const queryClient = useQueryClient()

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

    document.addEventListener('correct-path', handleCorrectPath as EventListener)

    return () => {
      document.removeEventListener('correct-path', handleCorrectPath as EventListener)
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
    form.setFieldValue('path', path ?? '')
  }, [path])

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

    navigate({
      to: '/',
      search: { page_no: 1 },
    })
  }

  const handleFragmentClick = useCallback((_path: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const fullPath = `s3://${_path}${_path.endsWith('/') ? '' : '/'}`
    queryClient.invalidateQueries()
    navigate({
      to: '/',
      search: { ...search, id: !path ? undefined : search.id, path: fullPath, page_no: 1 },
    })
  }, [path, search, navigate])

  const handleOnFinish = (values: InputValues) => {
    const trimmedPath = values.path.trim()
    queryClient.invalidateQueries()
    navigate({
      to: '/',
      search: { ...search, id: !path ? undefined : search.id, path: trimmedPath },
    })
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

  const formInitialValues = useMemo(() => ({ path }), [path])
  const showForm = focused || !path

  return (
    <>
      <Form<InputValues>
        layout="inline"
        form={form}
        className={clsx({
          'w-full': showForm,
          'visible': showForm,
          'absolute': !showForm,
          'invisible': !showForm,
          'z-[-1]': !showForm,
          'left-8': !showForm,
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
              message: t('bucket.pathMustStartWithS3'),
            },
          ]}
        >
          <Input
            className={clsx('w-full rounded-none !shadow-none')}
            // @ts-ignore
            ref={inputRef}
            allowClear
            placeholder={t('bucket.searchPlaceholder')}
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
        }, 'flex items-center flex-1 cursor-text overflow-auto w-0 border-t border-b border-gray-300 bg-white')}
        onClick={handleFocus}
      >
        <div className="flex items-center">
          <PathFragment fragment="s3" path="" className="ml-1" hideArrow onClick={handleGoHome} />
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
  const { t } = useTranslation()
  const pathContainerRef = useRef<PathContainerRef>(null)
  const isFetching = useIsFetching()
  const location = useLocation()
  const search = location.search as Record<string, string | number>
  const navigate = useNavigate()
  const [, path, pageNo, pageSize] = useBucketQueryKey()

  // 获取react-query缓存的数据
  const cachedBucket = useCachedBucket()

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

    navigate({
      to: '/',
      search: { ...search, id: !newPath ? undefined : search.id, path: newPath },
    })
  }

  const total = _.get(cachedBucket, 'data.total', 0)

  const handleCopy = () => {
    navigator.clipboard.writeText(path)
    message.success(t('copied'))
  }

  const pathWithoutQuery = path.split('?')[0]
  const showPagination = path && pathWithoutQuery.endsWith('/')

  return (
    <div className={clsx('bucket-header', ' flex items-center gap-2')}>
      {
        path && <DirectoryTreeTrigger />
      }
      <Space.Compact className="flex flex-1 text-sm relative">
        <Tooltip title={t('bucket.returnToParent')} placement="bottomLeft">
          <Button disabled={!path || path === 's3://'} icon={<ArrowUpOutlined />} onClick={handleGoParent} />
        </Tooltip>
        <PathContainer containerRef={pathContainerRef} />
        <Tooltip title={t('bucket.searchPath')}>
          <Button disabled={isFetching > 0} icon={<SearchOutlined />} onClick={() => pathContainerRef.current?.form.submit()} />
        </Tooltip>
        <Tooltip title={t('bucket.copyPath')}>
          <Button disabled={!path} icon={<CopyOutlined />} onClick={handleCopy} />
        </Tooltip>
      </Space.Compact>
      <>
        {
          showPagination && (
            <Space.Compact>
              <Tooltip title={t('bucket.prevPage')}>
                <Button
                  disabled={!pageNo || pageNo === 1}
                  onClick={() => navigate({
                    to: '/',
                    search: { ...search, page_no: pageNo - 1 },
                  })}
                  icon={<LeftOutlined />}
                />
              </Tooltip>
              <Input className="!w-16 text-center" min={1} readOnly value={pageNo ?? '1'} />
              <Tooltip title={t('bucket.nextPage')}>
                <Button
                  onClick={() => navigate({
                    to: '/',
                    search: { ...search, page_no: pageNo + 1 },
                  })}
                  icon={<RightOutlined />}
                  disabled={total < pageNo * pageSize}
                />
              </Tooltip>
            </Space.Compact>
          )
        }
        <Tooltip title={t('bucketForm.addBucket')} placement="topLeft">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              openBucketManager()
            }}
          />
        </Tooltip>
      </>
    </div>
  )
}
