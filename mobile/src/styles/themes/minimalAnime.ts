import { ThemeTokens } from './types';

export const minimalAnime: ThemeTokens = {
  // 基础层级
  background: '#FCF9F2', // Warm vanilla / 暖香草色
  surface: '#FFFFFF', // Pure white / 纯白卡片或悬浮层
  surfaceSoft: '#FAF6EF', // 弱分区底色
  surfaceRaised: '#FFFFFF', // 弹窗底色
  border: '#ead6c3', // 暖纸边框
  borderStrong: '#b98564', // 强调边框
  shadow: 'rgba(122, 74, 48, 0.1)', // 暖棕阴影

  // 文字层级
  textPrimary: '#3f2518', // 深咖正文
  textSecondary: '#6f4d3c', // 暖棕说明文字
  textMuted: '#8a6a59', // 辅助信息，避免灰蒙蒙
  textOnBrand: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // 品牌与操作
  brand: '#7a4a30', // 品牌色：暖书架棕
  brandSoft: 'rgba(122, 74, 48, 0.14)',
  accent: '#9b6242', // 强调色：同色系暖棕
  accentSoft: 'rgba(155, 98, 66, 0.14)',
  focus: '#A1C4FD', // 焦点色：婴儿蓝 (Baby Blue)
  pressed: '#A38D84',

  // 收藏状态 (严格遵循 ui-pages，但使用高级柔和色调 Pastel)
  owned: '#7a4a30', // 已有 - 书架棕
  ownedSoft: 'rgba(122, 74, 48, 0.14)',
  missing: '#D9B2B2', // 缺本 - 浅玫瑰粉灰 (Rose/Warm Grey)
  missingSoft: 'rgba(217, 178, 178, 0.15)',
  wanted: '#9b6242', // 想要 - 暖棕强调
  wantedSoft: 'rgba(155, 98, 66, 0.15)',
  unmarked: 'transparent',

  // 反馈与风险
  success: '#9DC4A8', // Pastel green
  successSoft: 'rgba(157, 196, 168, 0.15)',
  warning: '#FFCF85', // Pastel yellow
  warningSoft: 'rgba(255, 207, 133, 0.15)',
  danger: '#E8A2A2', // Pastel red / 低饱和玫红危险色
  dangerSoft: 'rgba(232, 162, 162, 0.15)',
  info: '#A1C4FD', // Baby blue
  infoSoft: 'rgba(161, 196, 253, 0.15)',
};
