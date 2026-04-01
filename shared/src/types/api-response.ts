export type ApiResponse<TData> =
  | {
      success: true;
      data: TData;
      meta?: Record<string, string | number | boolean>;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        details?: Record<string, string | number | boolean>;
      };
    };

export interface PaginatedResponse<TData> {
  items: TData[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
