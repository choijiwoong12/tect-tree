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

// 크기 체계: 열람 노드는 항상 '확장' 크기. 미열람 노드는 기본 '작은' 크기(24pt) → hover 시 확장(30)+목차 표시.
const SIZE_EXPANDED = 30 // 확장(열람 / 미열람 hover) 도트
const SIZE_SMALL = 24 // 미열람 기본 도트
const COLOR_UNLOCKED = '#ffffff'
const COLOR_LOCKED = '#404040'
const LABEL_COLOR_UNLOCKED = '#ffffff'
const LABEL_COLOR_LOCKED = '#595959'
const LABEL_SIZE = 33 // 확장 제목 = 열람 노드(항상) / 미열람 hover
const LABEL_SIZE_SMALL = 26 // 미열람 기본 제목 (도트와 같은 비율로 확대: 33 × 24/30)
const LABEL_GAP = 6 // 도트 오른쪽 라벨 간격
const TOC_DOT = 14 // 목차 원 지름(hover 리스트)
const TOC_TEXT_SIZE = 17 // NanumMyeongjo 목차 텍스트
const CLOCK_DOT = 6 // 미열람 기본 시계형 목차 점 지름

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

  const hoverActive = hovered && detailVisible // 별자리(줌아웃)에선 hover 무시
  // 크기: 열람 노드는 항상 확장 크기(hover에도 변화 없음), 미열람은 hover 시에만 확장
  const big = isViewed || hoverActive
  const dotSize = big ? SIZE_EXPANDED : SIZE_SMALL
  const titleSize = big ? LABEL_SIZE : LABEL_SIZE_SMALL
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

      {/* 목차(TOC) 리스트 — hover 시 페이드인+슬라이드(열람/미열람 공통). 항상 렌더해두고 opacity로
          전환해야 부드럽다(조건부 마운트는 탁 하고 바뀜). 숨김 상태에선 hover 영역을 넓히지 않게 클릭/hover 통과. */}
      {showToc && (
        <div
          className="absolute left-0 top-full mt-[10px] flex flex-col gap-[6px] whitespace-nowrap rounded-[2px] transition-all duration-300 ease-out"
          style={{
            backgroundColor: '#000',
            padding: '6px 8px',
            opacity: hoverActive ? 1 : 0,
            transform: hoverActive ? 'translateY(0)' : 'translateY(-6px)',
            pointerEvents: hoverActive ? 'auto' : 'none',
          }}
        >
          {indexItems.map((item, i) => {
            const read = isViewed && i < readCount
            return (
              <div key={i} className="flex items-center gap-[10px]">
                <span
                  className="shrink-0 rounded-full border-2"
                  style={{ width: TOC_DOT, height: TOC_DOT, borderColor: fg, backgroundColor: read ? '#ffffff' : 'transparent' }}
                />
                <span className="font-myeongjo leading-none" style={{ fontSize: TOC_TEXT_SIZE, color: fg }}>
                  {item}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {showToc && (
        // 기본(비hover): 목차 개수만큼 작은 점을 도트 주위에 시계 문자판처럼 원형 배치(12시부터 시계방향).
        // 열람 노드는 읽은 항목까지 흰 점, 나머지는 회색. hover 시 페이드아웃(리스트와 크로스페이드).
        <>
          {Array.from({ length: indexCount }).map((_, i) => {
            const stepDeg = indexCount > 12 ? 360 / indexCount : 30
            const rad = ((-90 + i * stepDeg) * Math.PI) / 180
            const radius = dotSize / 2 + 9
            const x = Math.cos(rad) * radius
            const y = Math.sin(rad) * radius
            const read = isViewed && i < readCount
            return (
              <span
                key={i}
                className="pointer-events-none absolute left-1/2 top-1/2 z-[1] rounded-full transition-opacity duration-300"
                style={{
                  width: CLOCK_DOT,
                  height: CLOCK_DOT,
                  backgroundColor: read ? '#ffffff' : COLOR_LOCKED,
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  opacity: hoverActive ? 0 : 1,
                }}
              />
            )
          })}
        </>
      )}

      <Handle type="source" position={Position.Bottom} style={centerHandleStyle} isConnectable={false} />
    </div>
  )
}
