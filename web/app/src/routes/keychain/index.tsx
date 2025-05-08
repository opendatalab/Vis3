import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/keychain/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/keychain/"!</div>
}
