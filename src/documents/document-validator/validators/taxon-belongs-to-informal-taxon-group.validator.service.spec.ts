import { Test, TestingModule } from "@nestjs/testing";
import { TaxonBelongsToInformalTaxonGroupValidatorService }
	from "./taxon-belongs-to-informal-taxon-group.validator.service";
import { TaxaService } from "src/taxa/taxa.service";
import { ValidationException } from "../document-validator.utils";

describe("TaxonBelongsToInformalTaxonGroupValidatorService", () => {
	let service: TaxonBelongsToInformalTaxonGroupValidatorService;
	let taxaServiceMock: jest.Mocked<TaxaService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TaxonBelongsToInformalTaxonGroupValidatorService,
				{
					provide: TaxaService,
					useValue: {
						get: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<TaxonBelongsToInformalTaxonGroupValidatorService>(
			TaxonBelongsToInformalTaxonGroupValidatorService
		);
		taxaServiceMock = module.get(TaxaService);
	});

	describe("validate", () => {
		it("should throw ValidationException if taxon does not belong to given informal taxon groups", async () => {
			const document = {
				gatherings: [
					{
						units: [
							{
								unitFact: {
									autocompleteSelectedTaxonID: "taxonId1",
								},
							},
						],
					},
				],
			};

			const informalTaxonGroups = ["group1"];

			taxaServiceMock.get.mockResolvedValue({ informalGroups: [{ id: "group2", name: { fi: "foo" } }] });

			await expect(service.validate(document as any, "", { informalTaxonGroup: informalTaxonGroups }))
				.rejects.toThrow(ValidationException);
			try {
				await service.validate(document as any, "", { informalTaxonGroup: informalTaxonGroups });
			} catch (error) {
				console.log(error.getResponse().details);
				expect(error.getResponse()).toEqual({
					statusCode: 422,
					message: "Unprocessable Entity",
					details: {
						".gatherings[0].units[0].unitFact.autocompleteSelectedTaxonID":
							[ "Taxon does not belong to given informal taxon groups." ]
					}
				});
			}
		});

		it("should not throw ValidationException if taxon belongs to given informal taxon groups", async () => {
			const document = {
				gatherings: [
					{
						units: [
							{
								unitFact: {
									autocompleteSelectedTaxonID: "taxonId1",
								},
							},
						],
					},
				],
			};

			const informalTaxonGroups = ["group1"];

			taxaServiceMock.get.mockResolvedValue({ informalGroups: [{ id: "group1", name: { fi: "foo" } }] });

			await expect(service.validate(document as any, "", { informalTaxonGroup: informalTaxonGroups }))
				.resolves.not.toThrow(ValidationException);
		});
	});
});
