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
  const status = data.status as 'unlocked' | 'unlockable' | 'locked'
  const isLoginNode = data.isLoginNode as boolean
  const label = data.label as string

  // Login (logged-out center) node: red filled circle with white hand-drawn outline
  if (isLoginNode) {
    return (
      <div className="relative flex flex-col items-center justify-center">
        <Handle type="target" position={Position.Top} style={centerHandleStyle} isConnectable={false} />
        <div
          className="w-7 h-7 rounded-full bg-red-600 shadow-[0_0_24px_rgba(220,38,38,0.7)] cursor-pointer"
        />
        <div className="absolute top-9 font-pixel text-base text-red-500 tracking-widest whitespace-nowrap">
          {label}
        </div>
        <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
      </div>
    )
  }

  const isUnlocked = status === 'unlocked'
  const isUnlockable = status === 'unlockable'

  // Dot color: unlocked = white, unlockable = mid-gray, locked = dark
  let bg = '#2a2a2a'
  let border = '#3a3a3a'
  if (isUnlocked) { bg = '#ffffff'; border = '#ffffff' }
  else if (isUnlockable) { bg = '#6a6a6a'; border = '#888' }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <Handle type="target" position={Position.Top} style={centerHandleStyle} isConnectable={false} />
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
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
