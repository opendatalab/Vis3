import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Button, Form, Input, message } from 'antd'
import { getUserInfo, RegisterPayload } from '../../api/user'
import { useRegister } from '../../api/user.query'

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
    } catch (error) {
      console.error('get user info error', error)
    }

    return null
  }
})

interface RegisterFormValues extends RegisterPayload {
  confirm_password: string
}

function RouteComponent() {
  const [form] = Form.useForm<RegisterFormValues>()
  const navigate = useNavigate()
  
  // 使用React Query的useMutation
  const registerMutation = useRegister()

  const handleSubmit = async (values: RegisterFormValues) => {
    // 验证两次密码是否一致
    if (values.password !== values.confirm_password) {
      message.error('两次输入的密码不一致')
      return
    }

    try {
      await registerMutation.mutateAsync(values)
      message.success('注册成功，请登录')
      navigate({ to: '/login' })
    } catch (error: any) {
      console.error('注册失败:', error)
      message.error(error.response?.data?.detail || '注册失败，请稍后重试')
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
          <p className="mt-2 text-gray-600">创建新账号</p>
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
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input 
              prefix={<UserOutlined className="site-form-item-icon" />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="确认密码"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full" 
              loading={registerMutation.isPending}
            >
              注册
            </Button>
          </Form.Item>
          
          <div className="text-center">
            <span className="text-gray-600">已有账号？</span>
            <a
              onClick={() => navigate({ to: '/login' })}
              className="text-blue-600 hover:text-blue-800 ml-1 cursor-pointer"
            >
              立即登录
            </a>
          </div>
        </Form>
      </div>
    </div>
  )
} 