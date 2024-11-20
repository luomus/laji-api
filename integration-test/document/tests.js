var config = require("../config.json");
var helpers = require("../helpers");
const assert = require("assert");
const { request } = require("chai");

describe("/documents", function() {
	const basePath = config.urls.document;
	const validatePath = basePath + "/validate";
	let documentId, templateId, lockedId, dateCreated;
	const validDocument = {
		formID: "MHL.119",
		editors: [config.user.model.id, config.user.friend_id],
		dateCreated: "2015-01-01T00:00:00+03:00",
		creator: "MA.0",
		editor: "MA.1",
		gatheringEvent: {
			dateBegin: "2017-10-12",
			leg: ["Viltsu"]
		},
		gatherings: [
			{
				geometry: {
					"type": "Point",
					"coordinates": [20.3, 60.4]
				},
				notes: "foo bar",
				units: [
					{
						identifications: [
							{
								taxon: "Parmaj"
							}
						]
					}
				]
			}
		]
	};

	const privateDocumentInvalidAgainstValidatorsButSchematicallyOK = {
		...validDocument,
		gatheringEvent: {
			...validDocument.gatheringEvent,
			leg: [] // The form has min 1 validator
		},
		publicityRestrictions: "MZ.publicityRestrictionsPrivate"
	};

	const documentWithPropertyNotInFormJSONStrictForm = JSON.parse(JSON.stringify(validDocument));
	documentWithPropertyNotInFormJSONStrictForm.gatherings[0].units[0].identifications[0].taxonID = "MX.123";

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns 401 when no access token specified for id", function(done) {
		request(this.server)
			.get(basePath + "/" + config.id.document)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns 400 when no person token specified when using ES index", function(done) {
		var query = basePath +
			"?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(400);
				done();
			});
	});

	it("returns 400 when no person token specified", function(done) {
		var query = basePath +
			"?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(400);
				done();
			});
	});

	it("returns 404 when accessing others documents when using ES index", function(done) {
		var query = basePath + "/" + config.id.document_others +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(404);
				done();
			});
	});

	it("returns 404 when accessing others documents", function(done) {
		var query = basePath + "/" + config.id.document_others +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(404);
				done();
			});
	});

	it("does not allow adding without formID", function (done) {
		var query = basePath +
			"?access_token=" + config["access_token"] + "&validationErrorFormat=object&personToken=" + config.user.token;
		var document = {
			editors: [config.user.model.id],
			dateCreated: "2015-01-01T00:00:00+03:00",
			creator: "MA.0",
			editor: "MA.1",
			gatherings: [
				{
					notes: "foo bar",
					units: [
						{
							recordBasis: "FooBar"
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
				res.body.should.be.a("object");
				res.body.should.have.property("details");
				res.body.details.should.be.a("object");
				res.body.details.should.have.property("formID");
				res.body.details.formID.should.be.a("object");
				res.body.details.formID.should.have.property("errors");
				done();
			});
	});

	it("check that api returns detailed error message", function (done) {
		this.timeout(10000);
		var query = basePath +
			"?access_token=" + config["access_token"] + "&validationErrorFormat=object&personToken=" + config.user.token;
		var document = {
			formID: "MHL.119",
			editors: [config.user.model.id],
			dateCreated: "2015-01-01T00:00:00+03:00",
			creator: "MA.0",
			editor: "MA.1",
			gatherings: [
				{
					notes: "foo bar",
					units: [
						{
							recordBasis: "FooBar"
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
				res.body.should.be.a("object");
				res.body.should.have.property("details");
				res.body.details.should.be.a("object");
				res.body.details.should.have.property("gatherings");
				res.body.details.gatherings.should.be.a("object");
				res.body.details.gatherings.should.have.property("0");
				res.body.details.gatherings["0"].should.have.property("units");
				res.body.details.gatherings["0"].units.should.be.a("object");
				res.body.details.gatherings["0"].units.should.have.property("0");
				res.body.details.gatherings["0"].units["0"].should.have.property("recordBasis");
				res.body.details.gatherings["0"].units["0"].recordBasis.should.be.a("object");
				res.body.details.gatherings["0"].units["0"].recordBasis.should.have.property("errors");
				done();
			});
	});

	it("adding template works", function (done) {
		var query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		var document = {
			formID: "MHL.119",
			editors: [config.user.model.id, config.user.friend_id],
			dateCreated: "2015-01-01T00:00:00+03:00",
			creator: "MA.0",
			editor: "MA.1",
			gatherings: [
				{
					notes: "Template"
				}
			],
			isTemplate: true,
			templateName: "Test template",
			templateDescription: "Test template description"
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(201);
				res.body.should.have.any.keys("id");
				res.body.id.should.be.a("string");
				res.body.id.should.match(/^JX\.[0-9]+$/);
				templateId = res.body.id;
				done();
			});
	});

	it("adding locked document works", function (done) {
		var query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		var document = {
			formID: "MHL.119",
			editors: [config.user.model.id, config.user.friend_id],
			dateCreated: "2015-01-01T00:00:00+03:00",
			creator: "MA.0",
			editor: "MA.1",
			gatheringEvent: {
				dateBegin: "2017-10-12",
				leg: ["Viltsu"]
			},
			gatherings: [
				{
					geometry: {
						"type": "Point",
						"coordinates": [20.3, 60.4]
					},
					notes: "foo bar",
					units: [
						{
							identifications: [
								{
									taxon: "Parmaj"
								}
							]
						}
					]
				}
			],
			locked: true
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(201);
				res.body.should.have.any.keys("id");
				res.body.id.should.be.a("string");
				res.body.id.should.match(/^JX\.[0-9]+$/);
				lockedId = res.body.id;
				done();
			});
	});

	it("check that adding generates default fields", function (done) {
		var query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = JSON.parse(JSON.stringify(validDocument));
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(201);
				res.body.should.have.any.keys("id");
				res.body.should.have.any.keys("dateCreated");
				res.body.should.have.any.keys("dateEdited");
				res.body.should.have.any.keys("editor");
				res.body.should.have.any.keys("creator");
				res.body.should.have.any.keys("editors");
				res.body.should.have.any.keys("gatherings");
				res.body.should.have.property("formID").eql(document.formID);
				res.body.should.have.property("collectionID").eql("HR.1747");
				res.body.should.have.property("publicityRestrictions").eql("MZ.publicityRestrictionsPublic");
				res.body.should.not.include({dateCreated: document.dateCreated});
				res.body.gatherings.should.have.lengthOf(1);
				delete(document.gatherings[0].geometry);
				delete(document.gatherings[0].units);
				res.body.gatherings[0].should.include(document.gatherings[0]);
				res.body.gatherings[0].should.have.any.keys("id");
				res.body.should.include({editor: config.user.model.id, creator: config.user.model.id});
				res.body.id.should.be.a("string");
				res.body.id.should.match(/^JX\.[0-9]+$/);
				documentId = res.body.id;
				dateCreated = res.body.dateCreated;
				done();
			});
	});


	it("allows adding secondary copy of a document with id", function (done) {
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			...validDocument,
			id: "T.123",
			formID: config.id.form_with_secondary_copy_feature
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(201);
				done();
			});
	});

	it("allows deleting secondary copy", function (done) {
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			delete: true,
			id: "T.123",
			formID: config.id.form_with_secondary_copy_feature
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(201);
				res.body.should.have.property("collectionID");
				done();
			});
	});

	it("deleting secondary is valid by valid endpoint", function (done) {
		const query = validatePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			delete: true,
			id: "T.123",
			formID: config.id.form_with_secondary_copy_feature
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				done();
			});
	});

	it("deleting primary is not valid by valid endpoint", function (done) {
		const query = validatePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			delete: true,
			id: "T.123",
			formID: validDocument.formID
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(422);
				done();
			});
	});

	it("gives validation error when validating secondary copy without id", function (done) {
		const query = validatePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			...validDocument,
			formID: config.id.form_with_secondary_copy_feature
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(422);
				done();
			});
	});

	it("is valid when validating secondary copy with id", function (done) {
		const query = validatePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			...validDocument,
			formID: config.id.form_with_secondary_copy_feature,
			id: "FOOBAR"
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				done();
			});
	});

	it("is valid when validating with id", function (done) {
		const query = validatePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			...validDocument,
			id: "FOOBAR"
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				done();
			});
	});

	it("is valid when validating without id", function (done) {
		const query = validatePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			...validDocument
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				done();
			});
	});

	it("create does not allow fields not in form JSON for strict form", function (done) {
		const doc = JSON.parse(JSON.stringify(documentWithPropertyNotInFormJSONStrictForm));
		delete doc.id;
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		request(this.server)
			.post(query)
			.send(doc)
			.end(function (err, res) {
				res.should.have.status(422);
				done();
			});
	});

	it("edit does not allow fields not in form JSON for strict form", function (done) {
		const query = basePath + "/" + config.id["strict_form_doc_id"] +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		request(this.server)
			.put(query)
			.send(documentWithPropertyNotInFormJSONStrictForm)
			.end(function (err, res) {
				res.should.have.status(422);
				done();
			});
	});

	it("edit allows fields not in form JSON for non-strict form", function(done) {
		const getQuery = basePath + "/" + config.id["non_strict_form_doc_id"] +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		request(this.server)
			.get(getQuery)
			.end((err, res) => {
				res.should.have.status(200);
				res.body.gatheringEvent.acknowledgeNoUnitsInCensus = true;
				const query = basePath + "/" + config.id["non_strict_form_doc_id"] +
					"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
				request(this.server)
					.put(query)
					.send(res.body)
					.end((err, res) => {
						res.should.have.status(200);
						done();
					});
			});
	});

	it("validator endpoint does not allow fields not in form JSON", function(done) {
		const query = validatePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		request(this.server)
			.post(query)
			.send(documentWithPropertyNotInFormJSONStrictForm)
			.end(function (err, res) {
				res.should.have.status(422);
				done();
			});
	});

	it("does not allow adding secondary copy of a document without id", function (done) {
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			...validDocument,
			formID: config.id.form_with_secondary_copy_feature
		};
		request(this.server)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(422);
				done();
			});
	});

	it("document with MZ.publicityRestrictionsPrivate bypasses validators", function (done) {
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		request(this.server)
			.post(query)
			.send(privateDocumentInvalidAgainstValidatorsButSchematicallyOK)
			.end((err, res) => {
				if (err) return done(err);
				res.should.have.status(201);
				request(this.server).delete(query).send(); // Silent cleanup
				done();
			});
	});

	describe("After adding document", function() {
		it("updates data", function(done) {
			this.timeout(4000);
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			var document = {
				id: documentId,
				editors: [config.user.model.id, config.user.friend_id],
				formID: "MHL.119",
				creator: config.user.model.id,
				editor: "MA.1",
				dateCreated: "2015-01-01T00:00:00+03:00",
				gatheringEvent:{
					dateBegin: "2016-10-12",
					leg: ["foo", "joku"]
				},
				gatherings: [
					{
						"@type": "MY.gathering",
						notes: "new notes",
						id: documentId + "#5",
						geometry: {
							"coordinates": [21.3, 60.4],
							"type": "Point"
						},
						units: [
							{
								"@type": "MY.unit",
								id: documentId + "#3",
								identifications: [
									{
										"@type": "MY.identification",
										id: documentId + "#4",
										taxon: "Käki"
									}
								],
								typeSpecimens: [
									{
										"@type": "MY.identification",
										id: documentId + "#6",
										typeNotes: "tyyppi tietoa"
									}
								]
							}
						]
					},
					{
						geometry: {
							"coordinates": [22.3, 60.4],
							"type": "Point"
						},
						notes: "JUST A TEST",
						units: [
							{
								"@type": "MY.unit",
								id: documentId + "#3",
								identifications: [
									{
										"@type": "MY.identification",
										taxon: "Jokin muu"
									}
								]
							}
						]
					}
				]
			};
			request(this.server)
				.put(query)
				.send(document)
				.end(function (err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.property("id").eql(documentId);
					res.body.should.have.property("editor").eql(config.user.model.id);
					res.body.should.have.property("creator").eql(config.user.model.id);
					res.body.should.have.property("dateCreated").eql(dateCreated);
					res.body.should.have.property("collectionID").eql("HR.1747");
					res.body.should.have.property("editors").eql([config.user.model.id, config.user.friend_id]);
					res.body.should.have.property("gatherings");
					res.body.should.have.property("gatheringEvent");
					res.body.gatheringEvent.should.have.property("leg").eql(["foo", "joku"]);
					res.body.gatherings.should.be.a("array");
					res.body.gatherings.should.have.lengthOf(2);
					res.body.gatherings[1].should.have.any.keys("id");
					res.body.gatherings[1].should.have.any.keys("geometry");
					res.body.gatherings[1].should.have.any.keys("units");
					try {
						document.gatherings[0].units[0].typeSpecimens[0]["@type"] = "MY.typeSpecimen";
					} catch (e) {}
					res.body.gatherings[0].should.deep.equal(document.gatherings[0]);
					done();
				});
		});

		it("editor can update", function(done) {
			this.timeout(4000);
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend_token;
			var document = {
				id: documentId,
				editors: [config.user.model.id, config.user.friend_id],
				formID: "MHL.119",
				creator: config.user.model.id,
				editor: "MA.1",
				dateCreated: "2015-01-01T00:00:00+03:00",
				gatheringEvent:{
					dateBegin: "2016-10-12",
					leg: ["foo", "joku"]
				},
				gatherings: [
					{
						"@type": "MY.gathering",
						notes: "new notes",
						id: documentId + "#5",
						geometry: {
							"coordinates": [21.3, 60.4],
							"type": "Point"
						},
						units: [
							{
								"@type": "MY.unit",
								id: documentId + "#3",
								identifications: [
									{
										"@type": "MY.identification",
										id: documentId + "#4",
										taxon: "Käki"
									}
								],
								typeSpecimens: [
									{
										"@type": "MY.identification",
										id: documentId + "#6",
										typeNotes: "tyyppi tietoa"
									}
								]
							}
						]
					},
					{
						geometry: {
							"coordinates": [22.3, 60.4],
							"type": "Point"
						},
						notes: "JUST A TEST",
						units: [
							{
								"@type": "MY.unit",
								id: documentId + "#3",
								identifications: [
									{
										"@type": "MY.identification",
										taxon: "Jokin muu"
									}
								]
							}
						]
					}
				]
			};
			request(this.server)
				.put(query)
				.send(document)
				.end(function (err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.property("id").eql(documentId);
					res.body.should.have.property("editor").eql(config.user.friend_id);
					res.body.should.have.property("creator").eql(config.user.model.id);
					res.body.should.have.property("dateCreated").eql(dateCreated);
					res.body.should.have.property("collectionID").eql("HR.1747");
					res.body.should.have.property("editors").eql([config.user.model.id, config.user.friend_id]);
					res.body.should.have.property("gatherings");
					res.body.should.have.property("gatheringEvent");
					res.body.gatheringEvent.should.have.property("leg").eql(["foo", "joku"]);
					res.body.gatherings.should.be.a("array");
					res.body.gatherings.should.have.lengthOf(2);
					res.body.gatherings[1].should.have.any.keys("id");
					res.body.gatherings[1].should.have.any.keys("geometry");
					res.body.gatherings[1].should.have.any.keys("units");
					try {
						document.gatherings[0].units[0].typeSpecimens[0]["@type"] = "MY.typeSpecimen";
					} catch (e) {}
					res.body.gatherings[0].should.deep.equal(document.gatherings[0]);
					done();
				});
		});

		it("does not allow editing a locked document", function(done) {
			this.timeout(4000);
			if (!lockedId) {
				return this.skip();
			}
			var query = basePath + "/" + lockedId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			var document = {
				id: lockedId,
				formID: "MHL.119",
				creator: config.user.model.id,
				editors: [config.user.model.id, config.user.friend_id],
				dateCreated: "2015-01-01T00:00:00+03:00",
				editor: "MA.1",
				gatherings: [
					{
						notes: "Template"
					}
				],
				locked: true
			};
			request(this.server)
				.put(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(422);
					res.body.should.be.a("object");
					res.body.should.have.property("details");
					res.body.details.should.be.a("object");
					res.body.details.should.have.property("locked");
					res.body.details.locked.should.be.a("object");
					done();
				});
		});

		it("does not allow deleting lockedId", function(done) {
			if (!lockedId) {
				return this.skip();
			}
			var query = basePath + "/" + lockedId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			request(this.server)
				.delete(query)
				.end(function (err, res) {
					res.should.have.status(422);
					done();
				});
		});

		it("cannot update document without formID", function(done) {
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			var document = {
				id: "JX.1",
				editors: [config.user.model.id],
				formID: "",
				gatheringEvent:{
					dateBegin: "2016-10-12",
					leg: ["foo", "joku"]
				},
				gatherings: [
					{
						geometry: {
							"coordinates": [21.3, 60.4],
							"type": "Point"
						},
						id: documentId + "#1",
						notes: "new notes",
						units: [
							{
								id: documentId + "#3",
								identifications: [
									{
										id: documentId + "#4",
										taxon: "Käki"
									}
								],
								typeSpecimens: [
									{
										typeNotes: "tyyppi tietoa"
									}
								]
							}
						]
					}
				]
			};
			request(this.server)
				.put(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(422);
					res.body.should.be.a("object");
					res.body.should.have.property("details");
					res.body.details.should.be.a("object");
					res.body.details.should.have.property("formID");
					done();
				});
		});

		it("cannot update template as editor", function(done) {
			if (!templateId) {
				return this.skip();
			}
			var query = basePath + "/" + templateId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend_token;
			var document = {
				id: templateId,
				editors: [config.user.model.id],
				creator: config.user.model.id,
				formID: "MHL.119",
				editor: "MA.1",
				dateCreated: "2015-01-01T00:00:00+03:00",
				gatheringEvent:{
					dateBegin: "2016-10-12",
					leg: ["foo", "joku"]
				},
				gatherings: [],
				isTemplate: true
			};
			request(this.server)
				.put(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(403);
					done();
				});
		});

		it("cannot update document id", function(done) {
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			var document = {
				id: "JX.1",
				editors: [config.user.model.id],
				formID: "MHL.119",
				gatheringEvent:{
					dateBegin: "2016-10-12",
					leg: ["foo", "joku"]
				},
				gatherings: [
					{
						id: documentId + "#1",
						notes: "new notes",
						geometry: {
							"coordinates": [21.3, 60.4],
							"type": "Point"
						},
						units: [
							{
								id: documentId + "#3",
								identifications: [
									{
										id: documentId + "#4",
										taxon: "Käki"
									}
								],
								typeSpecimens: [
									{
										typeNotes: "tyyppi tietoa"
									}
								]
							}
						]
					}
				]
			};
			request(this.server)
				.put(query)
				.send(document)
				.end(function (err, res) {
					if (err) return done(err);
					res.should.have.status(422);
					done();
				});
		});

		it("can update child classes", function(done) {
			return this.skip(); // TODO this sub id logic in the old API is awful, just don't implement and rm this test?
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			var document = {
				id: documentId,
				editors: [config.user.model.id, config.user.friend_id],
				creator: config.user.model.id,
				formID: "MHL.119",
				gatheringEvent:{
					dateBegin: "2016-10-12",
					leg: ["foo", "joku"]
				},
				gatherings: [
					{
						id: "JX.1",
						notes: "new notes",
						geometry: {
							"coordinates": [21.3, 60.4],
							"type": "Point"
						},
						units: [
							{
								"@type": "MY.unit",
								identifications: [
									{
										"@type": "MY.identification",
										taxon: "Käpytikka"
									}
								],
								typeSpecimens: [
									{
										"@type": "MY.typeSpecimen",
										id: "JX.1#2",
										typeNotes: "some notes"
									}
								]
							}
						]
					},
					{
						geometry: {
							"coordinates": [21.3, 60.4],
							"type": "Point"
						},
						id: documentId + "#3",
						notes: "Other",
						units: [
							{
								"@type": "MY.unit",
								identifications: [
									{
										"@type": "MY.identification",
										taxon: "Käpytikka 2"
									}
								]
							}
						]
					},
					{
						notes: "Keep the id put move down",
						geometry: {
							"coordinates": [21.3, 60.4],
							"type": "Point"
						},
						units: [
							{
								"@type": "MY.unit",
								id: documentId + "#3",
								identifications: [
									{
										"@type": "MY.identification",
										id: "JX.1#1",
										taxon: "Kotka"
									},
									{
										"@type": "MY.identification",
										id: documentId + "#4",
										taxon: "Käki"
									},
									{
										"@type": "MY.identification",
										id: documentId + "#4",
										taxon: "vanha"
									}
								],
								typeSpecimens: [
									{
										"@type": "MY.typeSpecimen",
										id: "JX.3#2",
										typeNotes: "no 100% sure"
									}
								]
							}
						]
					}
				]
			};
			request(this.server)
				.put(query)
				.send(document)
				.end(function (err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.have.any.keys("gatherings");
					res.body.gatherings.should.have.lengthOf(3);
					try {
						document.gatherings[0].id = documentId + "#12";
						document.gatherings[0].units[0].id = documentId + "#13";
						document.gatherings[0].units[0].identifications[0].id = documentId + "#14";
						document.gatherings[0].units[0].typeSpecimens[0].id = documentId + "#15";
						document.gatherings[1].id = documentId + "#16";
						document.gatherings[1].units[0].id = documentId + "#17";
						document.gatherings[1].units[0].identifications[0].id = documentId + "#18";
						document.gatherings[2].id = documentId + "#19";
						document.gatherings[2].units[0].identifications[0].id = documentId + "#20";
						document.gatherings[2].units[0].identifications[2].id = documentId + "#21";
						document.gatherings[2].units[0].typeSpecimens[0].id = documentId + "#22";
						document.gatherings[0]["@type"] = "MY.gathering";
						document.gatherings[1]["@type"] = "MY.gathering";
						document.gatherings[2]["@type"] = "MY.gathering";
					} catch (e) {}
					res.body.gatherings[0].should.deep.equal(document.gatherings[0]);
					res.body.gatherings[1].should.deep.equal(document.gatherings[1]);
					res.body.gatherings[2].should.deep.equal(document.gatherings[2]);
					res.body.should.include({
						id: documentId,
						editor: config.user.model.id,
						creator: config.user.model.id,
						dateCreated: dateCreated
					});
					done();
				});
		});

		it("returns 400 when no person token specified and asking with id", function(done) {
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"];
			request(this.server)
				.get(query)
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("cannot access template with editors personToken", function(done) {
			if (!templateId) {
				return this.skip();
			}
			var query = basePath + "/" + templateId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend_token;
			request(this.server)
				.get(query)
				.end(function(err, res) {
					res.should.have.status(403);
					done();
				});
		});


		it("return item with id", function(done) {
			if (!documentId) {
				this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			request(this.server)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.include({id: documentId});
					res.body.should.have.any.keys("@context");
					done();
				});
		});

		it("return list of documents", function(done) {
			if (!documentId) {
				return this.skip();
			}
			var pageSize = 10;
			var query = basePath +
				"?pageSize="+ pageSize+"&access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			request(this.server)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					helpers.isPagedResult(res.body, pageSize, true);
					res.body.results.filter((document) => {
						document.should.have.any.keys("id");
						return document["id"] === documentId;
					}).should.have.lengthOf(1);
					res.body.results.filter((document) => {
						document.should.have.any.keys("id");
						return document["id"] === templateId;
					}).should.have.lengthOf(0);
					done();
				});
		});

		it("return list of templates", function(done) {
			if (!templateId) {
				return this.skip();
			}
			var pageSize = 10;
			var query = basePath +
				"?templates=true&pageSize="+ pageSize+"&access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			request(this.server)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.results.filter((document) => {
						document.should.have.any.keys("id");
						return document["id"] === documentId;
					}).should.have.lengthOf(0);
					res.body.results.filter((document) => {
						document.should.have.any.keys("id");
						return document["id"] === templateId;
					}).should.have.lengthOf(1);
					done();
				});
		});

		it("return item with id as editor", function(done) {
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend_token;
			request(this.server)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.include({id: documentId});
					res.body.should.have.any.keys("@context");
					done();
				});
		});

		it("cannot delete someone else document", function(done) {
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" +
				config.user.friend_token;

			request(this.server)
				.delete(query)
				.end(function(err, res) {
					res.should.have.status(403);
					done();
				});
		});

		it("can delete own document", function(done) {
			if (!documentId) {
				return this.skip();
			}
			var query = basePath + "/" + documentId +
				"?access_token=" + config["access_token"] + "&personToken=" +
				config.user.token;

			request(this.server)
				.delete(query)
				.end(function(err, res) {
					res.should.have.status(200);
					done();
				});
		});

		it("cannot delete someone else template", function(done) {
			if (!templateId) {
				return this.skip();
			}
			var query = basePath + "/" + templateId +
				"?access_token=" + config["access_token"] + "&personToken=" +
				config.user.friend_token;

			request(this.server)
				.delete(query)
				.end(function(err, res) {
					res.should.have.status(403);
					done();
				});
		});

		it("can delete own template", function(done) {
			if (!templateId) {
				return this.skip();
			}
			var query = basePath + "/" + templateId +
				"?access_token=" + config["access_token"] + "&personToken=" +
				config.user.token;

			request(this.server)
				.delete(query)
				.end(function(err, res) {
					res.should.have.status(200);
					done();
				});
		});
	});

	it("doesn't return other user's single document for form with option MHL.documentsViewableForAll if doesn't have access to form", function(done) {
		var query = basePath + "/" + config.id.document_others_feature_documents_viewable_for_all +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token; // Doesn"t have access.
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("returns other user's single document for form with option MHL.documentsViewableForAll", function(done) {
		var query = basePath + "/" + config.id.document_others_feature_documents_viewable_for_all +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend2_token; // Has access.
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(200);
				done();
			});
	});

	it("does not allow editing other users document even with form with option MHL.documentsViewableForAll", function(done) {
		var query = basePath + "/" + config.id.document_others_feature_documents_viewable_for_all +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = {
			"id": "JX.159198",
			"creator": "MA.131",
			"gatheringEvent": {
				"namedPlaceNotes": "Laajalahden luonnonsuojelun ystävät ry",
				"legPublic": false,
				"id": "JX.159198#5",
				"@type": "MZ.gatheringEvent",
				"dateBegin": "2018-12-04",
				"leg": [
					"MA.131"
				]
			},
			"formID": "MHL.33",
			"gatherings": [
			],
			"namedPlaceID": "MNP.28638",
			"editors": [
				"MA.131"
			],
			"secureLevel": "MX.secureLevelNone",
			"keywords": [],
			"sourceID": "KE.389",
			"collectionID": "HR.2049",
			"editor": "MA.131",
			"publicityRestrictions": "MZ.publicityRestrictionsPublic",
			"dateEdited": "2018-12-17T10:15:14+02:00",
			"dateCreated": "2018-12-04T14:31:37+02:00",
			"@type": "MY.document",
			"@context": "http://schema.laji.fi/context/document.jsonld"
		}
		request(this.server)
			.put(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("does not allow deleting other users document even with form with MHL.documentsViewableForAll", function(done) {
		var query = basePath + "/" + config.id.document_others_feature_documents_viewable_for_all +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		request(this.server)
			.delete(query)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("doesn't return other users' documents for form with MHL.documentsViewableForAll option if no permission to form", function(done) {
		var query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token + // Doesn"t have form permission.
			"&collectionID=HR.2049" + "&formID=MHL.33";

		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(200);
				const constainsOnlySelf = res.body.results.every(document => document.editors.includes(config.user.model.id));
				assert.equal(constainsOnlySelf, true);
				done();
			});
	});


	it("doesn't return other users' documents for form with MHL.documentsViewableForAll option if no permission to form when searching from ES index", function(done) {
		var query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token + // Doesn"t have form permission.
			"&collectionID=HR.2049" + "&formID=MHL.33";

		request(this.server)
			.get(query)
			.end(function(err, res) {
				const constainsOnlySelf = res.body.results.every(document => document.editors.includes(config.user.model.id));
				assert.equal(constainsOnlySelf, true);
				done();
			});
	});

	it("returns other users' documents for form with MHL.documentsViewableForAll option", function(done) {
		var query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend2_token + // Has form permission.
			"&collectionID=HR.2049" + "&formID=MHL.33";
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(200);
				const constainsNotSelf = res.body.results.some(document => !(document.editors || []).includes(config.user.friend2_id));
				assert.equal(constainsNotSelf, true);
				done();
			});
	});

	it("returns count with MHL.documentsViewableForAll option", function(done) {
		var query = basePath + "/count/byYear" +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend2_token + // Has form permission.
			"&collectionID=HR.2049" + "&formID=MHL.33";
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(200);
				res.body.should.have.length.above(2);
				done();
			});
	});

	it("doesn't allow access to other collections when using form with MHL.documentsViewableForAll option", function(done) {
		var query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.friend2_token + // Has form permission.
			"&collectionID=HR.1747" + "&formID=MHL.33";
		request(this.server)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(200);
				res.body.results.should.have.lengthOf(0);
				done();
			});
	});

	// Not implemented in old API, probably not used?
	// it("return observations without date when observationYear is null", function(done) {
	// 	var query = basePath +
	// 		"?access_token=" + config["access_token"] + "&personToken=" + config.user.token +
	// 		"&observationYear=null";
	// 	request(this.server)
	// 		.get(query)
	// 		.end(function(err, res) {
	// 			res.should.have.status(200);
	// 			res.body.results.should.length.above(0);
	// 			const hasNoDateBegins = res.body.results
	// 				.every(doc => !(doc.gatheringEvent || {}).dateBegin && (doc.gatherings || [])
	// 					.every(g => !g.dateBegin && (g.units || [])
	// 						.every(u => !u.unitGathering || !u.unitGathering.dateBegin)));
	// 			assert.equal(hasNoDateBegins, true);
	// 			done();
	// 		});
	// });

	describe("disabled form", function() {
		const document = {
			formID: config.id.disabled_form,
			editors: [config.user.model.id, config.user.friend_id],
			dateCreated: "2015-01-01T00:00:00+03:00",
			creator: "MA.0",
			editor: "MA.1",
			gatheringEvent: {
				dateBegin: "2017-10-12",
				leg: ["Viltsu"]
			},
			gatherings: [
				{
					geometry: {
						"type": "Point",
						"coordinates": [20.3, 60.4]
					},
					notes: "foo bar",
					units: [
						{
							identifications: [
								{
									taxon: "Parmaj"
								}
							]
						}
					]
				}
			]
		};

		it("doesn't allow sending documents", function(done) {
			this.timeout(10000);
			var query = basePath +
				"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			request(this.server)
				.post(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(422);
					done();
				});
		});

		it("doesn't allow updating documents", function(done) {
			this.timeout(10000);
			// Make sure that altering formID doesn't make it bypass the disabled form check.
			delete document.formID;
			var query = basePath + "/" + config.id.disabled_form_doc
				+ "?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			request(this.server)
				.put(query)
				.send(document)
				.end(function (err, res) {
					res.should.have.status(422);
					done();
				});
		});

		it("doesn't allow deleting documents", function(done) {
			var query = basePath + "/" + config.id.disabled_form_doc
				+ "?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
			request(this.server)
				.delete(query)
				.end(function (err, res) {
					res.should.have.status(422);
					done();
				});
		});
	});
});
