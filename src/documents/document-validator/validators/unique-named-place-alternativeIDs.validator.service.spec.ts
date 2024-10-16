import { UniqueNamedPlaceAlternativeIDsValidatorService } from "./unique-named-place-alternativeIDs.validator.service";
import { HttpException } from "@nestjs/common";
import { NamedPlacesService } from "src/named-places/named-places.service";
import { ValidationException } from "../document-validator.utils";
import { NamedPlace as _NamedPlace } from "src/named-places/named-places.dto";
import { PaginatedDto } from "src/pagination.utils";
import { Test, TestingModule } from "@nestjs/testing";

type NamedPlace = Pick<_NamedPlace, "collectionID" | "alternativeIDs"> & {
	id?: string
};

describe("UniqueNamedPlaceAlternativeIDsValidatorService", () => {
	let service: UniqueNamedPlaceAlternativeIDsValidatorService;
	let namedPlacesServiceMock: jest.Mocked<NamedPlacesService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UniqueNamedPlaceAlternativeIDsValidatorService,
				{
					provide: NamedPlacesService,
					useValue: {
						getPage: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<UniqueNamedPlaceAlternativeIDsValidatorService>(
			UniqueNamedPlaceAlternativeIDsValidatorService
		);
		namedPlacesServiceMock = module.get(NamedPlacesService);
	});

	describe("validate", () => {
		it("should throw HttpException if collectionID is not provided", async () => {
			const namedPlace: NamedPlace = { alternativeIDs: ["123"] };

			await expect(service.validate(namedPlace)).rejects.toThrow(HttpException);
		});

		it("should throw ValidationException if there are duplicate alternative IDs", async () => {
			const namedPlace: NamedPlace = {
				id: "someId",
				collectionID: "collectionId",
				alternativeIDs: ["123", "456"]
			};
			const existingNamedPlaces = [{ id: "existingId" }] as _NamedPlace[];

			namedPlacesServiceMock.getPage.mockResolvedValue(
				{ results: existingNamedPlaces } as PaginatedDto<_NamedPlace>
			);

			await expect(service.validate(namedPlace)).rejects.toThrow(ValidationException);
		});

		it("should not throw ValidationException if there are no duplicate alternative IDs", async () => {
			const namedPlace: NamedPlace = {
				id: "someId",
				collectionID: "collectionId",
				alternativeIDs: ["123", "456"]
			};
			const existingNamedPlaces = [] as _NamedPlace[];

			namedPlacesServiceMock.getPage.mockResolvedValue(
				{ results: existingNamedPlaces } as PaginatedDto<_NamedPlace>
			);

			await expect(service.validate(namedPlace)).resolves.not.toThrow(ValidationException);
		});

		it("should not throw ValidationException when existing named places return the same place", async () => {
			const namedPlace: NamedPlace = {
				id: "someId",
				collectionID: "collectionId",
				alternativeIDs: ["123", "456"]
			};
			const existingNamedPlaces = [ namedPlace ];

			namedPlacesServiceMock.getPage.mockResolvedValue(
				{ results: existingNamedPlaces } as PaginatedDto<_NamedPlace>
			);

			await expect(service.validate(namedPlace)).resolves.not.toThrow(ValidationException);
		});
	});
});
