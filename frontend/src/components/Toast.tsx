import { useToastStore } from '../store/toastStore'

export default function Toast() {
  const { message, show } = useToastStore()
  return <div className={`toast${show ? ' show' : ''}`}>{message}</div>
}
