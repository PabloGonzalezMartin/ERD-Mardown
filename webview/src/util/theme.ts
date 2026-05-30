import type { Theme } from '../store/uiStore';

export interface ThemeTokens {
  // surfaces
  bg: string;
  bgSubtle: string;
  bgHover: string;
  surface: string;
  border: string;
  borderSubtle: string;
  // text
  text: string;
  textMuted: string;
  textFaint: string;
  // interactive
  btnBg: string;
  btnBorder: string;
  btnText: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  // accents
  greenBg: string;
  greenBorder: string;
  greenText: string;
  versionBg: string;
  // input
  inputBg: string;
}

const dark: ThemeTokens = {
  bg: '#1e1e1e',
  bgSubtle: '#252525',
  bgHover: '#333',
  surface: '#2c2c2c',
  border: '#444',
  borderSubtle: '#3a3a3a',
  text: '#eeeeee',
  textMuted: '#aaaaaa',
  textFaint: '#666666',
  btnBg: '#383838',
  btnBorder: '#555',
  btnText: '#e0e0e0',
  activeBg: '#4a7c9e',
  activeBorder: '#4a7c9e',
  activeText: '#ffffff',
  greenBg: '#2d5a3d',
  greenBorder: '#3a7a4e',
  greenText: '#8fcc9f',
  versionBg: '#3a3a5a',
  inputBg: '#2e2e2e',
};

const light: ThemeTokens = {
  bg: '#ffffff',
  bgSubtle: '#f5f5f5',
  bgHover: '#e8e8e8',
  surface: '#f0f0f0',
  border: '#cccccc',
  borderSubtle: '#e0e0e0',
  text: '#1a1a1a',
  textMuted: '#555555',
  textFaint: '#999999',
  btnBg: '#e8e8e8',
  btnBorder: '#bbb',
  btnText: '#1a1a1a',
  activeBg: '#1a6fa8',
  activeBorder: '#1a6fa8',
  activeText: '#ffffff',
  greenBg: '#d4edda',
  greenBorder: '#4caf50',
  greenText: '#1b5e20',
  versionBg: '#e8e8f5',
  inputBg: '#ffffff',
};

export function getTheme(t: Theme): ThemeTokens {
  return t === 'dark' ? dark : light;
}
