import { StickyTheme } from '@/types';

export interface ThemePalette {
  id: StickyTheme;
  label: string;
  swatch: string;
  bodyBg: string;
  headerBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  buttonHover: string;
  divider: string;
}

export const STICKY_THEMES: Record<StickyTheme, ThemePalette> = {
  yellow: {
    id: 'yellow',
    label: 'Classic Yellow',
    swatch: '#F6EB61',
    bodyBg: '#FDF8A6',
    headerBg: '#F5E960',
    border: '#E2D245',
    textPrimary: '#232011',
    textSecondary: '#4E4722',
    textMuted: '#786F38',
    inputBg: 'rgba(255, 255, 255, 0.35)',
    buttonHover: 'rgba(0, 0, 0, 0.08)',
    divider: 'rgba(180, 162, 35, 0.35)',
  },
  blue: {
    id: 'blue',
    label: 'Sky Blue',
    swatch: '#9ED6F0',
    bodyBg: '#D2EEF9',
    headerBg: '#A9DCF3',
    border: '#7EC3E3',
    textPrimary: '#10242E',
    textSecondary: '#284C5E',
    textMuted: '#4C7387',
    inputBg: 'rgba(255, 255, 255, 0.35)',
    buttonHover: 'rgba(0, 0, 0, 0.08)',
    divider: 'rgba(92, 164, 199, 0.35)',
  },
  green: {
    id: 'green',
    label: 'Mint Green',
    swatch: '#A3E496',
    bodyBg: '#D4F5CE',
    headerBg: '#ACE7A0',
    border: '#83CE74',
    textPrimary: '#132810',
    textSecondary: '#2C5327',
    textMuted: '#4C7A45',
    inputBg: 'rgba(255, 255, 255, 0.35)',
    buttonHover: 'rgba(0, 0, 0, 0.08)',
    divider: 'rgba(105, 179, 91, 0.35)',
  },
  pink: {
    id: 'pink',
    label: 'Rose Pink',
    swatch: '#F1AFD7',
    bodyBg: '#F9D6EB',
    headerBg: '#F2B5DA',
    border: '#DC8FBE',
    textPrimary: '#2C1222',
    textSecondary: '#5B2B49',
    textMuted: '#864B70',
    inputBg: 'rgba(255, 255, 255, 0.35)',
    buttonHover: 'rgba(0, 0, 0, 0.08)',
    divider: 'rgba(204, 122, 173, 0.35)',
  },
  purple: {
    id: 'purple',
    label: 'Lavender',
    swatch: '#C5B0F4',
    bodyBg: '#E3D7FA',
    headerBg: '#CBB8F5',
    border: '#AA93E0',
    textPrimary: '#1E1533',
    textSecondary: '#3F2E66',
    textMuted: '#655091',
    inputBg: 'rgba(255, 255, 255, 0.35)',
    buttonHover: 'rgba(0, 0, 0, 0.08)',
    divider: 'rgba(147, 121, 207, 0.35)',
  },
  dark: {
    id: 'dark',
    label: 'Charcoal Dark',
    swatch: '#272C36',
    bodyBg: '#1E222A',
    headerBg: '#15181F',
    border: '#343B48',
    textPrimary: '#F3F4F6',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    inputBg: 'rgba(255, 255, 255, 0.06)',
    buttonHover: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.12)',
  },
};
