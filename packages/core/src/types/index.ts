export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface AnimationDefinition {
  frames: number[];
  loop: boolean;
}

export interface SpriteMetadata {
  frameWidth: number;
  frameHeight: number;
  animations: {
    idle: AnimationDefinition;
    react: AnimationDefinition;
  };
}

export interface MascotConfig {
  spritesheet: string;
  metadata: string;
  size?: number;
  fps?: number;
  position?: Position;
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
}
