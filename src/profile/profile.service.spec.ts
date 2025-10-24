import { Test, TestingModule } from "@nestjs/testing";
import { ProfileService } from "./profile.service";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import { HttpException } from "@nestjs/common";
import { NotificationsService } from "src/notifications/notifications.service";
import { Person } from "src/persons/person.dto";

describe("ProfileService", () => {
	let service: ProfileService;
	let storeService: StoreService<Profile>;

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
					provide: NotificationsService,
					useValue: {
						add: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<ProfileService>(ProfileService);
		storeService = module.get<StoreService<Profile>>("STORE_RESOURCE_SERVICE");
	});

	it("should create a profile if none exists", async () => {
		const person = { id :"test-person-id" } as Person;
		const profile: Partial<Profile> = { userID: person.id };

		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(undefined);
		jest.spyOn(storeService, "create").mockResolvedValueOnce(profile as Profile);

		const result = await service.getByPersonOrCreate(person);

		expect(storeService.findOne).toHaveBeenCalledWith({ userID: person.id });
		expect(storeService.create).toHaveBeenCalledWith(expect.objectContaining({ userID: person.id }));
		expect(result).toEqual(profile);
	});

	it("should not create a duplicate profile if one already exists", async () => {
		const person = { id :"test-person-id" } as Person;
		const profile: Profile = {
			userID: person.id, id: "1", friendRequests: [], friends: [], blocked: [],
			profileDescription: "",
			personalCollectionIdentifier: "",
			taxonExpertise: [],
			taxonExpertiseNotes: "",
			image: "",
			settings: {}
		};

		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(profile);

		const result = await service.getByPersonOrCreate(person);

		expect(storeService.findOne).toHaveBeenCalledWith({ userID: person.id });
		expect(storeService.create).not.toHaveBeenCalled();
		expect(result).toEqual(profile);
	});

	it("should throw an error if trying to create a profile for a person who already has one", async () => {
		const person = { id :"test-person-id" } as Person;
		const profile: Profile = {
			userID: person.id, id: "1", friendRequests: [], friends: [], blocked: [],
			profileDescription: "",
			personalCollectionIdentifier: "",
			taxonExpertise: [],
			taxonExpertiseNotes: "",
			image: "",
			settings: {}
		};

		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(profile);

		await expect(service.create(person, {})).rejects.toThrow(HttpException);
		expect(storeService.findOne).toHaveBeenCalledWith({ userID: person.id });
		expect(storeService.create).not.toHaveBeenCalled();
	});

	it("should create a profile if none exists", async () => {
		const person = { id :"test-person-id" } as Person;
		const profile: Partial<Profile> = { userID: person.id };

		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(undefined);
		jest.spyOn(storeService, "create").mockResolvedValueOnce(profile as Profile);

		const result = await service.getByPersonOrCreate(person);

		expect(storeService.findOne).toHaveBeenCalledWith({ userID: person.id });
		expect(storeService.create).toHaveBeenCalledWith(expect.objectContaining({ userID: person.id }));
		expect(result).toEqual(profile);
	});

	it("should not create a duplicate profile if one already exists when using person token", async () => {
		const person = { id :"test-person-id" } as Person;
		const profile: Profile = {
			userID: person.id, id: "1", friendRequests: [], friends: [], blocked: [],
			profileDescription: "",
			personalCollectionIdentifier: "",
			taxonExpertise: [],
			taxonExpertiseNotes: "",
			image: "",
			settings: {}
		};

		jest.spyOn(storeService, "findOne").mockResolvedValueOnce(profile);

		const result = await service.getByPersonOrCreate(person);

		expect(storeService.findOne).toHaveBeenCalledWith({ userID: person.id });
		expect(storeService.create).not.toHaveBeenCalled();
		expect(result).toEqual(profile);
	});
});

