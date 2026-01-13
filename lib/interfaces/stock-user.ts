export interface Stock {
  code: string;
  name: string;
  industry: string;
  marketPrice?: number;
}

export interface StockCompany {
  _id: string;
  name: string;
  buyFeeRate: number;
  sellFeeRate: number;
  taxRate: number;
  isDefault?: boolean;
}

export interface StockUser {
  _id: string;
  stockCode: string;
  costPrice: number;
  company: StockCompany | string;
  createdAt: string;
  updatedAt: string;
}
