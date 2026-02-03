
export type Part = { text: string; } | { inlineData: { mimeType: string; data: string; }; };

export interface ImageMetadata {
  description: string;
  altText: string;
  seoKeywords: string; // Comma-separated string of keywords
}

export interface ImagePair {
  id: string;
  parentId: string; // Reference to the image ID this was generated from ('root' for mainImage)
  after: string; // base64 data URL
  prompt: string;
  editMode: EditMode;
  customPrompt: string;
  beforeMetadata?: ImageMetadata;
  afterMetadata?: ImageMetadata;
  isDeleted?: boolean;
  // Fields for gallery/history
  createdAt?: number; // timestamp
  sessionName?: string;
}

export type SportType = 'baseball' | 'football' | 'basketball' | 'hockey' | 'soccer' | 'cheerleader' | 'official';

export type ConsoleType = 'generic' | 'xbox' | 'playstation' | 'nintendo' | 'pc';

export type WantedStyle = 'fbi' | 'western';

export type EdgeStyle = 'lineArt' | 'depthMap' | 'cannyEdge' | 'heatMap';

export type EditMode = 
  'freestyle' | 
  'edit' |
  'styleTransfer' |
  'actionFigure' | 
  'characterSheet' | 
  'straighten' | 
  'diorama' |
  'grid12x' |
  'strip3x' |
  'edge' |
  'panel4x' |
  'photorealistic' |
  'comicPage' |
  'comicSplash' |
  'comicBookCover' |
  'puppet' |
  'videoGameCover' |
  'bw' |
  'pinup' |
  'magHarpers' |
  'magSyrens' |
  'magJoxtrap' |
  'magFreestyle' |
  'horrorMoviePoster' |
  'fantasyMoviePoster' |
  'gothicArt' |
  'watercolor' |
  'mtgCard' |
  'nonSportsCard' |
  'sportsCard' |
  'illustration' |
  'animeManga' |
  'vintageBurlesquePostcard' |
  'vintagePostcard' |
  'sciFiMoviePoster' |
  'badgePhoto' |
  'wantedPoster' |
  'asSeenOnTV' |
  'veoVideo';
