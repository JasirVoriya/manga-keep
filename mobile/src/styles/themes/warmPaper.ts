import { ThemeTokens } from './types';

export const warmPaper: ThemeTokens = {
  // 基础层级
  background: '#fff7ed', // 暖纸色
  surface: '#ffffff', // 纯白卡片
  surfaceSoft: '#fffaf0', // 弱分区底色
  surfaceRaised: '#fffbeb', // 弹窗底色
  border: '#f3d6bf', // 普通边框
  borderStrong: '#d89b72', // 强调边框
  shadow: 'rgba(154, 52, 18, 0.1)', // 阴影

  // 文字层级
  textPrimary: '#3b1d12', // 墨色正文
  textSecondary: '#7c5d4a', // 弱说明文字
  textMuted: '#8b6a55', // 辅助信息，避免灰蒙蒙
  textOnBrand: '#ffffff',
  textOnAccent: '#ffffff',

  // 品牌与操作
  brand: '#9a3412', // 书架棕
  brandSoft: 'rgba(154, 52, 18, 0.1)',
  accent: '#f97316', // 强调橙色
  accentSoft: 'rgba(249, 115, 22, 0.1)',
  focus: '#2563eb', // 焦点蓝
  pressed: '#7c2d12',

  // 收藏状态
  owned: '#9a3412', // 已有 - 书架棕
  ownedSoft: 'rgba(154, 52, 18, 0.1)',
  missing: '#7c5d4a', // 缺本 - 暖棕，灰度只用于封面本身
  missingSoft: 'rgba(124, 93, 74, 0.12)',
  wanted: '#f97316', // 想要 - 橙色
  wantedSoft: 'rgba(249, 115, 22, 0.1)',
  unmarked: 'transparent',

  // 反馈与风险
  success: '#15803d',
  successSoft: 'rgba(21, 128, 61, 0.1)',
  warning: '#f59e0b', // 金橙警告
  warningSoft: 'rgba(245, 158, 11, 0.1)',
  danger: '#e11d48',
  dangerSoft: 'rgba(225, 29, 72, 0.1)',
  info: '#2563eb',
  infoSoft: 'rgba(37, 99, 235, 0.1)',
};
