'use client'

import { useState } from 'react'
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

// 크기 체계: 열람 노드는 항상 '확장' 크기. 미열람 노드는 기본 '작은' 크기 → hover 시 2배(=확장)로 커지며 목차 표시.
const SIZE_EXPANDED = 30 // 확장(열람 / 미열람 hover) 도트
const SIZE_SMALL = 15 // 미열람 기본 도트 (확장의 절반)
const COLOR_UNLOCKED = '#ffffff'
const COLOR_LOCKED = '#404040'
const LABEL_COLOR_UNLOCKED = '#ffffff'
const LABEL_COLOR_LOCKED = '#595959'
const LABEL_SIZE = 33 // 확장 제목 = 열람 노드(항상) / 미열람 hover
const LABEL_SIZE_SMALL = 17 // 미열람 기본 제목
const LABEL_GAP = 6 // 도트 오른쪽 라벨 간격
const TOC_DOT = 14 // 목차 원 지름(확장)
const TOC_DOT_SMALL = 7 // 목차 원 지름(미열람 기본, 절반)
const TOC_TEXT_SIZE = 17 // NanumMyeongjo 목차 텍스트

// 루트 과녁 안쪽 채움(뒤 흰 노드/선 가림). 노드는 zIndex로 엣지 위에 있어 글씨가 선에 안 가려지고,
// 엣지를 끊는 검은 배경/링은 두지 않는다(엣지 연속성 유지).
const NODE_BG = '#000'

export function DotNode({ data }: NodeProps) {
  // 줌아웃(별자리 모드)이면 false → 라벨/목차/회색 노드 숨김
  const detailVisible = useDetailVisible()
  const [hovered, setHovered] = useState(false) // 미열람 노드 hover 확장용
  const isRoot = data.isRoot as boolean
  const showLabel = detailVisible

  // 루트(유저) 노드 — 빨강 과녁(◎): 외곽 링 30px(4px) + 중앙 점 10px.
  if (isRoot) {
    const loggedIn = data.isLoggedIn as boolean
    const label = data.label as string
    return (
      <div className="relative flex flex-col items-center">
        <Handle type="target" position={Position.Top} style={centerHandleStyle} isConnectable={false} />
        {/* 빨간 이중 원(과녁) — 안쪽 검정 채움(뒤 흰 노드/선 가림) + 둘레 검정 패딩(box-shadow)으로
            엣지가 과녁에 직접 닿지 않고 여백 밖에서 멈추게 (콘텐츠 노드 블록과 동일 취지) */}
        <div
          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border-[4px] border-[#FF0000]"
          style={{ backgroundColor: NODE_BG, boxShadow: '0 0 0 12px #000' }}
        >
          <div className="h-[10px] w-[10px] rounded-full bg-[#FF0000]" />
        </div>
        {showLabel &&
          (loggedIn ? (
            <div className="absolute left-1/2 top-[37px] -translate-x-1/2 flex flex-col items-center whitespace-nowrap text-center leading-none">
              <span className="font-pixel text-[16px] text-[#FF0000]">START HERE</span>
              <span className="mt-[6px] font-pixel text-[26px] text-white">{label}</span>
            </div>
          ) : (
            <div className="absolute left-1/2 top-[38px] -translate-x-1/2 whitespace-nowrap font-pixel text-[26px] leading-none text-[#FF0000]">
              {label}
            </div>
          ))}
        <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
      </div>
    )
  }

  // 콘텐츠 노드 — 열람한(=흰·큰)은 항상 확장. 미열람은 기본 작게, hover 시 2배(확장)+목차 제목.
  const label = data.label as string
  const isViewed = data.isViewed as boolean // 실제로 열어본 노드인가(시각)
  const indexItems = (data.indexItems as string[] | undefined) ?? []
  const indexCount = (data.indexCount as number | undefined) ?? indexItems.length
  const readCount = (data.readCount as number | undefined) ?? 0

  // 확장 = 열람한 노드(항상) 또는 디테일 모드에서 hover. 별자리(줌아웃)에선 hover로 안 커짐.
  const expanded = isViewed || (hovered && detailVisible)
  const dotSize = expanded ? SIZE_EXPANDED : SIZE_SMALL
  const titleSize = expanded ? LABEL_SIZE : LABEL_SIZE_SMALL
  const tocDotSize = expanded ? TOC_DOT : TOC_DOT_SMALL
  const fg = isViewed ? LABEL_COLOR_UNLOCKED : LABEL_COLOR_LOCKED // 미열람은 회색 유지
  const showToc = showLabel && indexCount > 0

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Top} style={centerHandleStyle} isConnectable={false} />

      {/* 노드 블록(동그라미+제목) — 검은 배경 한 덩어리. 엣지는 노드(zIndex)가 엣지 위라
          이 블록 뒤로 가려져, 제목 쪽 경계에서 자연스럽게 빠져나간다. 도트는 블록 위에 그린다.
          (목차는 배경 없는 별도 그룹으로 분리) */}
      {showLabel && (
        <div
          className="absolute left-1/2 top-1/2 flex items-center whitespace-nowrap rounded-[2px] transition-all duration-200"
          style={{ transform: `translate(${-(dotSize / 2 + 6)}px, -50%)`, backgroundColor: '#000', padding: '3px 8px 3px 6px' }}
        >
          {/* 도트 자리(투명) — 위에 실제 도트가 겹쳐 그려짐 */}
          <span className="shrink-0" style={{ width: dotSize, height: dotSize }} />
          <span
            className="font-pixel leading-none transition-all duration-200"
            style={{ marginLeft: LABEL_GAP, fontSize: titleSize, color: fg }}
          >
            {label}
          </span>
        </div>
      )}

      {/* 실제 도트 — 검은 블록(absolute) 위에 올리려면 positioned + z-index 필요.
          별자리 모드(줌아웃): 흰 노드+흰 엣지=별자리, 회색 노드는 점만 남아 배경 별처럼(엣지는 CSS로 숨김). */}
      <div
        className="relative z-[1] rounded-full transition-all duration-200"
        style={{
          width: dotSize,
          height: dotSize,
          backgroundColor: isViewed ? COLOR_UNLOCKED : COLOR_LOCKED,
        }}
      />

      {/* 목차(TOC) — 도트 아래 */}
      {showToc && expanded && (
        // 확장: 원 + 목차 제목. 열람은 읽은 만큼 채움, 미열람 hover는 빈 원.
        <div className="absolute left-0 top-full mt-[10px] flex flex-col gap-[6px] whitespace-nowrap">
          {indexItems.map((item, i) => {
            const read = isViewed && i < readCount
            return (
              <div key={i} className="flex items-center gap-[10px]">
                <span
                  className="shrink-0 rounded-full border-2"
                  style={{ width: tocDotSize, height: tocDotSize, borderColor: fg, backgroundColor: read ? '#ffffff' : 'transparent' }}
                />
                <span className="font-myeongjo leading-none" style={{ fontSize: TOC_TEXT_SIZE, color: fg }}>
                  {item}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {showToc && !expanded && (
        // 미열람 기본: 목차 개수만큼 작은 빈 회색 원만 (제목 없음)
        <div className="absolute left-0 top-full mt-[6px] flex flex-col gap-[5px]">
          {Array.from({ length: indexCount }).map((_, i) => (
            <span
              key={i}
              className="shrink-0 rounded-full border-2"
              style={{ width: tocDotSize, height: tocDotSize, borderColor: COLOR_LOCKED }}
            />
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
    </div>
  )
}
