import '@emotion/react';
import { tokens } from './tokens';

declare module '@emotion/react' {
  export interface Theme {
    colors: typeof tokens.colors;
    spacing: typeof tokens.spacing;
    typography: typeof tokens.typography;
    borderRadius: typeof tokens.borderRadius;
    shadows: typeof tokens.shadows;
    components: {
      button: typeof tokens.components.button;
    };
  }
} 