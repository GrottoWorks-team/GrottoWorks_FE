export type GrottoAssetCategory = 'ROCKS' | 'STATUES' | 'LIGHTING' | 'DECORATION';

export interface MaterialRequirement {
  materialName: string;
  defaultQty: number;
  unit: string;
  specs?: string;
}

export interface GrottoAssetDef {
  assetId: string;
  name: string;
  category: GrottoAssetCategory;
  defaultWidth: number;
  defaultHeight: number;
  svgMarkup: string;
  materialReq: MaterialRequirement;
}

export interface GrottoCanvasItem {
  instanceId: string;
  assetId: string;
  name: string;
  category: GrottoAssetCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  materialReq: {
    materialName: string;
    quantity: number;
    unit: string;
  };
}

export interface GrottoDesignDraft {
  areaId: string;
  seasonId?: string;
  title: string;
  canvasWidth: number;
  canvasHeight: number;
  items: GrottoCanvasItem[];
  updatedAt: string;
  version: number;
}
