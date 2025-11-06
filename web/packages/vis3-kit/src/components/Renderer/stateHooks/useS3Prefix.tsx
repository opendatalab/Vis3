import { LinkOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import type { FormInstance } from 'antd'
import { Button, Form, Input, Popover } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTranslation } from '../../../i18n'
import type { BinaryButtonRef } from '../../BinaryButton'
import BinaryButton from '../../BinaryButton'

const StyledForm = styled(Form)`
  width: 340px;
`

const ButtonContainer = styled.div`
  display: flex;
  width: 100%;
  gap: 0.5rem;
`

const FlexButton = styled(Button)`
  flex: 1;
`

const S3_PREFIX_REGEXP = /^s3:\/\/\S*/

export default function useS3Prefix(prefix?: string): [React.ReactNode, { prefix: string, open: boolean }, (value: string) => void, FormInstance<any>] {
  const [value, setValue] = useState('')
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<BinaryButtonRef>(null)
  const { t } = useTranslation()

  useEffect(() => {
    form.setFieldsValue({
      prefix: prefix ?? '',
    })
  }, [prefix, form])

  const handleFinish = (values: any) => {
    setValue(values.prefix)
    setOpen(false)
  }

  const handleChange = useCallback((_value: string) => {
    setValue(_value)
    form.setFieldsValue({
      prefix: _value,
    })
  }, [form])

  const handleOpenChange = useCallback(() => {
    setOpen(pre => !pre)
    btnRef.current?.setActivated(!!value)
  }, [value])

  const handleReset = useCallback(() => {
    form.resetFields()
    setValue('')
    setOpen(false)
  }, [form])

  const node = useMemo(() => (
    <Popover
      content={(
        <StyledForm form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            label="Path prefix"
            extra={t('renderer.s3PrefixEffect')}
            name="prefix"
            rules={[{
              validator: async (_rule, _value?: string) => {
                if (!_value) {
                  return Promise.resolve()
                }

                if (S3_PREFIX_REGEXP.test(_value)) {
                  return Promise.resolve()
                }

                return Promise.reject(new Error(t('bucket.pathMustStartWithS3')))
              },
            }]}
          >
            <Input placeholder="s3://example-bucket/" />
          </Form.Item>
          <Form.Item noStyle>
            <ButtonContainer>
              <FlexButton type="primary" htmlType="submit">{t('renderer.confirm')}</FlexButton>
              <FlexButton onClick={handleReset}>{t('renderer.clear')}</FlexButton>
            </ButtonContainer>
          </Form.Item>
        </StyledForm>
      )}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
    >
      <BinaryButton btnRef={btnRef} activated={!!value} title={t('renderer.addS3Prefix')} icon={<LinkOutlined />} onChange={handleOpenChange} />
    </Popover>
  ), [value, form, handleOpenChange, handleReset, open, t])

  const state = useMemo(() => ({ open, prefix: value }), [open, value])

  return [node, state, handleChange, form]
}
