const config = require("../config.json");
const helpers = require("../helpers");
const { apiRequest, url } = helpers;
const { accessToken, personToken } = config;

/* jshint ignore:start */
/*
Test named place:
{"id":"MNP.22073","collectionID":"HR.5763","name":"Testi paikka 1","geometry":{"type":"Polygon","coordinates":[[[24.291606924209,60.203870097533],[24.28418820835,60.293522644867],[24.464823407836,60.297094164583],[24.471750074574,60.207428735989],[24.291606924209,60.203870097533]]],"coordinateVerbatim":"668:335"},"public":true,"owners":["MA.97"],"@type":"MNP.namedPlace","@context":"http://schema.laji.fi/context/namedPlace.jsonld","prepopulatedDocument":{"id":null,"creator":"MA.97","gatheringEvent":{"leg":["MA.97"],"dateBegin":"2017-11-01","dateEnd":"2017-11-06"},"formID":"MHL.7","namedPlaceID":"MNP.22073","gatherings":[{"geometry":{"type":"GeometryCollection","geometries":[{"type":"Polygon","coordinates":[[[24.291606924209,60.203870097533],[24.28418820835,60.293522644867],[24.464823407836,60.297094164583],[24.471750074574,60.207428735989],[24.291606924209,60.203870097533]]],"coordinateVerbatim":"668:335"}]},"units":[{"recordBasis":"MY.recordBasisHumanObservation","unitType":[],"taxonConfidence":"MY.taxonConfidenceSure","unitGathering":[]}]}],"publicityRestrictions":"MZ.publicityRestrictionsPublic","sourceID":"KE.389","collectionID":"HR.5763","editor":"MA.97","dateEdited":"2017-11-06T09:40:35+02:00","dateCreated":"2017-11-06T09:40:35+02:00"}}
*/
/* jshint ignore:end */

