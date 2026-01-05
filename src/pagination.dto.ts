export class PaginatedDto<T> {
	currentPage: number;
	pageSize: number;
	total: number;
	lastPage: number;
	prevPage?: number;
	nextPage?: number;
	results: T[];
	"@context": string;
}
