import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from '@vis3/kit'
import { Button, Form, Input, message } from 'antd'

import type { RegisterPayload } from '../../api/user'
import { getUserInfo } from '../../api/user'
import { useRegister } from '../../api/user.query'
import LangSwitcher from '../../components/LangSwitcher'

export const Route = createFileRoute('/register/')({
  component: RouteComponent,
  loader: async () => {
    if (!window.__CONFIG__?.ENABLE_AUTH) {
      return redirect({ to: '/' })
    }

    try {
      const response = await getUserInfo()

      if (response) {
        return redirect({ to: '/' })
      }
    }
    catch (error) {
      console.error('get user info error', error)
    }

    return null
  },
})

interface RegisterFormValues extends RegisterPayload {
  confirm_password: string
}

function RouteComponent() {
  const [form] = Form.useForm<RegisterFormValues>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // 使用React Query的useMutation
  const registerMutation = useRegister()

  const handleSubmit = async (values: RegisterFormValues) => {
    // 验证两次密码是否一致
    if (values.password !== values.confirm_password) {
      message.error(t('account.passwordConfirmError'))
      return
    }

    try {
      await registerMutation.mutateAsync(values)
      message.success(t('account.registerSuccess'))
      navigate({ to: '/login' })
    }
    catch (error: any) {
      console.error('register failed', error)
      message.error(error.response?.data?.detail || t('account.registerFailed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url(/bg.png)] p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <img src={`logo.svg`} alt="logo" className="w-8 h-8" />
            <span className="text-3xl text-gray-800">
              Vis3
            </span>
          </div>
          <p className="mt-2 text-gray-600">{t('account.createNewAccount')}</p>
        </div>

        <Form<RegisterFormValues>
          form={form}
          name="register"
          initialValues={{ remember: true }}
          onFinish={handleSubmit}
          size="large"
          className="mt-8 space-y-6"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: t('account.usernameRequired') },
              { min: 3, message: t('account.usernameMinLength') },
            ]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder={t('account.username')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: t('account.passwordRequired') },
              { min: 6, message: t('account.passwordMinLength') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder={t('account.password')}
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            dependencies={['password']}
            rules={[
              { required: true, message: t('account.passwordConfirmRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('account.passwordConfirmError')))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder={t('account.passwordConfirm')}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={registerMutation.isPending}
            >
              {t('account.register')}
            </Button>
          </Form.Item>

          <div className="text-center">
            <span className="text-gray-600">{t('account.haveAccount')}</span>
            <Button
              type="link"
              className=""
              size="small"
              href={`${window.__CONFIG__.BASE_URL ?? ''}/login`}
            >
              {t('account.loginNow')}
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <LangSwitcher />
          </div>
        </Form>
      </div>
    </div>
  )
}
