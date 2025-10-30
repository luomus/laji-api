import { Test, TestingModule } from "@nestjs/testing";
import { NoExistingGatheringsInNamedPlaceValidatorService }
	from "./no-existing-gatherings-in-named-place.validator.service";
import { DocumentsService } from "src/documents/documents.service";
import { FormsService } from "src/forms/forms.service";
import { Document } from "@luomus/laji-schema";
import { ValidationException } from "../document-validator.utils";
import { FormSchemaFormat } from "src/forms/dto/form.dto";

describe("NoExistingGatheringsInNamedPlaceValidatorService", () => {
	let service: NoExistingGatheringsInNamedPlaceValidatorService;
	let documentsServiceMock: jest.Mocked<DocumentsService>;
	let formsServiceMock: jest.Mocked<FormsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				NoExistingGatheringsInNamedPlaceValidatorService,
				{
					provide: DocumentsService,
					useValue: {
						existsByNamedPlaceID: jest.fn(),
					},
				},
				{
					provide: FormsService,
					useValue: {
						get: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<NoExistingGatheringsInNamedPlaceValidatorService>(
			NoExistingGatheringsInNamedPlaceValidatorService
		);
		documentsServiceMock = module.get(DocumentsService);
		formsServiceMock = module.get(FormsService);
	});

	describe("validate", () => {

		describe("new document", () => {
			// eslint-disable-next-line max-len
			it("should not throw ValidationException if namedPlaceHasDocuments is false and document date is within a period of the form", async () => {
				const document = {
					namedPlaceID: "namedPlaceId",
					formID: "formID",
					gatheringEvent: { dateBegin: "2024-02-01" }
				} as Document;
				formsServiceMock.get.mockResolvedValue(
					{ options: { periods: ["10-25/12-21", "12-22/02-17", "02-18/03-15"] } } as FormSchemaFormat
				);
				documentsServiceMock.existsByNamedPlaceID.mockResolvedValue(false);

				await expect(service.validate(document)).resolves.not.toThrow();
			});

			// eslint-disable-next-line max-len
			it("should throw ValidationException if namedPlaceHasDocuments is true and document date is within a period of the form", async () => {
				const document = {
					namedPlaceID: "namedPlaceId",
					formID: "formID",
					gatheringEvent: { dateBegin: "2024-02-01" }
				} as Document;
				formsServiceMock.get.mockResolvedValue(
					{ options: { periods: ["10-25/12-21", "12-22/02-17", "02-18/03-15"] } } as FormSchemaFormat
				);
				documentsServiceMock.existsByNamedPlaceID.mockResolvedValue(true);

				await expect(service.validate(document)).rejects.toThrow(ValidationException);
			});

			// eslint-disable-next-line max-len
			it("should throw ValidationException if the form does not have any periods and there are documents for the named place in the documents date range", async () => {
				const document = {
					namedPlaceID: "namedPlaceId",
					formID: "formID",
					gatheringEvent: { dateBegin: "2024-02-01" }
				} as Document;
				formsServiceMock.get.mockResolvedValue({} as any);
				documentsServiceMock.existsByNamedPlaceID.mockResolvedValue(true);

				await expect(service.validate(document)).rejects.toThrow(ValidationException);
			});

			// eslint-disable-next-line max-len
			it("should not throw ValidationException if the form does not have any periods and there are no documents for the named place in the documents date range", async () => {
				const document = {
					namedPlaceID: "namedPlaceId",
					formID: "formID",
					gatheringEvent: { dateBegin: "2024-02-01" }
				} as Document;
				formsServiceMock.get.mockResolvedValue({} as any);
				documentsServiceMock.existsByNamedPlaceID.mockResolvedValue(false);

				await expect(service.validate(document)).resolves.not.toThrow();
			});
		});

		describe("existing document", () => {
			// eslint-disable-next-line max-len
			it("should not throw ValidationException if there are no conflicting documents in the same period", async () => {
				const document = {
					id: "existing-id",
					namedPlaceID: "namedPlaceId",
					formID: "formID",
					gatheringEvent: { dateBegin: "2024-02-01" }
				} as Document;

				formsServiceMock.get.mockResolvedValue(
					{ options: { periods: ["12-22/02-17"] } } as FormSchemaFormat
				);

				// First call says "yes, there are documents", second says "no conflict for this id"
				documentsServiceMock.existsByNamedPlaceID
					.mockResolvedValueOnce(true)
					.mockResolvedValueOnce(false);

				await expect(service.validate(document)).resolves.not.toThrow();

				expect(documentsServiceMock.existsByNamedPlaceID).toHaveBeenNthCalledWith(
					1,
					"namedPlaceId",
					expect.any(Object)
				);
				expect(documentsServiceMock.existsByNamedPlaceID).toHaveBeenNthCalledWith(
					2,
					"namedPlaceId",
					expect.any(Object),
					"existing-id"
				);
			});

			// eslint-disable-next-line max-len
			it("should throw ValidationException if there are conflicting documents in the same period", async () => {
				const document = {
					id: "existing-id",
					namedPlaceID: "namedPlaceId",
					formID: "formID",
					gatheringEvent: { dateBegin: "2024-02-01" }
				} as Document;

				formsServiceMock.get.mockResolvedValue(
					{ options: { periods: ["12-22/02-17"] } } as FormSchemaFormat
				);

				// Both calls return true (conflict detected)
				documentsServiceMock.existsByNamedPlaceID
					.mockResolvedValueOnce(true)
					.mockResolvedValueOnce(true);

				await expect(service.validate(document)).rejects.toThrow(ValidationException);
			});

		});
	});
});
