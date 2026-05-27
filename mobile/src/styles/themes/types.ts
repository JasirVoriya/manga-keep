export interface ThemeTokens {
  // 基础层级
  background: string;
  surface: string;
  surfaceSoft: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  shadow: string;

  // 文字层级
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnBrand: string;
  textOnAccent: string;

  // 品牌与操作
  brand: string;
  brandSoft: string;
  accent: string;
  accentSoft: string;
  focus: string;
  pressed: string;

  // 收藏状态
  owned: string;
  ownedSoft: string;
  missing: string;
  missingSoft: string;
  wanted: string;
  wantedSoft: string;
  unmarked: string;

  // 反馈与风险
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
}
