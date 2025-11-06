import { InfoCircleOutlined, RobotOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons'

import type { RoleMeta } from './types'

export const ROLE_META: Record<string, RoleMeta> = {
  user: {
    label: 'User',
    icon: <UserOutlined />,
    avatarStyle: { backgroundColor: '#1890ff', color: 'white' },
  },
  assistant: {
    label: 'Assistant',
    icon: <RobotOutlined />,
    avatarStyle: { backgroundColor: '#722ed1', color: 'white' },
  },
  system: {
    label: 'System',
    icon: <InfoCircleOutlined />,
    avatarStyle: { backgroundColor: '#faad14', color: 'white' },
  },
  tool: {
    label: 'Tool',
    icon: <ToolOutlined />,
    avatarStyle: { backgroundColor: '#13c2c2', color: 'white' },
  },
  function: {
    label: 'Function',
    icon: <ToolOutlined />,
    avatarStyle: { backgroundColor: '#13c2c2', color: 'white' },
  },
}

export function getRoleMeta(role: string): RoleMeta {
  return ROLE_META[role] ?? {
    label: role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown',
    icon: <InfoCircleOutlined />,
    avatarStyle: { backgroundColor: '#d9d9d9', color: '#111827' },
  }
}
