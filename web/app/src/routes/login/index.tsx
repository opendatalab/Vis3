import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Button, Form, Input, message } from 'antd'

import { getUserInfo, LoginPayload } from '../../api/user'
import { useLogin } from '../../api/user.query'

export const Route = createFileRoute('/login/')({
  component: RouteComponent,
  loader: async () => {
    try {
      const response = await getUserInfo()
  
      if (response) {
        return redirect({ to: '/' })
      }
  
      return null
    } catch (error) {
      console.error('get user info error', error)
    }
  }
})

function RouteComponent() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  
  // 使用React Query的useMutation
  const loginMutation = useLogin()

  const handleSubmit = async (values: LoginPayload) => {
    try {
      await loginMutation.mutateAsync(values)
      navigate({ to: '/' })
    } catch (error) {
      console.error('登录失败:', error)
      message.error('用户名或密码错误')
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
          <p className="mt-2 text-gray-600">大模型语料可视化工具</p>
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
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined className="site-form-item-icon" />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="w-full" 
              loading={loginMutation.isPending}
            >
              登录
            </Button>
          </Form.Item>
          
          <div className="text-center">
            <a
              onClick={() => navigate({ to: '/register' })}
              className="text-blue-600 hover:text-blue-800 ml-1 cursor-pointer"
            >
              立即注册
            </a>
          </div>
        </Form>
      </div>
    </div>
  )
}
