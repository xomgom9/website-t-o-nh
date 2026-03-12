
export enum AspectRatio {
  Square = "1:1",
  Portrait = "3:4",
  Landscape = "4:3",
  WidePortrait = "9:16",
  WideLandscape = "16:9"
}

export enum ImageSize {
  OneK = "1K",
  TwoK = "2K",
  FourK = "4K"
}

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  batchSize: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  config: GenerationConfig;
  timestamp: number;
  isProduct?: boolean;
}

export interface GenerationSession {
  id: string;
  prompt: string;
  images: GeneratedImage[];
  timestamp: number;
  config: GenerationConfig;
}

export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
}

export type RemixMode = 'text-to-image' | 'remix' | 'product-studio';

export interface RemixConfig {
  creativity: number;
  structureMatch: boolean;
  characterMatch: boolean;
}

export type WorkspaceStatus = 'idle' | 'generating' | 'success' | 'error';

export interface Workspace {
  id: string;
  name: string;
  activeTab: RemixMode;
  prompt: string;
  isGenerating: boolean;
  isProductMode: boolean; // Toggle for generating isolated products
  status: WorkspaceStatus;
  
  remixImage: string | null;
  remixConfig: RemixConfig;

  generatedBatch: GeneratedImage[];
  selectedImageId: string | null;
  
  // Shared Library of assets for this workspace
  productAssets: GeneratedImage[];
  
  config: GenerationConfig;
}

export type LayerType = 'base' | 'text' | 'image';

export interface BaseLayer {
  id: string;
  type: 'base';
  url: string;
  visible: boolean;
  filters: ImageFilters;
}

export interface TextLayer {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  gradient?: {
    enabled: boolean;
    colors: string[];
    direction: 'horizontal' | 'vertical';
  };
  visible: boolean;
}

export interface ImageLayer {
  id: string;
  type: 'image';
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  opacity: number;
}

export type Layer = BaseLayer | TextLayer | ImageLayer;