describe("/documents/validate", function() {
	const basePath = "/documents/validate";
	const testForm = "MHL.7";
	const testNamedPlaceNotTooNearOtherPlacesForm = "MHL.73";
	const testNP = "MNP.22073";
	const testCollection = "HR.5763";
	const docID = "JX.180684";
	const dateHasDoc = "2017-11-02";
	const dateHasNoDoc = "2017-10-21";

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("allows valid remote validators", async function() {
		this.timeout(10000);
		const document = {
			formID: testForm,
			namedPlaceID: testNP,
			gatheringEvent: {
				dateBegin: dateHasNoDoc
			},
			gatherings: [
				{
					geometry: {
						type: "Point",
						coordinates: [60.4, 30.2]
					}
				}
			]
		};
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(document);
		res.should.have.status(204);
	});

	it("doesn't allow document to existing named place if already count", async function() {
		this.timeout(10000);
		const document = {
			formID: testForm,
			namedPlaceID: testNP,
			gatheringEvent: {
				dateBegin: dateHasDoc
			},
			gatherings: [
				{
					geometry: {
						type: "Point",
						coordinates: [60.4, 30.2]
					}
				}
			]
		};
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(document);
		res.should.have.status(422);
		res.body.should.be.deep.equal({
			"details": {
				"/gatheringEvent/dateBegin": [
					"Observation already exists within the given gathering period."
				]
			},
			"message": "Validation exception",
			"errorCode": "VALIDATION_EXCEPTION"
		});
	});

	it("allows document to existing if editing document", async function() {
		this.timeout(10000);
		const document = {
			id: docID,
			formID: testForm,
			namedPlaceID: testNP,
			gatheringEvent: {
				dateBegin: dateHasDoc
			},
			gatherings: [
				{
					geometry: {
						type: "Point",
						coordinates: [60.4, 30.2]
					}
				}
			]
		};
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(document);
		res.should.have.status(204);
	});

	it("doesn't run validators when only warning validators are selected" , async function() {
		this.timeout(10000);
		const document = {
			formID: testForm,
			namedPlaceID: testNP,
			gatheringEvent: {
				dateBegin: dateHasDoc
			},
			gatherings: [
				{
					geometry: {
						type: "Point",
						coordinates: [60.4, 30.2]
					}
				}
			]
		};
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(url(basePath, { type: "warning" }))
			.send(document);
		res.should.have.status(204);
	});

	describe("taxonBelongsToInformalTaxonGroup", function() {
		it("allows valid case" , async function() {
			this.timeout(10000);
			const document = {
				formID: testForm,
				namedPlaceID: testNP,
				gatheringEvent: {
					dateBegin: "2017-01-01"
				},
				gatherings: [
					{
						geometry: {
							type: "Point",
							coordinates: [24.365, 60.248]
						},
						units: [
							{
								unitFact: {
									autocompleteSelectedTaxonID: "MX.73583"
								}
							}
						]
					}
				]
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(url(basePath, {
					validator: "taxonBelongsToInformalTaxonGroup",
					informalTaxonGroup: "MVL.1"
				}))
				.send(document);
			res.should.have.status(204);
		});

		it("doesn't allow invalid case" , async function() {
			this.timeout(10000);
			const document = {
				formID: testForm,
				namedPlaceID: testNP,
				gatheringEvent: {
					dateBegin: "2017-01-01"
				},
				gatherings: [
					{
						geometry: {
							type: "Point",
							coordinates: [24.365, 60.248]
						},
						units: [
							{
								unitFact: {
									autocompleteSelectedTaxonID: "MX.73583"
								}
							}
						]
					}
				]
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(url(basePath, {
					validator: "taxonBelongsToInformalTaxonGroup",
					informalTaxonGroup: "MVL.2"
				}))
				.send(document);
			res.should.have.status(422);
			res.body.should.be.deep.equal({
				"details": {
					"/gatherings/0/units/0/unitFact/autocompleteSelectedTaxonID": [
						"Taxon does not belong to given informal taxon groups."
					]
				},
				"message": "Validation exception",
				"errorCode": "VALIDATION_EXCEPTION"
			});
		});

		it("doesn't allow invalid case when multiple units" , async function() {
			this.timeout(10000);
			const document = {
				formID: testForm,
				namedPlaceID: testNP,
				gatheringEvent: {
					dateBegin: "2017-01-01"
				},
				gatherings: [
					{
						geometry: {
							type: "Point",
							coordinates: [24.365, 60.248]
						},
						units: [
							{
								unitFact: {
									autocompleteSelectedTaxonID: "MX.48089"
								}
							},
							{
								unitFact: {
									autocompleteSelectedTaxonID: "MX.73583"
								}
							},
							{}
						]
					}
				]
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(url(basePath, {
					validator: "taxonBelongsToInformalTaxonGroup",
					informalTaxonGroup: "MVL.2"
				}))
				.send(document);
			res.should.have.status(422);
			res.body.should.be.deep.equal({
				"details": {
					"/gatherings/0/units/1/unitFact/autocompleteSelectedTaxonID": [
						"Taxon does not belong to given informal taxon groups."
					]
				},
				"message": "Validation exception",
				"errorCode": "VALIDATION_EXCEPTION"
			});
		});
	});

	describe("namedPlaceNotTooNearOtherPlaces", function() {
		it("allows valid case" , async function() {
			this.timeout(10000);
			const document = {
				formID: testNamedPlaceNotTooNearOtherPlacesForm,
				collectionID: testCollection,
				geometry: {
					type: "Point",
					coordinates: [34.365, 60.248]
				}
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(url(basePath, { validator: "namedPlaceNotTooNearOtherPlaces" }))
				.send(document);
			res.should.have.status(204);
		});

		it("does not allow invalid case" , async function() {
			this.timeout(10000);
			const document = {
				formID: testNamedPlaceNotTooNearOtherPlacesForm,
				collectionID: testCollection,
				geometry: {
					type: "Point",
					coordinates: [34.001, 32.001]
				}
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(url(basePath, { validator: "namedPlaceNotTooNearOtherPlaces" }))
				.send(document);
			res.should.have.status(422);
			res.body.should.be.deep.equal({
				"details": {
					"/geometry": [
						"There already exists a named place in that location"
					]
				},
				"message": "Validation exception",
				"errorCode": "VALIDATION_EXCEPTION"
			});
		});
	});
});
