import { Unlock } from "lucide-react"
import { StateOverlay } from "../../shared/ui"

interface SuspendedOverlayProps {
  onResume: () => void
}

/**
 * Feature 层业务组件：负责项目休眠提示与唤醒用例处理
 */
export function SuspendedOverlay({ onResume }: SuspendedOverlayProps) {
  return (
    <StateOverlay
      icon={Unlock}
      iconColor="text-amber-400"
      title="项目已休眠"
      actionLabel="一键唤醒"
      onAction={onResume}
    />
  )
}
