type SwellErrorOptions = {
  status?: number;
  method?: string;
  endpointUrl?: string;
};

type SwellData = {
  [key: string]: any;
};

type SwellRecord = {
  id: string;
  [key: string]: any;
};

type SwellCollection = {
  count: number;
  results: SwellRecord[];
  pages: Array<any>; // FIXME
  page_count: number;
};

interface SwellThemeConfig extends SwellRecord {
  id: string;
  type: string;
  file_data: string;
  file_path: string;
}