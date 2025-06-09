import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Button, Form, Input, message } from 'antd'

import { useTranslation } from '@vis3/i18n'
import type { LoginPayload } from '../../api/user'
import { getUserInfo } from '../../api/user'
import { useLogin } from '../../api/user.query'

export const Route = createFileRoute('/login/')({
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

      return null
    }
    catch (error) {
      console.error('get user info error', error)
    }
  },
})

function RouteComponent() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // 使用React Query的useMutation
  const loginMutation = useLogin()

  const handleSubmit = async (values: LoginPayload) => {
    try {
      await loginMutation.mutateAsync(values)
      navigate({ to: '/' })
    }
    catch (error) {
      console.error('login failed', error)
      message.error(t('account.usernameIncorrect'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo.svg" alt="logo" className="w-8 h-8" />
            <span className="text-3xl text-gray-800">
              VisU
            </span>
          </div>
          <p className="mt-2 text-gray-600">{t('slogan')}</p>
        </div>

        <Form
          form={form}
          name="login"
          layout="vertical"
          initialValues={{ remember: true }}
          onFinish={handleSubmit}
          size="large"
          className="mt-8"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('account.usernamePlaceholder') }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder={t('account.username')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('account.passwordPlaceholder') }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder={t('account.password')}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loginMutation.isPending}
            >
              {t('account.login')}
            </Button>
          </Form.Item>

          <Form.Item className="text-center">
            <Button
              type="link"
              className="!px-0"
              size="small"
              href="/register"
            >
              {t('account.register')}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
