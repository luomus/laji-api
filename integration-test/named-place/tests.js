var config = require("../config.json");
var helpers = require("../helpers");
const { request, expect } = require("chai");
const { dateToISODate } = require("../../dist/utils");

describe("/named-place", function() {
	const basePath = config["urls"]["named-place"];
	let npId;

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end((err, res) => {
				res.should.have.status(401);
				done();
			});
	});

	it("returns list of public namespaces when access token is correct", function(done) {
		const query = basePath + "?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end((err, res) => {
				if (err) return done(err);
				res.should.have.status(200);
				done();
			});
	});

	it("returns 401 when trying to add without personToken", function(done) {
		const query = basePath +
			"?access_token=" + config["access_token"];
		const np = {
			name: "test",
			geometry: { type: "Point", coordinates: [30, 60] }
		};
		request(this.server)
			.post(query)
			.send(np)
			.end(function (err, res) {
				res.should.have.status(400);
				done();
			});
	});

	it("it finds single public", function(done) {
		this.timeout(6000);
		const id = config.objects["named-place"].id;
		const query = basePath + "/" + id +
			"?access_token=" + config["access_token"] +
			"&collectionID=" + config.objects["named-place"].collectionID +
			"&personToken=" + config.user.friend_token +
			"&pageSize=1000";
		request(this.server)
			.get(query)
			.end(function (err, res) {
				res.should.have.status(200);
				res.body.should.have.property("id").equal(id);
				done();
			});
	});

	it("it finds single private", function(done) {
		this.timeout(6000);
		const id = config.objects["named-place-private"].id;
		const query = basePath + "/" + id +
			"?access_token=" + config["access_token"] +
			"&collectionID=" + config.objects["named-place-private"].collectionID +
			"&personToken=" + config.user.friend_token +
			"&pageSize=1000";
		request(this.server)
			.get(query)
			.end(function (err, res) {
				res.should.have.status(200);
				res.body.should.have.property("id").equal(id);
				done();
			});
	});

	it("it finds by collections ID", function(done) {
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] +
			"&collectionID=" + config.objects["named-place"].collectionID +
			"&personToken=" + config.user.friend_token +
			"&pageSize=1000";
		request(this.server)
			.get(query)
			.end(function (err, res) {
				res.should.have.status(200);
				res.body.should.have.any.keys("results");
				res.body[helpers.params.results].filter((document) => {
					document.should.have.any.keys("id");
					return document["id"] === config.objects["named-place"].id;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("it finds by alternative ID", function(done) {
		this.skip(); // need to add namedplace without collection id so that this would work;
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] +
			"&alternativeIDs=" + config.objects["named-place"].alternativeIDs +
			"&personToken=" + config.user.friend_token;
		request(this.server)
			.get(query)
			.end(function (err, res) {
				res.should.have.status(200);
				res.body.should.have.any.keys("results");
				res.body[helpers.params.results].filter((document) => {
					document.should.have.any.keys("id");
					return document["id"] === config.objects["named-place"].id;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("it finds by collections ID and alternative ID", function(done) {
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] +
			"&collectionID=" + config.objects["named-place"].collectionID +
			"&alternativeIDs=" + config.objects["named-place"].alternativeIDs +
			"&personToken=" + config.user.friend_token;
		request(this.server)
			.get(query)
			.end(function (err, res) {
				res.should.have.status(200);
				res.body.should.have.any.keys("results");
				res.body[helpers.params.results].filter((document) => {
					document.should.have.any.keys("id");
					return document["id"] === config.objects["named-place"].id;
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("it does not finds by collections ID when personToken is wrong", function(done) {
		this.skip(); // need to add named place private with alternative ids;
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] +
			"&collectionID=" + config.objects["named-place"].collectionID +
			"&personToken=" + config.user.token;
		request(this.server)
			.get(query)
			.end(function (err, res) {
				res.should.have.status(200);
				res.body.should.have.any.keys("results");
				res.body[helpers.params.results].filter((document) => {
					document.should.have.any.keys("id");
					return document["id"] === config.objects["named-place"].id;
				}).should.have.lengthOf(0);
				done();
			});
	});

	it("it finds by taxonIDs", function(done) {
		this.skip(); // need to refactor so that doesn't require something existing in the database
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] +
			"&taxonIDs=" + config.objects["named-place-with-taxon-ids"].taxonIDs +
			"&personToken=" + config.user.friend_token;
		request(this.server)
			.get(query)
			.end(function (err, res) {
				res.should.have.status(200);
				res.body.should.have.any.keys("results");
				const everyIsSameTaxon = res.body[helpers.params.results].filter((document) => {
					document.should.have.any.property("taxonIDs").to.deep.equal(config.objects["named-place-with-taxon-ids"].taxonIDs);
					return document["taxonIDs"].includes(config.objects["named-place-with-taxon-ids"].taxonIDs[0]);
				}).should.have.lengthOf.above(0);
				done();
			});
	});

	it("add new named place fails without person token", function(done) {
		const query = basePath +
			"?access_token=" + config["access_token"];
		const np = {
			name: "test",
			geometry: { type: "Point", coordinates: [30, 60] }
		};
		request(this.server)
			.post(query)
			.send(np)
			.end(function (err, res) {
				res.should.have.status(400);
				done();
			});
	});

	it("adding named place with owners", function (done) {
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			owners: [config.user.friend_id],
			name: "test named place",
			geometry: {
				type: "Point",
				coordinates: [60, 30]
			}
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(201);
				res.body.should.have.any.keys("id");
				res.body.should.have.property("owners").eql([config.user.model.id, config.user.friend_id]);
				res.body.id.should.be.a("string");
				res.body.id.should.match(/^MNP\.[0-9]+$/);
				done();
			});
	});

	it("adding private named place", function (done) {
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			editors: [config.user.friend_id],
			name: "test named place",
			geometry: {
				type: "Point",
				coordinates: [60, 30]
			}
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(201);
				res.body.should.have.any.keys("id");
				res.body.should.have.property("editors").eql([config.user.friend_id]);
				res.body.should.have.property("owners").eql([config.user.model.id]);
				res.body.id.should.be.a("string");
				res.body.id.should.match(/^MNP\.[0-9]+$/);
				npId = res.body.id;
				done();
			});
	});

	describe("After adding document", function() {
		it("returns named place since friend is in editors", function(done) {
			if (!npId) {
				this.skip();
			}
			const query = basePath + "/" + npId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend_token;
			request(this.server)
				.get(query)
				.end((err, res) => {
					res.should.have.status(200);
					done();
				});
		});

		it("does not return named place since it is not public", function(done) {
			if (!npId) {
				this.skip();
			}
			const query = basePath + "/" + npId +
				"?access_token=" + config.access_token;
			request(this.server)
				.get(query)
				.end((err, res) => {
					res.should.have.status(403);
					done();
				});
		});

		it("returns updated named place", function(done) {
			if (!npId) {
				this.skip();
			}
			const query = basePath + "/" + npId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			const document = {
				"@type": "MNP.namedPlace",
				id: npId,
				editors: [config.user.model.id, config.user.friend_id],
				name: "New name for the test named place",
				geometry: {
					type: "Point",
					coordinates: [34, 32]
				},
				public: false
			};
			request(this.server)
				.put(query)
				.send(document)
				.end((err, res) => {
					res.should.have.status(200);
					document.owners = [config.user.model.id];
					document["@context"] = res.body["@context"];
					res.body.should.eql(document);
					done();
				});
		});

		describe("After editing document", function() {
			it("returns public named place with personToken", function(done) {
				this.skip(); // No delete so edited np is private
				if (!npId) {
					this.skip();
				}
				const query = basePath + "/" + npId +
					"?access_token=" + config.access_token + "&personToken=" + config.user.token;
				request(this.server)
					.get(query)
					.end((err, res) => {
						res.should.have.status(200);
						done();
					});
			});

			it("returns public named place without personToken", function(done) {
				this.skip(); // No delete so edited np is private
				if (!npId) {
					this.skip();
				}
				const query = basePath + "/" + npId +
					"?access_token=" + config.access_token;
				request(this.server)
					.get(query)
					.end((err, res) => {
						res.should.have.status(200);
						done();
					});
			});

			it("Editors cannot change named place", function(done) {
				if (!npId) {
					this.skip();
				}
				const query = basePath + "/" + npId +
					"?access_token=" + config.access_token + "&personToken=" + config.user.friend_token;
				const document = {
					id: npId,
					editors: [config.user.model.id, config.user.friend_id],
					name: "Try to change",
					geometry: {
						type: "Point",
						coordinates: [34, 32]
					},
					public: false
				};
				request(this.server)
					.put(query)
					.send(document)
					.end((err, res) => {
						res.should.have.status(403);
						done();
					});
			});

			it("Editors cannot delete private named place", function(done) {
				if (!npId) {
					this.skip();
				}
				const query = basePath + "/" + npId +
					"?access_token=" + config.access_token + "&personToken=" + config.user.friend_token;
				request(this.server)
					.delete(query)
					.end((err, res) => {
						res.should.have.status(403);
						done();
					});
			});

			it("Owner can delete private named place even if it is used in document", function(done) {
				// TODO rm after document endpoint is implemented
				return this.skip();
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
				const documentQuery = config.urls.document +
					"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
				let documentId;
				request(this.server)
					.post(documentQuery)
					.send(document)
					.end((err, res) => {
						if (res.status !== 200) {
							this.skip();
						}
						documentId = res.body.id;
						const query = basePath + "/" + npId +
							"?access_token=" + config.access_token + "&personToken=" + config.user.token;
						request(this.server)
							.delete(query)
							.end((err, res) => {
								res.should.have.status(200);
								done();

								// Rm test doc silently.
								void request(this.server)
									.delete(config.urls.document + "/" + documentId);
							});
					});
			});
		});
	});

	describe("Reservation", function() {

		it("fails if user doesn't have access to place's collection", function(done) {
			const query = basePath + "/" + config.objects["named-place-not-permitted-for-test-user"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(403);
					done();
				});
		});

		it("fails when 'until' is in the past", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token + "&until=1920-12-02";
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(422);
					done();
				});
		});

		it("fails when 'until' is too far away in the future", function(done) {
			const date = new Date();
			date.setMonth(date.getMonth() + 13);
			const query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token + "&until=" + dateToISODate(date);
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(400);
					res.body.should.have.property("message").eql("You can't reserve to a date so far away in the future");
					done();
				});
		});

		it("with far-away 'until' when is admin", function(done) {
			const date = new Date();
			date.setMonth(date.getMonth() + 13);
			const query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token + "&until=" + dateToISODate(date);
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(201);
					res.body.reserve.should.have.property("until").eql(dateToISODate(date));
					done();
				});
		});

		it("can be added if user has access to place's collection", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(201);
					res.body.reserve.should.have.property("reserver").eql(config.user.model.id);
					done();
				});
		});

		it("can't be added if already reserved and not admin", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token;
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(400);
					done();
				});
		});

		it("can be removed", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.delete(query)
				.end((err, res) => {
					res.should.have.status(200);
					res.body.should.not.have.property("reserve");
					done();
				});
		});

		it("can't be removed if not own and not admin", function(done) {
			let query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(201);

					query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
						"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token;
					request(this.server)
						.delete(query)
						.end((err, res) => {
							res.should.have.status(403);
							done();
						});
				});
		});

		it("can be reserved by admin even if reserved already", function(done) {
			let query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(201);

					// Clean reservation for next tests.
					query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
						"?access_token=" + config.access_token + "&personToken=" + config.user.token;
					request(this.server)
						.delete(query)
						.end((err, res) => {
							res.should.have.status(200);
							done();
						});
				});
		});

		it("can't be reserved to other users if not admin", function(done) {
			let query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token + "&personID=" + config.user.friend_id;
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(403);
					done();
				});
		});

		it("can be reserved to other user by admin", function(done) {
			let query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token + "&personID=" + config.user.friend2_id;
			request(this.server)
				.post(query)
				.end((err, res) => {
					res.should.have.status(201);
					res.body.reserve.should.have.property("reserver").eql(config.user.friend2_id);

					// Remove reservation in order to keep reservation status untouched after tests
					const query = basePath + "/" + config.objects["named-place"].id + "/reservation" +
						"?access_token=" + config.access_token + "&personToken=" + config.user.token;
					request(this.server)
						.delete(query)
						.end((err, res) => {
							res.should.have.status(200);
							res.body.should.not.have.property("reserve");
							done();
						});
				});
		});
	});

	describe("Accepted document", function() {
		it("modifying fails if not admin", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token;
			const namedPlace = { ...config.objects["named-place"], acceptedDocument: { gatherings: [{}] } };
			request(this.server)
				.put(query)
				.send(namedPlace)
				.end((err, res) => {
					res.should.have.status(403);
					done();
				});
		});

		it("modifying works if MHL.allowAddingPublic", function(done) {
			const query = basePath + "/" + config.objects["named-place-with-feature-adding-public-named-places-allowed-test-user-has-access"].id +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token;
			const namedPlace = {
				...config.objects["named-place-with-feature-adding-public-named-places-allowed-test-user-has-access"],
				acceptedDocument: { gatherings: [{}] }
			};
			request(this.server)
				.put(query)
				.send(namedPlace)
				.end(function (err, res) {
					res.should.have.status(200);
					done();
				});
		});

		it("modifying works if admin", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			const namedPlace = { ...config.objects["named-place"], acceptedDocument: { gatherings: [{ units: [{}] }] } };
			request(this.server)
				.put(query)
				.send(namedPlace)
				.end((err, res) => {
					res.should.have.status(200);
					res.body.should.have.property("acceptedDocument");
					done();
				});
		});

		it("filters units on fetching single", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token;
			request(this.server)
				.get(query)
				.end((err, res) => {
					res.should.have.status(200);
					res.body.acceptedDocument.should.have.property("gatherings");
					res.body.acceptedDocument.gatherings.forEach(gathering => {
						gathering.should.not.have.property("units");
					});
					res.body.prepopulatedDocument.should.have.property("gatherings");
					res.body.prepopulatedDocument.gatherings.forEach(gathering => {
						gathering.should.not.have.property("units");
					});
					done();
				});
		});

		it("filters units on fetching many", function(done) {
			//(public:true OR owners:"MA.837" OR editors:"MA.837") AND ((NOT _exists_:"collectionID"))
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token;
			request(this.server)
				.get(query)
				.end((err, res) => {
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
					done();
				});
		});

		it("filters units on fetching many when using Elastic", function(done) {
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token;
			request(this.server)
				.get(query)
				.end((err, res) => {
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
					done();
				});
		});

		it("doesn't filter units on fetching single if includeUnits is true", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token +
				"&includeUnits=true";
			request(this.server)
				.get(query)
				.end((err, res) => {
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
					done();
				});
		});

		it("doesn't filter units on fetching many if includeUnits is true", function(done) {
			const query = basePath +
				"?access_token=" + config.access_token +
				"&personToken=" + config.user.friend2_token +
				"&collectionID=HR.2049" +
				"&includeUnits=true";
			request(this.server)
				.get(query)
				.end((err, res) => {
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
					done();
				});
		});

		it("filters units if collectionID isn't HR.2049 even if includeUnits is true on fetching single", function(done) {
			const query = basePath + "/" + config.objects["named-place"].id +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token +
				"&includeUnits=true";
			request(this.server)
				.get(query)
				.end((err, res) => {
					res.should.have.status(200);
					res.body.acceptedDocument.should.have.property("gatherings");
					res.body.acceptedDocument.gatherings.forEach(gathering => {
						gathering.should.not.have.property("units");
					});
					res.body.prepopulatedDocument.should.have.property("gatherings");
					res.body.prepopulatedDocument.gatherings.forEach(gathering => {
						gathering.should.not.have.property("units");
					});
					done();
				});
		});

		it("filters units if collectionID isn't HR.2049 even if includeUnits is true for many", function(done) {
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token +
				"&includeUnits=true";
			request(this.server)
				.get(query)
				.end((err, res) => {
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
					done();
				});
		});

		it("filters units if collectionID isn't HR.2049 even if includeUnits is true for many when using Elastic", function(done) {
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token +
				"&includeUnits=true";
			request(this.server)
				.get(query)
				.end((err, res) => {
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
					done();
				});
		});

		it("has only selected fields that where asked", function(done) {
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token +
				"&selectedFields=name";
			request(this.server)
				.get(query)
				.end((err, res) => {
					res.should.have.status(200);
					res.body.results.should.not.have.length(0);
					res.body.results.forEach(namedPlace => {
						namedPlace.should.property("name");
						namedPlace.should.not.property("prepopulatedDocument");
						namedPlace.should.not.property("owners");
						namedPlace.should.not.property("editors");
						namedPlace.should.not.property("collectionID");
					});
					done();
				});
		});
	});

	// TODO uncomment when document endpoint implemented0
	// describe("Deleting public", function() {
	// 	let npId, docId;
	// 	before(function (done) {
	// 		const testCollectionID = config.id["test_form_with_np_feature_collectionID"];
	// 		const formID = config.id["test_form_with_np_feature"];
  //
	// 		const np = {
	// 			name: "Test",
	// 			geometry: {
	// 				type: "Point",
	// 				coordinates: [34, 32]
	// 			},
	// 			public: true,
	// 			collectionID: testCollectionID
	// 		};
  //
	// 		const query = basePath +
	// 			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
	// 		request(this.server)
	// 			.post(query)
	// 			.send(np)
	// 			.end((err, res) => {
	// 				if (err) return done(err);
	// 				npId = res.body.id;
	// 				const doc = {
	// 					collectionID: testCollectionID,
	// 					gatheringEvent: {},
	// 					gatherings: [{ geometry: { type: "Point", coordinates: [25, 60] } }],
	// 					formID,
	// 					namedPlaceID: npId
	// 				};
	// 				const documentQuery = config.urls.document +
	// 					"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
	// 				request(this.server)
	// 					.post(documentQuery)
	// 					.send(doc)
	// 					.end(function (err, res) {
	// 						res.should.have.status(200);
	// 						docId = res.body.id;
	// 						done();
	// 					});
	// 			});
	// 	});
  //
	// 	it("editor can't delete", function(done) {
	// 		const query = basePath + "/" + npId +
	// 			"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend_token;
	// 		request(this.server)
	// 			.delete(query)
	// 			.end((err, res) => {
	// 				res.should.have.status(403);
	// 				done();
	// 			});
	// 	});
  //
	// 	it("doesn't delete public named place if it has documents", function(done) {
	// 		const query = basePath + "/" + npId +
	// 			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
	// 		request(this.server)
	// 			.delete(query)
	// 			.end((err, res) => {
	// 				res.should.have.status(422);
	// 				done();
	// 			});
	// 	});
  //
	// 	// The test is skipped because it is known to fail because the document
	// 	// query returns the deleted document because of Elastic Search index cache.
	// 	it("deletes public named place if it has no documents", function(done) {
	// 		return this.skip();
  //
	// 		const documentQuery = config.urls.document + "/" + docId +
	// 			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
	// 		request(this.server)
	// 			.delete(documentQuery)
	// 			.end((err, res) => {
	// 				res.should.have.status(204);
	// 				const documentQuery = config.urls.document + "?namedPlace=" + npId +
	// 					"&access_token=" + config["access_token"] + "&personToken=" + config.user.token;
	// 				request(this.server)
	// 					.get(documentQuery)
	// 					.end((err, res) => {
	// 						const query = basePath + "/" + npId +
	// 							"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
	// 						request(this.server)
	// 							.delete(query)
	// 							.end((err, res) => {
	// 								res.should.have.status(204);
	// 								done();
	// 							});
	// 					});
	// 			});
	// 	});
	// });

	describe("MHL.allowAddingPublic", function() {

		let npId;

		const testCollectionID = config.id["test_form_with_np_feature_collectionID"];

		const npForNoFeature = {
			name: "Test",
			geometry: {
				type: "Point",
				coordinates: [34, 32]
			},
			public: true,
			collectionID: testCollectionID
		};

		it("doesn't allow adding if editor and has not feature", function(done) {
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend_token;
			request(this.server)
				.post(query)
				.send(npForNoFeature)
				.end((err, res) => {
					res.should.have.status(403);
					done();
				});
		});

		it("doesn't allow deleting if editor and has not feature", function(done) {
			// Create the place with admin token for test.
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.post(query)
				.send(npForNoFeature)
				.end((err, res) => {
					res.should.have.status(201);
					npId = res.body.id;
					// Try deleting with person token.
					const query = basePath + "/" + npId +
						"?access_token=" + config.access_token + "&personToken=" + config.user.friend_token;
					request(this.server)
						.delete(query)
						.end((err, res) => {
							res.should.have.status(403);
							done();

							// Silently remove after test.
							const query = basePath + "/" + npId +
								"?access_token=" + config.access_token + "&personToken=" + config.user.token;
							request(this.server)
								.delete(query)
								.end();
						});
				});
		});

		it("allows adding if editor and has feature", function(done) {
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend2_token;
			const namedPlace = { ...config.objects["named-place-with-feature-adding-public-named-places-allowed-test-user-has-access"] };
			delete namedPlace.id;
			request(this.server)
				.post(query)
				.send(namedPlace)
				.end((err, res) => {
					res.should.have.status(201);
					npId = res.body.id;
					done();
				});
		});

		it("allows deleting other's place if editor and has feature", function(done) {
			if (!npId) {
				this.skip();
			}
			const query = basePath + "/" + npId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend_token;
			request(this.server)
				.delete(query)
				.end((err, res) => {
					res.should.have.status(200);
					done();
				});
		});
	});

	describe("disabled form", function() {
		const testCollectionID = config.id["disabled_form_collectionID"];
		const testExisting = config.id["disabled_form_np"];

		const npForNoFeature = {
			name: "Test",
			geometry: {
				type: "Point",
				coordinates: [34, 32]
			},
			collectionID: testCollectionID
		};

		it("doesn't allow adding", function (done) {
			const query = basePath +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.post(query)
				.send(npForNoFeature)
				.end((err, res) => {
					res.should.have.status(422);
					done();
				});
		});

		it("doesn't allow editing", function (done) {
			const query = basePath + "/" + testExisting +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			const updatedNP = { ...npForNoFeature, id: testExisting };
			delete updatedNP.collectionID;
			request(this.server)
				.put(query)
				.send(updatedNP)
				.end((err, res) => {
					res.should.have.status(422);
					done();
				});
		});

		it("doesn't allow deleting", function (done) {
			const query = basePath + "/" + testExisting +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.delete(query)
				.end((err, res) => {
					res.should.have.status(422);
					done();
				});
		});
	});

	describe("MHL.strict", function() {
		const strictNpId = config.id["np_with_named_places_and_strict_feature"];
		let strictNp;

		before(function (done) {
			const query = basePath + "/" + strictNpId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(this.server)
				.get(query)
				.end((err, res) => {
					res.should.have.status(200);
					strictNp = res.body;
					done();
				});
		});

		describe("enabled", function () {
			it("prevents creating prepopulatedDocument with fields not in form fields", function (done) {
				const strictNpWithInvalidPrepopDoc = JSON.parse(JSON.stringify(strictNp));
				strictNpWithInvalidPrepopDoc.prepopulatedDocument = { gatheringEvent: { acknowledgeNoUnitsInCensus: true } };
				delete strictNpWithInvalidPrepopDoc.id;

				const query = basePath + "/" +
					"?access_token=" + config.access_token + "&personToken=" + config.user.token;
				request(this.server)
					.post(query)
					.send(strictNpWithInvalidPrepopDoc)
					.end((err, res) => {
						res.should.have.status(422);
						done();
					});
			});

			it("prevents editing prepopulatedDocument with fields not in form fields", function (done) {
				const strictNpWithInvalidPrepopDoc = JSON.parse(JSON.stringify(strictNp));
				strictNpWithInvalidPrepopDoc.prepopulatedDocument = { gatheringEvent: { acknowledgeNoUnitsInCensus: true } };

				const query = basePath + "/" + strictNpWithInvalidPrepopDoc.id +
					"?access_token=" + config.access_token + "&personToken=" + config.user.token;
				request(this.server)
					.put(query)
					.send(strictNpWithInvalidPrepopDoc)
					.end((err, res) => {
						res.should.have.status(422);
						done();
					});
			});
		});

		describe("disabled", function () {
			it("does not prevent creating prepopulatedDocument with fields not in form fields", function (done) {
				const np = JSON.parse(JSON.stringify(strictNp));
				np.prepopulatedDocument.gatheringEvent.acknowledgeNoUnitsInCensus = true;
				np.collectionID = config.id["test_form_with_np_feature_collectionID_non_strict"];
				delete np.id;

				const query = basePath + "/" +
					"?access_token=" + config.access_token + "&personToken=" + config.user.token;
				request(this.server)
					.post(query)
					.send(np)
					.end((err, res) => {
						res.should.have.status(201);
						id = res.id;
						done();
					});
			});

			it("does not prevent editing prepopulatedDocument with fields not in form fields", function (done) {
				const np = JSON.parse(JSON.stringify(strictNp));
				np.prepopulatedDocument.gatheringEvent.acknowledgeNoUnitsInCensus = true;
				np.collectionID = config.id["test_form_with_np_feature_collectionID_non_strict"];

				const query = basePath + "/" + np.id +
					"?access_token=" + config.access_token + "&personToken=" + config.user.token;
				request(this.server)
					.put(query)
					.send(strictNp)
					.end((err, res) => {
						res.should.have.status(422);
						done();
					});
			});
		});
	});
});
