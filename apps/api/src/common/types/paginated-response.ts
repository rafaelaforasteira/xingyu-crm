export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function paginate<T>(
  data: T[],
  total: number,
  page = 1,
  pageSize = 20,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export function paginationArgs(page = 1, pageSize = 20) {
  const take = pageSize;
  const skip = (page - 1) * pageSize;
  return { skip, take };
}
