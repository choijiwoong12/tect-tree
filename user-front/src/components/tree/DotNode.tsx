import { Handle, Position, NodeProps } from '@xyflow/react'
import { Check } from 'lucide-react'

// Both handles are collapsed onto the node's centre so straight edges connect
// dot-centre to dot-centre regardless of which direction a child branches.
const centerHandleStyle = {
  left: '50%',
  top: '50%',
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  transform: 'translate(-50%, -50%)',
  border: 0,
  background: 'transparent',
  opacity: 0,
} as const

export function DotNode({ data }: NodeProps) {
  const isRoot = data.isRoot as boolean
  const label = data.label as string

  // 루트(유저) 노드 — 빨강 과녁(◎): 외곽 링 30px(4px) + 중앙 점 10px.
  // 로그아웃 = "LOG IN"(Sam33 빨강). 로그인 = "START HERE"(Sam21 빨강) + 콜사인-닉네임(Sam33 흰색).
  if (isRoot) {
    const loggedIn = data.isLoggedIn as boolean
    return (
      <div className="relative flex flex-col items-center">
        <Handle type="target" position={Position.Top} style={centerHandleStyle} isConnectable={false} />
        <div className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border-[4px] border-[#FF0000]">
          <div className="h-[10px] w-[10px] rounded-full bg-[#FF0000]" />
        </div>
        {loggedIn ? (
          <div className="absolute left-1/2 top-[37px] -translate-x-1/2 flex flex-col items-center whitespace-nowrap text-center">
            <span className="font-pixel text-[21px] text-[#FF0000]">START HERE</span>
            <span className="font-pixel text-[33px] text-white">{label}</span>
          </div>
        ) : (
          <div className="absolute left-1/2 top-[38px] -translate-x-1/2 whitespace-nowrap font-pixel text-[33px] leading-none text-[#FF0000]">
            {label}
          </div>
        )}
        <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
      </div>
    )
  }

  // 콘텐츠 노드 — 다음 단계(document_nodes 연동)에서 is_locked/해금 상태로 다시 구현.
  const status = data.status as 'unlocked' | 'unlockable' | 'locked'
  const isUnlocked = status === 'unlocked'
  const isUnlockable = status === 'unlockable'

  let bg = '#2a2a2a'
  let border = '#3a3a3a'
  if (isUnlocked) {
    bg = '#ffffff'
    border = '#ffffff'
  } else if (isUnlockable) {
    bg = '#6a6a6a'
    border = '#888'
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <Handle type="target" position={Position.Top} style={centerHandleStyle} isConnectable={false} />
      <div
        className="flex h-5 w-5 items-center justify-center rounded-full transition-all"
        style={{
          backgroundColor: bg,
          border: `1px solid ${border}`,
          cursor: status === 'locked' ? 'default' : 'pointer',
        }}
      >
        {isUnlocked && <Check size={11} strokeWidth={3} className="text-black" />}
      </div>
      <div
        className={`absolute top-6 whitespace-pre text-center font-pixel text-sm tracking-wider leading-tight ${
          isUnlocked ? 'text-white' : 'text-white/40'
        }`}
      >
        {label}
      </div>
      <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
    </div>
  )
}
