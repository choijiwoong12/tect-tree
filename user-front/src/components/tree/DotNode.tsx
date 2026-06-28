'use client'

import { Handle, Position, NodeProps, useViewport } from '@xyflow/react'

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

// 줌 임계값: 이 값 이상이면 노드 제목 표시
const LABEL_ZOOM_THRESHOLD = 0.8

export function DotNode({ data }: NodeProps) {
  const { zoom } = useViewport()
  const isRoot = data.isRoot as boolean

  // 루트(유저) 노드 — 빨강 과녁(◎): 외곽 링 30px(4px) + 중앙 점 10px.
  if (isRoot) {
    const loggedIn = data.isLoggedIn as boolean
    const label = data.label as string
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

  // 콘텐츠 노드
  const label = data.label as string
  const isUnlocked = data.isUnlocked as boolean
  const showLabel = zoom >= LABEL_ZOOM_THRESHOLD

  return (
    <div className="relative flex flex-col items-center justify-center">
      <Handle type="target" position={Position.Top} style={centerHandleStyle} isConnectable={false} />

      {/* 도트 */}
      <div
        className="rounded-full transition-colors"
        style={{
          width: 10,
          height: 10,
          backgroundColor: isUnlocked ? '#ffffff' : '#555555',
          boxShadow: isUnlocked ? '0 0 6px rgba(255,255,255,0.6)' : 'none',
        }}
      />

      {/* 제목 — 줌 임계값 이상일 때만 표시 */}
      {showLabel && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-pre text-center font-pixel text-[14px] leading-tight tracking-wider"
          style={{ color: isUnlocked ? '#ffffff' : 'rgba(255,255,255,0.3)' }}
        >
          {label}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
    </div>
  )
}
