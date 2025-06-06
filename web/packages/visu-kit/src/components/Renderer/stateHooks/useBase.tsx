import { LinkOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import { useTranslation } from '@vis3/i18n'
import type { FormInstance } from 'antd'
import { Button, Form, Input, Popover } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BinaryButtonRef } from '../../../components/BinaryButton'
import BinaryButton from '../../../components/BinaryButton'

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

export default function useBase(baseUrl?: string): [React.ReactNode, { base: string, open: boolean }, (base: string) => void, FormInstance<any>] {
  const [base, setBase] = useState('')
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<BinaryButtonRef>(null)
  const { t } = useTranslation()

  useEffect(() => {
    form.setFieldsValue({
      baseUrl: baseUrl ?? '',
    })
  }, [baseUrl, form])

  const handleFinish = (values: any) => {
    setBase(values.baseUrl)
    setOpen(false)
  }

  const handleChange = useCallback((_value: string) => {
    setBase(_value)
    form.setFieldsValue({
      baseUrl: _value,
    })
  }, [form])

  const handleOpenChange = useCallback(() => {
    setOpen(pre => !pre)
    btnRef.current?.setActivated(!!base)
  }, [base])

  const handleReset = useCallback(() => {
    form.resetFields()
    setBase('')
    setOpen(false)
  }, [form])

  const node = useMemo(() => (
    <Popover
      content={(
        <StyledForm form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            label="Base URL"
            extra={t('renderer.baseUrlEffect')}
            name="baseUrl"
            rules={[{
              type: 'url',
            }]}
          >
            <Input placeholder="https://example.com" />
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
      <BinaryButton btnRef={btnRef} activated={!!base} title={t('renderer.convertToFullUrl')} icon={<LinkOutlined />} onChange={handleOpenChange} />
    </Popover>
  ), [base, form, handleOpenChange, handleReset, open, t])

  const state = useMemo(() => ({ open, base }), [open, base])

  return [node, state, handleChange, form]
}
