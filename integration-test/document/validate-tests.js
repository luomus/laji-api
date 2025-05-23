const config = require("../config.json");
const helpers = require("../helpers");
const { request, expect } = require("chai");

/* jshint ignore:start */
/*
Test named place:
{"id":"MNP.22073","collectionID":"HR.5763","name":"Testi paikka 1","geometry":{"type":"Polygon","coordinates":[[[24.291606924209,60.203870097533],[24.28418820835,60.293522644867],[24.464823407836,60.297094164583],[24.471750074574,60.207428735989],[24.291606924209,60.203870097533]]],"coordinateVerbatim":"668:335"},"public":true,"owners":["MA.97"],"@type":"MNP.namedPlace","@context":"http://schema.laji.fi/context/namedPlace.jsonld","prepopulatedDocument":{"id":null,"creator":"MA.97","gatheringEvent":{"leg":["MA.97"],"dateBegin":"2017-11-01","dateEnd":"2017-11-06"},"formID":"MHL.7","namedPlaceID":"MNP.22073","gatherings":[{"geometry":{"type":"GeometryCollection","geometries":[{"type":"Polygon","coordinates":[[[24.291606924209,60.203870097533],[24.28418820835,60.293522644867],[24.464823407836,60.297094164583],[24.471750074574,60.207428735989],[24.291606924209,60.203870097533]]],"coordinateVerbatim":"668:335"}]},"units":[{"recordBasis":"MY.recordBasisHumanObservation","unitType":[],"taxonConfidence":"MY.taxonConfidenceSure","unitGathering":[]}]}],"publicityRestrictions":"MZ.publicityRestrictionsPublic","sourceID":"KE.389","collectionID":"HR.5763","editor":"MA.97","dateEdited":"2017-11-06T09:40:35+02:00","dateCreated":"2017-11-06T09:40:35+02:00"}}
*/
/* jshint ignore:end */

describe("/documents/validate", function() {
	const basePath = config.urls.document + "/validate";
	const testForm = "MHL.7";
	const testNamedPlaceNotTooNearOtherPlacesForm = "MHL.73";
	const testNP = "MNP.22073";
	const testCollection = "HR.5763";
	const docID = "JX.180684";
	const dateHasDoc = "2017-11-02";
	const dateHasNoDoc = "2017-10-21";

	const waterbirdPairForm = "MHL.66";

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("allows valid remote validators", function (done) {
		this.timeout(10000);
		const query = basePath + "?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
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
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(200);
				done();
			});
	});

	it("doesn't allow document to existing named place if already count", function (done) {
		this.timeout(10000);
		const query = basePath + "?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
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
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(422);
				res.body.error.should.be.deep.equal({
					"details": {
						"gatheringEvent": {
							"dateBegin": [
								"Observation already exists within the given gathering period."
							]
						}
					},
					"message": "Unprocessable Entity",
					"statusCode": 422
				});
				done();
			});
	});

	it("allows document to existing if editing document", function (done) {
		this.timeout(10000);
		const query = basePath + "?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
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
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(200);
				done();
			});
	});

	it("doesn't run validators when only warning validators are selected" , function (done) {
		this.timeout(10000);
		const query = basePath + "?access_token=" + config["access_token"]
			+ "&type=warning&personToken=" + config.user.token;
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
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(200);
				done();
			});
	});

	describe("taxonBelongsToInformalTaxonGroup", function() {
		it("allows valid case" , function (done) {
			this.timeout(10000);
			const query = basePath + "?access_token=" + config["access_token"] +
				"&validator=taxonBelongsToInformalTaxonGroup&informalTaxonGroup=MVL.1";
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
			request(this.server)
				.post(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(200);
					done();
				});
		});

		it("doesn't allow invalid case" , function (done) {
			this.timeout(10000);
			const query = basePath + "?access_token=" + config["access_token"] +
				"&validator=taxonBelongsToInformalTaxonGroup&informalTaxonGroup=MVL.2";
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
			request(this.server)
				.post(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(422);
					res.body.error.should.be.deep.equal({
						"details": {
							"gatherings": {
								"0": {
									"units": {
										"0": {
											"unitFact": {
												"autocompleteSelectedTaxonID": [
													"Taxon does not belong to given informal taxon groups."
												]
											}
										}
									}
								}
							}
						},
						"message": "Unprocessable Entity",
						"statusCode": 422
					});
					done();
				});
		});

		it("doesn't allow invalid case when multiple units" , function (done) {
			this.timeout(10000);
			const query = basePath + "?access_token=" + config["access_token"] +
				"&validator=taxonBelongsToInformalTaxonGroup&informalTaxonGroup=MVL.2";
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
			request(this.server)
				.post(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(422);
					res.body.error.should.be.deep.equal({
						"details": {
							"gatherings": {
								"0": {
									"units": {
										"1": {
											"unitFact": {
												"autocompleteSelectedTaxonID": [
													"Taxon does not belong to given informal taxon groups."
												]
											}
										}
									}
								}
							}
						},
						"message": "Unprocessable Entity",
						"statusCode": 422
					});
					done();
				});
		});
	});

	describe("namedPlaceNotTooNearOtherPlaces", function() {
		it("allows valid case" , function (done) {
			this.timeout(10000);
			const query = basePath + "?access_token=" + config["access_token"] + "&validator=namedPlaceNotTooNearOtherPlaces";
			const document = {
				formID: testNamedPlaceNotTooNearOtherPlacesForm,
				collectionID: testCollection,
				geometry: {
					type: "Point",
					coordinates: [34.365, 60.248]
				}
			};
			request(this.server)
				.post(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(200);
					done();
				});
		});

		it("does not allow invalid case" , function (done) {
			this.timeout(10000);
			const query = basePath + "?access_token=" + config["access_token"] + "&validator=namedPlaceNotTooNearOtherPlaces";
			const document = {
				formID: testNamedPlaceNotTooNearOtherPlacesForm,
				collectionID: testCollection,
				geometry: {
					type: "Point",
					coordinates: [34.001, 32.001]
				}
			};
			request(this.server)
				.post(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(422);
					res.body.error.should.be.deep.equal({
						"details": {
							"geometry": [
								"There already exists a named place in that location"
							]
						},
						"message": "Unprocessable Entity",
						"statusCode": 422
					});
					done();
				});
		});

	});
});
