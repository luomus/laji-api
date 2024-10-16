import { getAllFromPagedResource } from "./pagination.utils";

describe("getAllFromPagedResource", () => {

	type ExampleData = { id: number };

	it("should fetch all pages and concatenate results", async () => {
		const mockGetPage = jest.fn()
			.mockResolvedValueOnce({ results: [{ id: 1 }, { id: 2 }], lastPage: 3 })
			.mockResolvedValueOnce({ results: [{ id: 3 }, { id: 4 }], lastPage: 3 })
			.mockResolvedValueOnce({ results: [{ id: 5 }], lastPage: 3 });

		const result = await getAllFromPagedResource<ExampleData>(mockGetPage);

		expect(mockGetPage).toHaveBeenCalledTimes(3);
		expect(result).toEqual([
			{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }
		]);
	});

	it("should stop fetching when the last page is reached", async () => {
		const mockGetPage = jest.fn()
			.mockResolvedValueOnce({ results: [{ id: 1 }, { id: 2 }], lastPage: 2 })
			.mockResolvedValueOnce({ results: [{ id: 3 }], lastPage: 2 });

		const result = await getAllFromPagedResource<ExampleData>(mockGetPage);

		expect(mockGetPage).toHaveBeenCalledTimes(2);
		expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
	});

	it("should handle the case where there is only one page", async () => {
		const mockGetPage = jest.fn()
			.mockResolvedValueOnce({ results: [{ id: 1 }, { id: 2 }], lastPage: 1 });

		const result = await getAllFromPagedResource<ExampleData>(mockGetPage);

		expect(mockGetPage).toHaveBeenCalledTimes(1);
		expect(result).toEqual([{ id: 1 }, { id: 2 }]);
	});

	it("should work with different data types (generic case)", async () => {
		type Creature = { name: string };

		const mockGetPage = jest.fn()
			.mockResolvedValueOnce({ results: [{ name: "bilbo" }, { name: "gollum" }], lastPage: 1 });

		const result = await getAllFromPagedResource<Creature>(mockGetPage);

		expect(mockGetPage).toHaveBeenCalledTimes(1);
		expect(result).toEqual([{ name: "bilbo" }, { name: "gollum" }]);
	});
});
