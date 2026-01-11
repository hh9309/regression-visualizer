
import { DataPoint } from './types';

/**
 * 经典高尔顿(Galton)身高数据 (简化抽样)
 * parent: 父母平均身高 (英寸)
 * child: 成年子女身高 (英寸)
 */
export const GALTON_DATA: DataPoint[] = [
  { parent: 64.0, child: 63.0 }, { parent: 64.5, child: 66.0 },
  { parent: 65.0, child: 65.0 }, { parent: 65.5, child: 65.5 },
  { parent: 66.0, child: 67.0 }, { parent: 66.5, child: 66.5 },
  { parent: 67.0, child: 68.0 }, { parent: 67.5, child: 67.0 },
  { parent: 68.0, child: 69.5 }, { parent: 68.5, child: 68.5 },
  { parent: 69.0, child: 69.0 }, { parent: 69.5, child: 70.0 },
  { parent: 70.0, child: 69.5 }, { parent: 70.5, child: 70.5 },
  { parent: 71.0, child: 72.0 }, { parent: 71.5, child: 71.0 },
  { parent: 72.0, child: 71.0 }, { parent: 72.5, child: 72.5 },
  { parent: 73.0, child: 73.0 }, { parent: 74.0, child: 72.0 }
];

export const INITIAL_PARAMS = {
  slope: 0.5,
  intercept: 30
};
