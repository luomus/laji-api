const config = require("./config.json");
const helpers = require("./helpers");
const { expect } = require("chai");
const { dateToISODate } = require("../dist/utils");
const { accessToken, personToken, person, friend, friend2 } = config;
const { apiRequest, url } = helpers;

describe("/named-place", function() {
	const basePath =  "/named-places";
	let npId;

	const namedPlace = {
		"id": "MNP.26636",
		"name": "public test place",
		"collectionID": "HR.647",
		"geometry": {
			"type": "Point",
			"coordinates": [
				25,
				60
			]
		},
		"public": true,
		"owners": [
			"MA.308"
		],
		"alternativeIDs": [
			"foo"
		],
		"prepopulatedDocument": {
			"gatherings": [
				{
					"units": [
						{
							"informalTaxonGroups":[
								"MVL.145",
								"MVL.1"
							],
							"individualCount":1,
							"shortHandText":"fcx",
							"pairCount":1,
							"unitType":[
								"MVL.145",
								"MVL.1"
							],
							"identifications":[
								{
									"taxon":"Fringilla coelebs",
									"@type":"MY.identification"
								}
							],
							"unitFact":{
								"autocompleteSelectedTaxonID":"MX.36237",
								"lineTransectObsType":"MY.lineTransectObsTypeSong",
								"lineTransectRouteFieldType":"MY.lineTransectRouteFieldTypeOuter"
							}
						}
					]
				}
			]
		},
		"acceptedDocument": {
			"gatherings": [
				{
					"units": [
						{
							"informalTaxonGroups":[
								"MVL.145",
								"MVL.1"
							],
							"individualCount":1,
							"shortHandText":"fcx",
							"pairCount":1,
							"unitType":[
								"MVL.145",
								"MVL.1"
							],
							"identifications":[
								{
									"taxon":"Fringilla coelebs",
									"@type":"MY.identification"
								}
							],
							"unitFact":{
								"autocompleteSelectedTaxonID":"MX.36237",
								"lineTransectObsType":"MY.lineTransectObsTypeSong",
								"lineTransectRouteFieldType":"MY.lineTransectRouteFieldTypeOuter"
							}
						}
					]
				}
			]
		},
		"@type": "MNP.namedPlace",
		"@context": "http://schema.laji.fi/context/namedPlace.jsonld"
	};

	const namedPlacePrivate = {
		"id": "MNP.28410",
		"@context": "http://schema.laji.fi/context/namedPlace.jsonld",
		"@type": "MNP.namedPlace",
		"editors": [
			"MA.314",
			"MA.897"
		],
		"name": "New name for the test named place",
		"geometry": {
			"type": "Point",
			"coordinates": [
				34,
				32
			]
		},
		"public": false,
		"owners": [
			"MA.314"
		]
	};

	const namedPlaceWithFeatureAddingPublicNamedPlacesAllowedTestUserHasAccess = {
		"id": "MNP.28963",
		"municipality": [
			"ML.358"
		],
		"collectionID": "HR.2049",
		"tags": [],
		"name": "test place for \"HL.featureAddingPublicNamedPlacesAllowed",
		"biogeographicalProvince": [],
		"images": [],
		"taxonIDs": [
			"MX.52914"
		],
		"geometry": {
			"type": "GeometryCollection",
			"geometries": [
				{
					"type": "Point",
					"coordinates": [
						20.255263,
						60.128539
					],
					"radius": 232.41231113023
				}
			]
		},
		"prepopulatedDocument": {
			"gatherings": [
				{
					"geometry": {
						"type": "GeometryCollection",
						"geometries": [
							{
								"type": "Point",
								"coordinates": [
									20.255263,
									60.128539
								],
								"radius": 232.41231113023
							}
						]
					},
					"municipality": "Lumparland"
				}
			]
		},
		"public": true,
		"owners": [
			"MA.837"
		],
		"@type": "MNP.namedPlace",
		"@context": "http://schema.laji.fi/context/namedPlace.jsonld"
	};


	const formWithNpFeature = "MHL.7";
	const formWithNpFeatureCollectionID = "HR.5763";
	const formWithNpFeatureCollectionIDNonStrict = "HR.5764";
	const collectionWithIncludeDescendantCollectionFeatureFalse = "HR.61";
	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns list of public namespaces when access token is correct", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath));
		res.should.have.status(200);
	});

	it("returns 401 when trying to add without personToken", async function() {
		const np = {
			name: "test",
			geometry: { type: "Point", coordinates: [30, 60] }
		};
		const res = await apiRequest(this.server, { accessToken })
			.post(url(basePath))
			.send(np);
		res.should.have.status(400);
	});

	it("it finds single public", async function() {
		this.timeout(6000);
		const { id, collectionID } = namedPlace;
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
			.get(url(`${basePath}/${id}`, { collectionID }));
		res.should.have.status(200);
		res.body.should.have.property("id").equal(id);
	});

	it("it finds single private", async function() {
		this.timeout(6000);
		const { id, collectionID } = namedPlacePrivate;
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken, })
			.get(url(`${basePath}/${id}`, { collectionID }));
		res.should.have.status(200);
		res.body.should.have.property("id").equal(id);
	});

	it("it finds by collections ID", async function() {
		this.timeout(6000);
		const { collectionID } = namedPlace;
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
			.get(url(basePath, { collectionID }));
		res.should.have.status(200);
		res.body.should.have.any.keys("results");
		res.body[helpers.params.results].filter((document) => {
			document.should.have.any.keys("id");
			return document["id"] === namedPlace.id;
		}).should.have.lengthOf(1);
	});

	it("it finds by collections ID and alternative ID", async function() {
		this.timeout(6000);
		const { collectionID, alternativeIDs } = namedPlace;
		const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
			.get(url(basePath, { collectionID, alternativeIDs }));
		res.should.have.status(200);
		res.body.should.have.any.keys("results");
		res.body[helpers.params.results].filter((document) => {
			document.should.have.any.keys("id");
			return document["id"] === namedPlace.id;
		}).should.have.lengthOf(1);
	});

	it("add new named place fails without person token", async function() {
		const np = {
			name: "test",
			geometry: { type: "Point", coordinates: [30, 60] }
		};
		const res = await apiRequest(this.server, { accessToken })
			.post(basePath)
			.send(np);
		res.should.have.status(400);
	});

	it("adding named place with owners", async function() {
		const place = {
			owners: [friend.id],
			name: "test named place",
			geometry: {
				type: "Point",
				coordinates: [60, 30]
			}
		};
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(place);
		res.should.have.status(201);
		res.body.should.have.any.keys("id");
		res.body.should.have.property("owners").eql([person.id, friend.id]);
		res.body.id.should.be.a("string");
		res.body.id.should.match(/^MNP\.[0-9]+$/);
	});

	it("adding private named place", async function() {
		const place = {
			editors: [friend.id],
			name: "test named place",
			geometry: {
				type: "Point",
				coordinates: [60, 30]
			}
		};
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(place);
		res.should.have.status(201);
		res.body.should.have.any.keys("id");
		res.body.should.have.property("editors").eql([friend.id]);
		res.body.should.have.property("owners").eql([person.id]);
		res.body.id.should.be.a("string");
		res.body.id.should.match(/^MNP\.[0-9]+$/);
		npId = res.body.id;
	});

	describe("After adding document", function() {
		it("returns named place since friend is in editors", async function() {
			if (!npId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.get(`${basePath}/${npId}`);
			res.should.have.status(200);
		});

		it("does not return named place since it is not public", async function() {
			if (!npId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken })
				.get(`${basePath}/${npId}`);
			res.should.have.status(403);
		});

		it("returns updated named place", async function() {
			if (!npId) {
				this.skip();
			}
			const document = {
				"@type": "MNP.namedPlace",
				id: npId,
				editors: [person.id, friend.id],
				name: "New name for the test named place",
				geometry: {
					type: "Point",
					coordinates: [34, 32]
				},
				public: false
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.put(`${basePath}/${npId}`)
				.send(document);
			res.should.have.status(200);
			document.owners = [person.id];
			document["@context"] = res.body["@context"];
			res.body.should.eql(document);
		});

		describe("After editing document", function() {
			it("Editors cannot change named place", async function() {
				if (!npId) {
					this.skip();
				}
				const place = {
					id: npId,
					editors: [person.id, friend.id],
					name: "Try to change",
					geometry: {
						type: "Point",
						coordinates: [34, 32]
					},
					public: false
				};
				const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
					.put(`${basePath}/${npId}`)
					.send(place);
				res.should.have.status(403);
			});

			it("Editors cannot delete private named place", async function() {
				if (!npId) {
					this.skip();
				}
				const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
					.delete(`${basePath}/${npId}`);
				res.should.have.status(403);
			});

			it("Owner can delete private named place even if it is used in document", async function() {
				if (!npId) {
					this.skip();
				}
				const document = {
					"secureLevel": "MX.secureLevelNone",
					"gatheringEvent": {
						"leg": [
							"MA.308"
						],
						"legPublic": true,
						"dateBegin": "2019-10-07"
					},
					"gatherings": [
						{
							"geometry": {
								"type": "GeometryCollection",
								"geometries": [
									{
										"type": "Point",
										"coordinates": [
											28.024361634495,
											65.662609100531
										]
									}
								]
							},
							"units": [
								{
									"taxonConfidence": "MY.taxonConfidenceSure",
									"recordBasis": "MY.recordBasisHumanObservation",
									"identifications": [
										{}
									],
									"unitGathering": {
										"geometry": {}
									},
									"unitFact": {}
								}
							],
							"namedPlaceID": npId
						}
					],
					"editor": "MA.308",
					"formID": "JX.519",
				};
				let documentId;
				const res = await apiRequest(this.server, { accessToken, personToken })
					.post("/documents")
					.send(document);
				if (res.status !== 200) {
					this.skip();
				}
				documentId = res.body.id;
				const res2 = await apiRequest(this.server, { accessToken, personToken })
					.delete(`${basePath}/${npId}`);
				res2.should.have.status(200);

			 // Rm test doc silently.
				void apiRequest(this.server).delete(`/documents/${documentId}`);
			});
		});
	});

	describe("Reservation", function() {

		const namedPlaceNotPermittedForTestUser = "MNP.53659";

		it("fails if user doesn't have access to place's collection", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(`${basePath}/${namedPlaceNotPermittedForTestUser}/reservation`);
			res.should.have.status(403);
		});

		it("fails when 'until' is in the past", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(url(`${basePath}/${namedPlace.id}/reservation`, { until: "1920-12-02" }));
			res.should.have.status(422);
		});

		it("fails when 'until' is too far away in the future", async function() {
			const date = new Date();
			date.setMonth(date.getMonth() + 13);
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.post(url(`${basePath}/${namedPlace.id}/reservation`, { until: dateToISODate(date) }));
			res.should.have.status(400);
			res.body.should.have.property("errorCode").eql("NAMED_PLACE_RESERVATION_TOO_FAR");
		});

		it("with far-away 'until' when is admin", async function() {
			const date = new Date();
			date.setMonth(date.getMonth() + 13);
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(url(`${basePath}/${namedPlace.id}/reservation`, { until: dateToISODate(date) }));
			res.should.have.status(201);
			res.body.reserve.should.have.property("until").eql(dateToISODate(date));
		});

		it("can be added if user has access to place's collection", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(`${basePath}/${namedPlace.id}/reservation`);
			res.should.have.status(201);
			res.body.reserve.should.have.property("reserver").eql(person.id);
		});

		it("can't be added if already reserved and not admin", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.post(`${basePath}/${namedPlace.id}/reservation`);
			res.should.have.status(400);
		});

		it("can be removed", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.delete(`${basePath}/${namedPlace.id}/reservation`);
			res.should.have.status(200);
			res.body.should.not.have.property("reserve");
		});

		it("can't be removed if not own and not admin", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(`${basePath}/${namedPlace.id}/reservation`);
			res.should.have.status(201);

			const res2 = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.delete(`${basePath}/${namedPlace.id}/reservation`, );
			res2.should.have.status(403);
		});

		it("can be reserved by admin even if reserved already", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(`${basePath}/${namedPlace.id}/reservation`);
			res.should.have.status(201);

			// Clean reservation for next tests.
			const res2 = await apiRequest(this.server, { accessToken, personToken })
				.delete(`${basePath}/${namedPlace.id}/reservation`);
			res2.should.have.status(200);
		});

		it("can't be reserved to other users if not admin", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.post(url(`${basePath}/${namedPlace.id}/reservation`, { personID: friend.id }));
			res.should.have.status(403);
		});

		it("can be reserved to other user by admin", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(url(`${basePath}/${namedPlace.id}/reservation`, { personID: friend2.id }));
			res.should.have.status(201);
			res.body.reserve.should.have.property("reserver").eql(friend2.id);

			// Remove reservation in order to keep reservation status untouched after tests
			const res2 = await apiRequest(this.server, { accessToken, personToken })
				.delete(`${basePath}/${namedPlace.id}/reservation`);
			res2.should.have.status(200);
			res2.body.should.not.have.property("reserve");
		});
	});

	describe("Accepted document", function() {
		it("modifying fails if not admin", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.put(`${basePath}/${namedPlace.id}`)
				.send({ ...namedPlace, acceptedDocument: { gatherings: [{}] } });
			res.should.have.status(403);
		});

		it("modifying works if MHL.allowAddingPublic", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.put(`${basePath}/${namedPlaceWithFeatureAddingPublicNamedPlacesAllowedTestUserHasAccess.id}`)
				.send({
					...namedPlaceWithFeatureAddingPublicNamedPlacesAllowedTestUserHasAccess,
					acceptedDocument: { gatherings: [{}] }
				});
			res.should.have.status(200);
		});

		it("modifying works if admin", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.put(`${basePath}/${namedPlace.id}`)
				.send({ ...namedPlace, acceptedDocument: { gatherings: [{ units: [{}] }] } });
			res.should.have.status(200);
			res.body.should.have.property("acceptedDocument");
		});

		it("filters units on fetching single", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.get(`${basePath}/${namedPlace.id}`);
			res.should.have.status(200);
			res.body.acceptedDocument.should.have.property("gatherings");
			res.body.acceptedDocument.gatherings.forEach(gathering => {
				gathering.should.not.have.property("units");
			});
			res.body.prepopulatedDocument.should.have.property("gatherings");
			res.body.prepopulatedDocument.gatherings.forEach(gathering => {
				gathering.should.not.have.property("units");
			});
		});

		it("filters units on fetching many", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.get(basePath);
			res.should.have.status(200);
			res.body.results.should.not.have.length(0);
			res.body.results.forEach(namedPlace => {
				if (namedPlace.acceptedDocument && namedPlace.acceptedDocument.gatherings) {
					namedPlace.acceptedDocument.should.have.property("gatherings");
					namedPlace.acceptedDocument.gatherings.forEach(gathering => {
						gathering.should.not.have.property("units");
					});
				}
				if (namedPlace.prepopulatedDocument && namedPlace.prepopulatedDocument.gatherings) {
					namedPlace.prepopulatedDocument.should.have.property("gatherings");
					namedPlace.prepopulatedDocument.gatherings.forEach(gathering => {
						gathering.should.not.have.property("units");
					});
				}
			});
		});

		it("filters units on fetching many when using Elastic", async function() {
			this.timeout(6000);
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.get(basePath);
			res.should.have.status(200);
			res.body.results.should.not.have.length(0);
			res.body.results.forEach(namedPlace => {
				if (namedPlace.acceptedDocument && namedPlace.acceptedDocument.gatherings) {
					namedPlace.acceptedDocument.should.have.property("gatherings");
					namedPlace.acceptedDocument.gatherings.forEach(gathering => {
						gathering.should.not.have.property("units");
					});
				}
				if (namedPlace.prepopulatedDocument && namedPlace.prepopulatedDocument.gatherings) {
					namedPlace.prepopulatedDocument.should.have.property("gatherings");
					namedPlace.prepopulatedDocument.gatherings.forEach(gathering => {
						gathering.should.not.have.property("units");
					});
				}
			});
		});

		it("doesn't filter units on fetching single if includeUnits is true", async function() {
			this.timeout(6000);
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.get(url(`${basePath}/${namedPlace.id}`, { includeUnits: true }));
			res.should.have.status(200);
			res.body.acceptedDocument.should.have.property("gatherings");
			res.body.prepopulatedDocument.should.have.property("gatherings");
			if (res.body.collectionID === "HR.2049") {
				res.body.acceptedDocument.gatherings.forEach(gathering => {
					gathering.should.have.property("units");
				});
				res.body.prepopulatedDocument.gatherings.forEach(gathering => {
					gathering.should.have.property("units");
				});
			}
		});

		it("doesn't filter units on fetching many if includeUnits is true", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.get(url(basePath, { collectionID: "HR.2049", includeUnits: true }));
			res.should.have.status(200);
			res.body.results.should.not.have.length(0);
			const someHas = res.body.results.some(namedPlace => {
				if (namedPlace.acceptedDocument && namedPlace.acceptedDocument.gatherings) {
					return namedPlace.acceptedDocument.gatherings.some(gathering => {
						return gathering.units;
					});
				}
				if (namedPlace.prepopulatedDocument && namedPlace.prepopulatedDocument.gatherings) {
					return namedPlace.prepopulatedDocument.gatherings.some(gathering => {
						return gathering.units;
					});
				}
			});

			expect(someHas).to.equal(true);
		});

		it("filters units if collectionID isn't HR.2049 even if includeUnits is true on fetching single", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.get(url(`${basePath}/${namedPlace.id}`, { includeUnits: true }));
			res.should.have.status(200);
			res.body.acceptedDocument.should.have.property("gatherings");
			res.body.acceptedDocument.gatherings.forEach(gathering => {
				gathering.should.not.have.property("units");
			});
			res.body.prepopulatedDocument.should.have.property("gatherings");
			res.body.prepopulatedDocument.gatherings.forEach(gathering => {
				gathering.should.not.have.property("units");
			});
		});

		it("filters units if collectionID isn't HR.2049 even if includeUnits is true for many", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.get(url(basePath, { includeUnits: true }));
			res.should.have.status(200);
			res.body.results.should.not.have.length(0);
			res.body.results.forEach(namedPlace => {
				if (namedPlace.collectionID !== "HR.2049") {
					if (namedPlace.acceptedDocument && namedPlace.acceptedDocument.gatherings) {
						namedPlace.acceptedDocument.should.have.property("gatherings");
						namedPlace.acceptedDocument.gatherings.forEach(gathering => {
							gathering.should.not.have.property("units");
						});
					}
					if (namedPlace.prepopulatedDocument && namedPlace.prepopulatedDocument.gatherings) {
						namedPlace.prepopulatedDocument.should.have.property("gatherings");
						namedPlace.prepopulatedDocument.gatherings.forEach(gathering => {
							gathering.should.not.have.property("units");
						});
					}
				}
			});
		});

		it("has only selected fields that where asked", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.get(url(basePath, { selectedFields: "name" }));
			res.should.have.status(200);
			res.body.results.should.not.have.length(0);
			res.body.results.forEach(namedPlace => {
				namedPlace.should.property("name");
				namedPlace.should.not.property("prepopulatedDocument");
				namedPlace.should.not.property("owners");
				namedPlace.should.not.property("editors");
				namedPlace.should.not.property("collectionID");
			});
		});
	});

	describe("Deleting public", function() {
		let npId, docId;
		before(async function() {
			const testCollectionID = formWithNpFeatureCollectionID;
			const formID = formWithNpFeature;

			const np = {
				name: "Test",
				geometry: {
					type: "Point",
					coordinates: [34, 32]
				},
				public: true,
				collectionID: testCollectionID
			};

			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(basePath)
				.send(np);
			npId = res.body.id;
			const doc = {
				collectionID: testCollectionID,
				gatheringEvent: {},
				gatherings: [{ geometry: { type: "Point", coordinates: [25, 60] } }],
				formID,
				namedPlaceID: npId
			};
			const res2 = await apiRequest(this.server, { accessToken, personToken })
				.post("/documents")
				.send(doc);
			res2.should.have.status(201);
			docId = res.body.id;
		});

		it("editor can't delete", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.delete(`${basePath}/${npId}`);
			res.should.have.status(403);
		});

		it("doesn't delete public named place if it has documents", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.delete(`${basePath}/${npId}`);
			res.should.have.status(422);
		});
	});

	describe("MHL.allowAddingPublic", function() {

		let npId;

		const testCollectionID = formWithNpFeatureCollectionID;

		const npForNoFeature = {
			name: "Test",
			geometry: {
				type: "Point",
				coordinates: [34, 32]
			},
			public: true,
			collectionID: testCollectionID
		};

		it("doesn't allow adding if editor and has not feature", async function() {
			this.timeout(4000);
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.post(basePath)
				.send(npForNoFeature);
			res.should.have.status(403);
		});

		it("doesn't allow deleting if editor and has not feature", async function() {
			this.timeout(4000);
			// Create the place with admin token for test.
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(basePath)
				.send(npForNoFeature);
			res.should.have.status(201);
			npId = res.body.id;
			// Try deleting with person token.
			const res2 = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.delete(`${basePath}/${npId}`);
			res2.should.have.status(403);

			// Silently remove after test.
			void apiRequest(this.server, { accessToken, personToken })
				.delete(`${basePath}/${npId}`);
		});

		it("allows adding if editor and has feature", async function() {
			const namedPlace = { ...namedPlaceWithFeatureAddingPublicNamedPlacesAllowedTestUserHasAccess };
			delete namedPlace.id;
			const res = await apiRequest(this.server, { accessToken, personToken: friend2.personToken })
				.post(basePath)
				.send(namedPlace);
			res.should.have.status(201);
			npId = res.body.id;
		});

		it("allows deleting other's place if editor and has feature", async function() {
			if (!npId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.delete(`${basePath}/${npId}`);
			res.should.have.status(200);
		});
	});

	describe("disabled form", function() {
		const disabledFormNp = "MNP.54910";
		const disabledFormCollectionID  =  "HR.2373";

		const npForNoFeature = {
			name: "Test",
			geometry: {
				type: "Point",
				coordinates: [34, 32]
			},
			collectionID: disabledFormCollectionID
		};

		it("doesn't allow adding", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(basePath)
				.send(npForNoFeature);
			res.should.have.status(422);
		});

		it("doesn't allow editing", async function() {
			const updatedNP = { ...npForNoFeature, id: disabledFormNp };
			delete updatedNP.collectionID;
			const res = await apiRequest(this.server, { accessToken, personToken })
				.put(`${basePath}/${disabledFormNp}`)
				.send(updatedNP);
			res.should.have.status(422);
		});

		it("doesn't allow deleting", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.delete(`${basePath}/${disabledFormNp}`);
			res.should.have.status(422);
		});
	});

	describe("MHL.strict", function() {
		const strictNpId = "MNP.50078";
		let strictNp;

		before(async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.get(`${basePath}/${strictNpId}`);
			res.should.have.status(200);
			strictNp = res.body;
		});

		describe("enabled", function () {
			it("prevents creating prepopulatedDocument with fields not in form fields", async function() {
				const strictNpWithInvalidPrepopDoc = JSON.parse(JSON.stringify(strictNp));
				strictNpWithInvalidPrepopDoc.prepopulatedDocument = { gatheringEvent: { acknowledgeNoUnitsInCensus: true } };
				delete strictNpWithInvalidPrepopDoc.id;

				const res = await apiRequest(this.server, { accessToken, personToken })
					.post(basePath)
					.send(strictNpWithInvalidPrepopDoc);
				res.should.have.status(422);
			});

			it("prevents editing prepopulatedDocument with fields not in form fields", async function() {
				const strictNpWithInvalidPrepopDoc = JSON.parse(JSON.stringify(strictNp));
				strictNpWithInvalidPrepopDoc.prepopulatedDocument = { gatheringEvent: { acknowledgeNoUnitsInCensus: true } };

				const res = await apiRequest(this.server, { accessToken, personToken })
					.put(`${basePath}/${strictNpWithInvalidPrepopDoc.id}`)
					.send(strictNpWithInvalidPrepopDoc);
				res.should.have.status(422);
			});
		});

		describe("disabled", function () {
			it("does not prevent creating prepopulatedDocument with fields not in form fields", async function() {
				const np = JSON.parse(JSON.stringify(strictNp));
				np.prepopulatedDocument.gatheringEvent.acknowledgeNoUnitsInCensus = true;
				np.collectionID = formWithNpFeatureCollectionIDNonStrict;
				delete np.id;

				const res = await apiRequest(this.server, { accessToken, personToken })
					.post(basePath)
					.send(np);
				res.should.have.status(201);
				id = res.id;
			});

			it("does not prevent editing prepopulatedDocument with fields not in form fields", async function() {
				const np = JSON.parse(JSON.stringify(strictNp));
				np.prepopulatedDocument.gatheringEvent.acknowledgeNoUnitsInCensus = true;
				np.collectionID = formWithNpFeatureCollectionIDNonStrict;

				const res = await apiRequest(this.server, { accessToken, personToken })
					.put(`${basePath}/${np.id}`)
					.send(strictNp);
				res.should.have.status(422);
			});
		});
	});

	describe("MHL.includeDescendantCollections", function() {
		it("form with feature makes the form not return named places of descendant collections", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.get(url(basePath, {
					collectionID: collectionWithIncludeDescendantCollectionFeatureFalse,
					pageSize: 100000
				}));
			res.should.have.status(200);
			res.body.results.forEach(place => {
				place.should.have.property("collectionID").eql(collectionID);
			});
		});
	});
});
