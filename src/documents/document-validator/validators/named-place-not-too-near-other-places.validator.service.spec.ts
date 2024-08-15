import { Test, TestingModule } from "@nestjs/testing";
import { NamedPlaceNotTooNearOtherPlacesValidatorService }
	from "./named-place-not-too-near-other-places.validator.service";
import { NamedPlacesService } from "src/named-places/named-places.service";
import { NamedPlace } from "@luomus/laji-schema/models";
import { NamedPlace as NamedPlaceSerialized } from "src/named-places/named-places.dto";
import { ValidationException } from "../document-validator.utils";

describe("NamedPlaceNotTooNearOtherPlacesValidatorService", () => {
	let service: NamedPlaceNotTooNearOtherPlacesValidatorService;
	let namedPlacesServiceMock: jest.Mocked<NamedPlacesService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				NamedPlaceNotTooNearOtherPlacesValidatorService,
				{
					provide: NamedPlacesService,
					useValue: {
						getAll: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<NamedPlaceNotTooNearOtherPlacesValidatorService>(
			NamedPlaceNotTooNearOtherPlacesValidatorService
		);
		namedPlacesServiceMock = module.get(NamedPlacesService);
	});

	describe("validate", () => {
		it("should not throw ValidationException if place is not near other places", async () => {
			const place: NamedPlace = {
				name: "foo",
				collectionID: "collectionId",
				geometry: { type: "Point", coordinates: [60, 25] }
			};
			const namedPlaces = [
				{
					id: "2",
					name: "foo",
					collectionID: "collectionId",
					geometry: { type: "Point", coordinates: [25, 60] }
				},
			] as NamedPlaceSerialized[];
			namedPlacesServiceMock.getAll.mockResolvedValue(namedPlaces);

			await expect(service.validate(place)).resolves.not.toThrow();
		});

		it("should throw ValidationException if place is too near other places", async () => {
			const place: NamedPlace = {
				name: "foo",
				collectionID: "collectionId",
				geometry: { type: "Point", coordinates: [60, 25] }
			};
			const namedPlaces = [
				{
					id: "2",
					name: "foo",
					collectionID: "collectionId",
					geometry: { type: "Point", coordinates: [60, 25] }
				},
			] as NamedPlaceSerialized[];
			namedPlacesServiceMock.getAll.mockResolvedValue(namedPlaces);

			await expect(service.validate(place)).rejects.toThrow(ValidationException);
		});

		it("should not throw ValidationException if it's an existing place", async () => {
			const place: NamedPlace = {
				name: "foo",
				id: "existing",
				collectionID: "collectionId",
				geometry: { type: "Point", coordinates: [60, 25] }
			};
			const namedPlaces = [
				{
					id: "existing",
					name: "foo",
					collectionID: "collectionId",
					geometry: { type: "Point", coordinates: [60, 25] }
				},
			] as NamedPlaceSerialized[];
			namedPlacesServiceMock.getAll.mockResolvedValue(namedPlaces);

			await expect(service.validate(place)).resolves.not.toThrow();
		});
	});
});
