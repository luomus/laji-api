import { Test, TestingModule } from "@nestjs/testing";
import { DocumentsService } from "./documents.service";
import { FormPermissionsService } from "src/forms/form-permissions/form-permissions.service";
import { FormsService } from "src/forms/forms.service";
import { CollectionsService } from "src/collections/collections.service";
import { NamedPlacesService } from "src/named-places/named-places.service";
import { PrepopulatedDocumentService } from "src/named-places/prepopulated-document/prepopulated-document.service";
import { DocumentValidatorService } from "./document-validator/document-validator.service";
import { Person } from "src/persons/person.dto";
import { StoreService } from "src/store/store.service";
import { documentsStoreConfig } from "./documents.module";

const mockPerson = (person: Partial<Person>) => ({ ...person, isImporter: () => false }) as Person;

describe("DocumentsService caching", () => {
	let service: DocumentsService;
	const mockFormPermissionsService = {
		findByCollectionIDAndPerson: jest.fn(),
		hasEditRightsOf: jest.fn()
	};
	const mockFormsService = {
		findListedByCollectionID: jest.fn(),
		get: jest.fn(),
		checkWriteAccessIfDisabled: jest.fn().mockReturnValue(true)
	};
	const mockCollectionsService = {
		findDescendants: jest.fn()
	};
	const mockNamedPlacesService = { };
	const mockPrepopulatedDocumentService = { };
	const mockDocumentValidatorService = {
		validate: jest.fn()
	};
	const mockHttpService = {
		get: jest.fn(),
		put: jest.fn(),
		post: jest.fn(),
		delete: jest.fn()
	};
	/** Mimics Redis caches search wildcard with asterisk. */
	const createMockCache = () => {
		const cache: Record<string, unknown> = {};
		return {
			set: (key: string, value: unknown) => {
				cache[key] = value;
			},
			get: (key: string) => {
				return cache[key] ?? null;
			},
			del: (key: string) => {
				delete cache[key];
			},
			patternDel: (key: string) => {
				Object.keys(cache).forEach(k => {
					if (k.match(new RegExp("^" + key.replace(/\*/g, ".*") + "$"))) {
						delete cache[k];
					}
				});
			}
		};
	};
	const mockStoreService = new StoreService(mockHttpService as any, createMockCache() as any, documentsStoreConfig);
	let formPermissionsService: FormPermissionsService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DocumentsService,
				{ provide: "STORE_RESOURCE_SERVICE", useValue: mockStoreService },
				{ provide: FormPermissionsService, useValue: mockFormPermissionsService },
				{ provide: FormsService, useValue: mockFormsService },
				{ provide: CollectionsService, useValue: mockCollectionsService },
				{ provide: NamedPlacesService, useValue: mockNamedPlacesService },
				{ provide: PrepopulatedDocumentService, useValue: mockPrepopulatedDocumentService },
				{ provide: DocumentValidatorService, useValue: mockDocumentValidatorService },
			],
		}).compile();

		service = module.get<DocumentsService>(DocumentsService);
		formPermissionsService = module.get<FormPermissionsService>(FormPermissionsService);
	});

	it("caches for collectionID if person is admin (fetches without person clause)", async () => {
		const ADMIN = "ADMIN";
		jest.spyOn(formPermissionsService, "findByCollectionIDAndPerson").mockResolvedValue(
			{ admins: [ADMIN] } as any
		);
		jest.spyOn(mockCollectionsService, "findDescendants").mockResolvedValue([]);
		jest.spyOn(mockFormsService, "findListedByCollectionID").mockResolvedValue([]);
		jest.spyOn(mockHttpService, "get").mockResolvedValue({ member: ["result"] });
		const result1 = await service.getPage({ collectionID: "foo" }, mockPerson({ id: ADMIN }));
		const result2 = await service.getPage( { collectionID: "foo" }, mockPerson({ id: ADMIN }));
		expect(result1).toBe(result2);
	});

	it("clears caches for collectionID if document has the collectionID", async () => {
		const ADMIN = "ADMIN";
		const document = { collectionID: "foo", formID: "foo", creator: "anybody" };
		jest.spyOn(formPermissionsService, "findByCollectionIDAndPerson").mockResolvedValue(
			{ admins: [ADMIN] } as any
		);
		jest.spyOn(mockCollectionsService, "findDescendants").mockResolvedValue([]);
		jest.spyOn(mockFormsService, "findListedByCollectionID").mockResolvedValue([]);
		jest.spyOn(mockHttpService, "get").mockResolvedValue({ member: ["result"] });
		jest.spyOn(mockFormsService, "get").mockResolvedValue({ id: "foo" });
		jest.spyOn(mockFormPermissionsService, "hasEditRightsOf").mockResolvedValue(true);
		jest.spyOn(mockDocumentValidatorService, "validate").mockResolvedValue(undefined);
		jest.spyOn(mockHttpService, "post").mockResolvedValue({ ...document, id: "foo" });
		const result1 = await service.getPage({ collectionID: "foo" }, mockPerson({ id: ADMIN }));
		await service.create(
			document as any,
			{ systemID: "foo" } as any,
			{ id: "anybody", isImporter: () => false } as Person
		);
		const result2 = await service.getPage({ collectionID: "foo" }, mockPerson({ id: ADMIN }));
		expect(result1).not.toBe(result2);
	});

	it("doesn't cache for collectionID if person is not admin (fetches with person clause)", async () => {
		const PERSON = "PERSON";
		jest.spyOn(formPermissionsService, "findByCollectionIDAndPerson").mockResolvedValue(
			{ admins: [] } as any
		);
		jest.spyOn(mockCollectionsService, "findDescendants").mockResolvedValue([]);
		jest.spyOn(mockFormsService, "findListedByCollectionID").mockResolvedValue([]);
		jest.spyOn(mockHttpService, "get").mockResolvedValue({ member: ["result"] });
		const result1 = await service.getPage({ collectionID: "foo" }, mockPerson({ id: PERSON }));
		const result2 = await service.getPage({ collectionID: "foo" }, mockPerson({ id: PERSON }));
		expect(result1).not.toBe(result2);
	});

	it("doesn't cache for personal clause of own documents (fetched with person clause)", async () => {
		const PERSON = "PERSON";
		const FRIEND = "FRIEND";
		jest.spyOn(mockHttpService, "get").mockResolvedValue({ member: ["result"] });
		const result1 = await service.getPage({ }, mockPerson({ id: PERSON }));
		await service.create(
			{ creator: "FRIEND", editors: ["PERSON"], formID: "foo" } as any,
			{ systemID: "foo" } as any,
			{ id: FRIEND, isImporter: () => false } as Person
		);
		const result2 = await service.getPage({ }, { id: PERSON } as Person);
		expect(result1).not.toBe(result2);
	});
});

