'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'
import { useDetailVisible } from './treeViewContext'

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

// 피그마 노드 스펙 (1920 디자인 = zoom 1에서 1:1 px)
const SIZE_UNLOCKED = 30 // 열람 노드 도트 지름
const SIZE_LOCKED = 19 // 미열람 노드 도트 지름
const COLOR_UNLOCKED = '#ffffff'
const COLOR_LOCKED = '#404040'
const LABEL_COLOR_UNLOCKED = '#ffffff'
const LABEL_COLOR_LOCKED = '#595959'
const LABEL_SIZE = 33 // Sam3KRFont 500
const LABEL_GAP = 8 // 도트 오른쪽 라벨 간격
const TOC_DOT = 16 // 목차 원 지름(열람 노드)
const TOC_DOT_LOCKED = 12 // 목차 원 지름(잠긴 노드 — 개수만 표시)
const TOC_TEXT_SIZE = 21 // NanumMyeongjo 목차 텍스트

// 제목/목차가 엣지(연결선) 위에 깔끔히 올라오도록 검정 외곽선(halo)로 선을 가린다 — 피그마처럼 라벨이 선에 안 가려짐
const TEXT_OUTLINE =
  '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 0 0 #000, -2px 0 0 #000'

export function DotNode({ data }: NodeProps) {
  // 줌아웃(별자리 모드)이면 false → 라벨/목차/회색 노드 숨김
  const detailVisible = useDetailVisible()
  const isRoot = data.isRoot as boolean
  const showLabel = detailVisible

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
        {showLabel &&
          (loggedIn ? (
            <div
              className="absolute left-1/2 top-[37px] -translate-x-1/2 flex flex-col items-center whitespace-nowrap text-center leading-none"
              style={{ textShadow: TEXT_OUTLINE }}
            >
              <span className="font-pixel text-[19px] text-[#FF0000]">START HERE</span>
              <span className="mt-[6px] font-pixel text-[33px] text-white">{label}</span>
            </div>
          ) : (
            <div className="absolute left-1/2 top-[38px] -translate-x-1/2 whitespace-nowrap font-pixel text-[33px] leading-none text-[#FF0000]">
              {label}
            </div>
          ))}
        <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
      </div>
    )
  }

  // 콘텐츠 노드 — 열람(흰 30px) / 미열람(회색 19px). 라벨은 도트 오른쪽.
  const label = data.label as string
  const isUnlocked = data.isUnlocked as boolean
  const size = isUnlocked ? SIZE_UNLOCKED : SIZE_LOCKED
  const indexItems = (data.indexItems as string[] | undefined) ?? []
  const indexCount = (data.indexCount as number | undefined) ?? indexItems.length
  const readCount = (data.readCount as number | undefined) ?? 0
  // 열람 노드: 목차 원+제목(읽은 만큼 채움). 잠긴 노드: 목차 개수만큼 빈 원만.
  const showToc = showLabel && indexCount > 0

  return (
    <div className="relative flex items-center justify-center">
      <Handle type="target" position={Position.Top} style={centerHandleStyle} isConnectable={false} />

      {/* 도트 — 별자리 모드(줌아웃)에선 회색(미열람) 노드는 사라지고 흰색만 남는다 */}
      <div
        className="rounded-full transition-all duration-300"
        style={{
          width: size,
          height: size,
          backgroundColor: isUnlocked ? COLOR_UNLOCKED : COLOR_LOCKED,
          opacity: isUnlocked || detailVisible ? 1 : 0,
        }}
      />

      {/* 제목 — 도트 오른쪽, 세로 중앙. 줌 임계값 이상일 때만 표시. 외곽선으로 엣지 위에 또렷이. */}
      {showLabel && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 whitespace-nowrap font-pixel leading-none"
          style={{
            marginLeft: LABEL_GAP,
            fontSize: LABEL_SIZE,
            color: isUnlocked ? LABEL_COLOR_UNLOCKED : LABEL_COLOR_LOCKED,
            textShadow: TEXT_OUTLINE,
          }}
        >
          {label}
        </div>
      )}

      {/* 목차(TOC) — 도트 아래 */}
      {showToc && isUnlocked && (
        // 열람 노드: 원(읽은 만큼 흰색) + 제목
        <div className="absolute left-0 top-full mt-[12px] flex flex-col gap-[6px] whitespace-nowrap">
          {indexItems.map((item, i) => {
            const read = i < readCount
            return (
              <div key={i} className="flex items-center gap-[10px]">
                <span
                  className="shrink-0 rounded-full border-2 border-white"
                  style={{ width: TOC_DOT, height: TOC_DOT, backgroundColor: read ? '#ffffff' : 'transparent' }}
                />
                <span
                  className="font-myeongjo leading-none text-white"
                  style={{ fontSize: TOC_TEXT_SIZE, textShadow: TEXT_OUTLINE }}
                >
                  {item}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {showToc && !isUnlocked && (
        // 잠긴 노드: 목차 개수만큼 빈 회색 원만 (제목 없음)
        <div className="absolute left-0 top-full mt-[10px] flex flex-col gap-[6px]">
          {Array.from({ length: indexCount }).map((_, i) => (
            <span
              key={i}
              className="shrink-0 rounded-full border-2"
              style={{ width: TOC_DOT_LOCKED, height: TOC_DOT_LOCKED, borderColor: COLOR_LOCKED }}
            />
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
    </div>
  )
}
