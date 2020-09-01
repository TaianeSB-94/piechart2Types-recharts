type TilingOption = 'treemapBinary' | 'treemapDice' | 'treemapSlice' | 'treemapSliceDice' | 'treemapSquarify';
type pieRadiusOptions = '0' | '60';

export interface TreemapOptions {
  tiling: TilingOption;
  textField: string;
  sizeField: string;
  colorField: string;
  pieOptions: pieRadiusOptions;
}
