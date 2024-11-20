import { Test, TestingModule } from "@nestjs/testing";
import { ProfileService } from "./profile.service";
import { PersonTokenService } from "src/person-token/person-token.service";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import { HttpException } from "@nestjs/common";
import { NotificationsService } from "src/notifications/notifications.service";

describe("ProfileService", () => {
	let service: ProfileService;
	let storeService: StoreService<Profile>;
	let personTokenService: PersonTokenService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ProfileService,
				{
					provide: "STORE_RESOURCE_SERVICE",
					useValue: {
						findOne: jest.fn(),
						create: jest.fn(),
						update: jest.fn(),
					},
				},
				{
					provide: PersonTokenService,
					useValue: {
						getPersonIdFromToken: jest.fn(),
					},
				},
				{
					provide: NotificationsService,
					useValue: {
						add: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<ProfileService>(ProfileService);
		storeService = module.get<StoreService<Profile>>("STORE_RESOURCE_SERVICE");
		personTokenService = module.get<PersonTokenService>(PersonTokenService);
	});

	it("should create a profile if none exists", async () => {
		const personId = "test-person-id";
		const profile: Partial<Profile> = { userID: personId };

		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(undefined);
		jest.spyOn(storeService, "create").mockResolvedValueOnce(profile as Profile);

		const result = await service.getByPersonIdOrCreate(personId);

		expect(storeService.findOne).toHaveBeenCalledWith({ userID: personId });
		expect(storeService.create).toHaveBeenCalledWith(expect.objectContaining({ userID: personId }));
		expect(result).toEqual(profile);
	});

	it("should not create a duplicate profile if one already exists", async () => {
		const personId = "test-person-id";
		const profile: Profile = {
			userID: personId, profileKey: "test-key", id: "1", friendRequests: [], friends: [], blocked: [],
			profileDescription: "",
			personalCollectionIdentifier: "",
			taxonExpertise: [],
			taxonExpertiseNotes: "",
			image: "",
			settings: {}
		};

		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(profile);

		const result = await service.getByPersonIdOrCreate(personId);

		expect(storeService.findOne).toHaveBeenCalledWith({ userID: personId });
		expect(storeService.create).not.toHaveBeenCalled();
		expect(result).toEqual(profile);
	});

	it("should throw an error if trying to create a profile for a person who already has one", async () => {
		const personId = "test-person-id";
		const profile: Profile = {
			userID: personId, profileKey: "test-key", id: "1", friendRequests: [], friends: [], blocked: [],
			profileDescription: "",
			personalCollectionIdentifier: "",
			taxonExpertise: [],
			taxonExpertiseNotes: "",
			image: "",
			settings: {}
		};

		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(profile);

		await expect(service.createWithPersonId(personId, {})).rejects.toThrow(HttpException);
		expect(storeService.findOne).toHaveBeenCalledWith({ userID: personId });
		expect(storeService.create).not.toHaveBeenCalled();
	});

	it("should create a profile if none exists when using person token", async () => {
		const personToken = "test-token";
		const personId = "test-person-id";
		const profile: Partial<Profile> = { userID: personId };

		jest.spyOn(personTokenService, "getPersonIdFromToken").mockResolvedValueOnce(personId);
		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(undefined);
		jest.spyOn(storeService, "create").mockResolvedValueOnce(profile as Profile);

		const result = await service.getByPersonTokenOrCreate(personToken);

		expect(personTokenService.getPersonIdFromToken).toHaveBeenCalledWith(personToken);
		expect(storeService.findOne).toHaveBeenCalledWith({ userID: personId });
		expect(storeService.create).toHaveBeenCalledWith(expect.objectContaining({ userID: personId }));
		expect(result).toEqual(profile);
	});

	it("should not create a duplicate profile if one already exists when using person token", async () => {
		const personToken = "test-token";
		const personId = "test-person-id";
		const profile: Profile = {
			userID: personId, profileKey: "test-key", id: "1", friendRequests: [], friends: [], blocked: [],
			profileDescription: "",
			personalCollectionIdentifier: "",
			taxonExpertise: [],
			taxonExpertiseNotes: "",
			image: "",
			settings: {}
		};

		jest.spyOn(personTokenService, "getPersonIdFromToken").mockResolvedValueOnce(personId);
		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(profile);

		const result = await service.getByPersonTokenOrCreate(personToken);

		expect(personTokenService.getPersonIdFromToken).toHaveBeenCalledWith(personToken);
		expect(storeService.findOne).toHaveBeenCalledWith({ userID: personId });
		expect(storeService.create).not.toHaveBeenCalled();
		expect(result).toEqual(profile);
	});
});

