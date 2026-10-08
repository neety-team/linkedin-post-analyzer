import { createContext, useContext } from 'react';

/* Tema claro / oscuro (08-oct-2026).
 *
 * Las clases de Tailwind se recolorean solas: los tokens de index.css cambian
 * con data-theme en <html>. Lo que NO se recolorea solo son los colores que
 * recharts recibe como props (stroke, fill, tick...) y los estilos en línea:
 * esos salen de useChartColors(), que devuelve la paleta del tema activo.
 *
 * El proveedor vive en ThemeProvider.tsx. La elección se guarda en localStorage; sin elección, manda el sistema. El
 * script de index.html pone data-theme ANTES de pintar, para que no parpadee. */

export type Theme = 'light' | 'dark';

/* Tonos categóricos (pilares, tipos de contenido, ganchos...). En claro, la
   versión que se lee sobre fondo claro; en oscuro, la viva de siempre. */
const HUES_LIGHT = {
  orange: '#E8701E', indigo: '#4F52D9', violet: '#7C5CD6', red: '#C0362C',
  amber: '#B07510', blue: '#5B8FE0', lavender: '#9A7FE0', rose: '#E07878',
  gold: '#D4A21C', green: '#1E9160', sky: '#0A66C2', cyan: '#0E8FA8',
  pink: '#C2408A', rust: '#B4531A', lime: '#2FA866', periwinkle: '#6B6EE6',
  yellow: '#B8930A', purple: '#A15CD6', slate: '#76607A', teal: '#13998A',
  magenta: '#B83FC4', grey: '#7A6B7B', plum: '#7E3AA8',
};
type Hues = typeof HUES_LIGHT;
const HUES_DARK: Hues = {
  orange: '#FE8238', indigo: '#818CF8', violet: '#A78BFA', red: '#F87171',
  amber: '#FBBF24', blue: '#93C5FD', lavender: '#C4B5FD', rose: '#FCA5A5',
  gold: '#FCD34D', green: '#34D399', sky: '#38BDF8', cyan: '#22D3EE',
  pink: '#F472B6', rust: '#FB923C', lime: '#4ADE80', periwinkle: '#A5B4FC',
  yellow: '#FACC15', purple: '#C084FC', slate: '#A895A9', teal: '#2DD4BF',
  magenta: '#E879F9', grey: '#8E7C90', plum: '#C99BF0',
};

const LIGHT = {
  grid: '#D9E0EA',
  axis: '#6C5C72',
  text: '#431B44',
  text2: '#5F4762',
  muted: '#6C5C72',
  faint: '#8E8296', // etiquetas secundarias, "pocos datos"
  refLine: '#A79DB0',
  tooltipBg: '#FAFCFE',
  tooltipBorder: '#D5DCE7',
  tooltipShadow: '0 6px 20px rgba(42,14,44,0.14)',
  well: '#EEF2F9',
  cursor: 'rgba(67,27,68,0.06)',
  emptyCell: '#DCE3ED',
  /** Métricas de LinkedIn (impresiones, seguidores): el teal de su analítica. */
  data: '#1A707E',
  /** Interacciones y lo nuestro: naranja de marca. */
  engagement: '#E8701E',
  linkedin: '#0A66C2',
  success: '#01754F',
  danger: '#C0362C',
  diamond: '#7E3AA8',
  diamondSoft: 'rgba(126,58,168,0.14)',
  accent: '#C55A0E',
  accentSoft: 'rgba(197,90,14,0.07)',
  onAccent: '#FFFFFF',
  /** Botón sólido "Ver en LinkedIn": su azul con texto blanco, en los dos modos. */
  linkedinSolid: '#0A66C2',
  onColor: '#FFFFFF',
  pencil: '#8E8296',
  heatHot: ['#FBD3B8', '#F59A5E', '#E8701E'],
  heatData: ['#C5E0E4', '#6FAAB4', '#1A707E'],
  hue: HUES_LIGHT,
};
export type ChartColors = typeof LIGHT;

const DARK: ChartColors = {
  grid: '#3A253D',
  axis: '#A895A9',
  text: '#F8F7EC',
  text2: '#D3C6D3',
  muted: '#A895A9',
  faint: '#7D6A7F',
  refLine: '#5E4A61',
  tooltipBg: '#2E1931',
  tooltipBorder: '#4A3350',
  tooltipShadow: '0 6px 20px rgba(0,0,0,0.45)',
  well: '#200F22',
  cursor: 'rgba(248,247,236,0.06)',
  emptyCell: '#2C1830',
  data: '#5BB8C4',
  engagement: '#FE8238',
  linkedin: '#71B7FB',
  success: '#4CC38A',
  danger: '#F27B6F',
  diamond: '#C99BF0',
  diamondSoft: 'rgba(201,155,240,0.16)',
  accent: '#FE8238',
  accentSoft: 'rgba(254,130,56,0.08)',
  onAccent: '#2A0E2C',
  linkedinSolid: '#0A66C2',
  onColor: '#FFFFFF',
  pencil: '#5E4A61',
  heatHot: ['#5A2E1E', '#B5602F', '#FE8238'],
  heatData: ['#123B42', '#2F7F8A', '#5BB8C4'],
  hue: HUES_DARK,
};

export const STORAGE_KEY = 'neety-theme';

export interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}
export const ThemeContext = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} });

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}

/** Paleta de las gráficas y estilos en línea del tema activo. */
export function useChartColors(): ChartColors {
  return useContext(ThemeContext).theme === 'dark' ? DARK : LIGHT;
}
