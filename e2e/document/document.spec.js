var config = require("../config.json");
var helpers = require("../helpers");
const assert = require("assert");
const { request } = require("chai");
const { url } = helpers;
const { access_token, personToken, friend, friend2 } = config;

describe("/documents", function() {
	const basePath = "/documents";
	const validatePath = basePath + "/validate";
	let documentId, templateId, lockedId, dateCreated;
	const validDocument = {
		formID: "MHL.119",
		editors: [config.person.id, friend.id],
		dateCreated: "2015-01-01T00:00:00+03:00",
		creator: config.person.id,
		editor: config.person.id,
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

	const documentOthersId = "JX.25678";
	const strictFormDocId = "JX.285528";
	const nonStrictFormDocId = "JX.285560";
	const documentOthersFeatureDocumentsViewableForAllId = "JX.159198";
	const disabledFormId = "MHL.90";
	const disabledFormDocId = "JX.334884";
	const formWithSecondaryCopyFeatureId = "MHL.618";

	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns 401 when no access token specified for id", async function() {
		const res = await request(this.server)
			.get(`${basePath}/${documentOthersId}`);
		res.should.have.status(401);
	});

	it("returns 400 when no person token specified when using ES index", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token }));
		res.should.have.status(400);
	});

	it("returns 400 when no person token specified", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token }));
		res.should.have.status(400);
	});

	it("returns 404 when accessing others documents", async function() {
		this.timeout(10000);
		const res = await request(this.server)
			.get(url(`${basePath}/${documentOthersId}`, { access_token, personToken }));
		res.should.have.status(404);
	});

	it("does not allow adding without formID", async function () {
		const document = {
			editors: [config.person.id],
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
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken, validationErrorFormat: "object" }))
			.send(document);
		res.should.have.status(422);
		res.body.should.be.a("object");
		res.body.should.have.property("details");
		res.body.details.should.be.a("object");
		res.body.details.should.have.property("formID");
		res.body.details.formID.should.be.a("array");
	});

	it("check that api returns detailed error message", async function () {
		this.timeout(10000);
		const document = {
			formID: "MHL.119",
			editors: [config.person.id],
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
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken, validationErrorFormat: "object" }))
			.send(document);
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
		res.body.details.gatherings["0"].units["0"].recordBasis.should.be.a("array");
	});

	it("adding template works", async function () {
		const document = {
			formID: "MHL.119",
			editors: [config.person.id, friend.id],
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
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(201);
		res.body.should.have.any.keys("id");
		res.body.id.should.be.a("string");
		res.body.id.should.match(/^JX\.[0-9]+$/);
		templateId = res.body.id;
	});

	it("adding locked document works", async function () {
		const document = {
			formID: "MHL.119",
			editors: [config.person.id, friend.id],
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
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(201);
		res.body.should.have.any.keys("id");
		res.body.id.should.be.a("string");
		res.body.id.should.match(/^JX\.[0-9]+$/);
		lockedId = res.body.id;
	});

	it("check that adding generates default fields", async function () {
		const document = JSON.parse(JSON.stringify(validDocument));
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document);
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
		res.body.should.not.include({ dateCreated: document.dateCreated });
		res.body.gatherings.should.have.lengthOf(1);
		delete(document.gatherings[0].geometry);
		delete(document.gatherings[0].units);
		res.body.gatherings[0].should.include(document.gatherings[0]);
		res.body.gatherings[0].should.have.any.keys("id");
		res.body.should.include({ editor: config.person.id, creator: config.person.id });
		res.body.id.should.be.a("string");
		res.body.id.should.match(/^JX\.[0-9]+$/);
		documentId = res.body.id;
		dateCreated = res.body.dateCreated;
	});


	it("allows adding secondary copy of a document with id", async function () {
		const document = {
			...validDocument,
			id: "T.123",
			formID: formWithSecondaryCopyFeatureId
		};
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(201);
	});

	it("allows deleting secondary copy", async function () {
		const document = {
			delete: true,
			id: "T.123",
			formID: formWithSecondaryCopyFeatureId
		};
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(201);
		res.body.should.have.property("collectionID");
	});

	it("deleting secondary is valid by valid endpoint", async function () {
		const document = {
			delete: true,
			id: "T.123",
			formID: formWithSecondaryCopyFeatureId
		};
		const res = await request(this.server)
			.post(url(validatePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(200);
	});

	it("deleting primary is not valid by valid endpoint", async function () {
		const document = {
			delete: true,
			id: "T.123",
			formID: validDocument.formID
		};
		const res = await request(this.server)
			.post(url(validatePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(422);
	});

	it("gives validation error when validating secondary copy without id", async function () {
		const document = {
			...validDocument,
			formID: formWithSecondaryCopyFeatureId
		};
		const res = await request(this.server)
			.post(url(validatePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(422);
	});

	it("is valid when validating secondary copy with id", async function () {
		const document = {
			...validDocument,
			formID: formWithSecondaryCopyFeatureId,
			id: "FOOBAR"
		};
		const res = await request(this.server)
			.post(url(validatePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(200);
	});

	it("is valid when validating with id", async function () {
		const document = {
			...validDocument,
			id: "FOOBAR"
		};
		const res = await request(this.server)
			.post(url(validatePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(200);
	});

	it("is valid when validating without id", async function () {
		const document = { ...validDocument };
		const res = await request(this.server)
			.post(url(validatePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(200);
	});

	it("create does not allow fields not in form JSON for strict form", async function() {
		const doc = JSON.parse(JSON.stringify(documentWithPropertyNotInFormJSONStrictForm));
		delete doc.id;
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(doc);
		res.should.have.status(422);
	});

	it("edit does not allow fields not in form JSON for strict form", async function() {
		const res = await request(this.server)
			.put(url(`${basePath}/${strictFormDocId}`, { access_token, personToken }))
			.send(documentWithPropertyNotInFormJSONStrictForm);
		res.should.have.status(422);
	});

	it("edit allows fields not in form JSON for non-strict form", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/${nonStrictFormDocId}`, { access_token, personToken }));
		res.should.have.status(200);
		res.body.gatheringEvent.acknowledgeNoUnitsInCensus = true;
		const res2 = await request(this.server)
			.put(url(`${basePath}/${nonStrictFormDocId}`, { access_token, personToken }))
			.send(res.body);
		res2.should.have.status(200);
	});

	it("validator endpoint does not allow fields not in form JSON", async function() {
		const res = await request(this.server)
			.post(url(validatePath, { access_token, personToken }))
			.send(documentWithPropertyNotInFormJSONStrictForm);
		res.should.have.status(422);
	});

	it("does not allow adding secondary copy of a document without id", async function() {
		const document = {
			...validDocument,
			formID: formWithSecondaryCopyFeatureId
		};
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document);
		res.should.have.status(422);
	});

	it("document with MZ.publicityRestrictionsPrivate bypasses validators", async function() {
		const res = await request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(privateDocumentInvalidAgainstValidatorsButSchematicallyOK);
		res.should.have.status(201);
		void request(this.server).delete(url(basePath, { access_token, personToken })).send(); // Silent cleanup
	});

	describe("After adding document", function() {
		it("updates data", async function() {
			this.timeout(4000);
			if (!documentId) {
				return this.skip();
			}
			var document = {
				id: documentId,
				editors: [config.person.id, friend.id],
				formID: "MHL.119",
				creator: config.person.id,
				editor: "MA.1",
				dateCreated: "2015-01-01T00:00:00+03:00",
				gatheringEvent:{
					dateBegin: "2016-10-12",
					leg: ["foo", "joku"]
				},
				gatherings: [
					{
						"@type": "MY.gathering",
						id: documentId + "#6",
						notes: "new notes",
						geometry: {
							"coordinates": [21.3, 60.4],
							"type": "Point"
						},
						units: [
							{
								"@type": "MY.unit",
								id: documentId + "#7",
								identifications: [
									{
										"@type": "MY.identification",
										id: documentId + "#8",
										taxon: "Käki"
									}
								],
								typeSpecimens: [
									{
										"@type": "MY.identification",
										id: documentId + "#9",
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

			const res = await request(this.server)
				.put(url(`${basePath}/${documentId}`, { access_token, personToken }))
				.send(document);
			res.should.have.status(200);
			res.body.should.have.property("id").eql(documentId);
			res.body.should.have.property("editor").eql(config.person.id);
			res.body.should.have.property("creator").eql(config.person.id);
			res.body.should.have.property("dateCreated").eql(dateCreated);
			res.body.should.have.property("collectionID").eql("HR.1747");
			res.body.should.have.property("editors").eql([config.person.id, friend.id]);
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
		});

		it("editor can update", async function() {
			this.timeout(4000);
			if (!documentId) {
				return this.skip();
			}
			var document = {
				id: documentId,
				editors: [config.person.id, friend.id],
				formID: "MHL.119",
				creator: config.person.id,
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
			const res = await request(this.server)
				.put(url(`${basePath}/${documentId}`, { access_token, personToken: friend.personToken }))
				.send(document);
			res.should.have.status(200);
			res.body.should.have.property("id").eql(documentId);
			res.body.should.have.property("editor").eql(friend.id);
			res.body.should.have.property("creator").eql(config.person.id);
			res.body.should.have.property("dateCreated").eql(dateCreated);
			res.body.should.have.property("collectionID").eql("HR.1747");
			res.body.should.have.property("editors").eql([config.person.id, friend.id]);
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
		});

		it("does not allow editing a locked document", async function() {
			this.timeout(4000);
			if (!lockedId) {
				return this.skip();
			}
			var document = {
				id: lockedId,
				formID: "MHL.119",
				creator: config.person.id,
				editors: [config.person.id, friend.id],
				dateCreated: "2015-01-01T00:00:00+03:00",
				editor: "MA.1",
				gatherings: [
					{
						notes: "Template"
					}
				],
				locked: true
			};
			const res = await request(this.server)
				.put(url(`${basePath}/${lockedId}`, { access_token, personToken }))
				.send(document);
			res.body.should.be.a("object");
			res.body.should.have.property("details");
			res.body.details.should.be.a("object");
			res.body.details.should.have.property("locked");
			res.body.details.locked.should.be.a("array");
		});

		it("does not allow deleting lockedId", async function() {
			if (!lockedId) {
				return this.skip();
			}
			const res = await request(this.server)
				.delete(url(`${basePath}/${lockedId}`, { access_token, personToken }));
			res.should.have.status(422);
		});

		it("cannot update document without formID", async function() {
			if (!documentId) {
				return this.skip();
			}
			var document = {
				id: "JX.1",
				editors: [config.person.id],
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
			const res = await request(this.server)
				.put(url(`${basePath}/${documentId}`, { access_token, personToken }))
				.send(document);
			res.body.should.be.a("object");
			res.body.should.have.property("details");
			res.body.details.should.be.a("object");
			res.body.details.should.have.property("formID");
		});

		it("cannot update template as editor", async function() {
			if (!templateId) {
				return this.skip();
			}
			var document = {
				id: templateId,
				editors: [config.person.id],
				creator: config.person.id,
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
			const res = await request(this.server)
				.put(url(`${basePath}/${templateId}`, { access_token, personToken: friend.personToken }))
				.send(document);
			res.should.have.status(403);
		});

		it("cannot update document id", async function() {
			if (!documentId) {
				return this.skip();
			}
			var document = {
				id: "JX.1",
				editors: [config.person.id],
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
			const res = await request(this.server)
				.put(url(`${basePath}/${documentId}`, { access_token, personToken }))
				.send(document);
			res.should.have.status(422);
		});

		it("returns 400 when no person token specified and asking with id", async function() {
			if (!documentId) {
				return this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${documentId}`, { access_token }));
			res.should.have.status(400);
		});

		it("cannot access template with editors personToken", async function() {
			if (!templateId) {
				return this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${templateId}`, { access_token, personToken: friend.personToken }));
			res.should.have.status(403);
		});


		it("return item with id", async function() {
			if (!documentId) {
				this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${documentId}`, { access_token, personToken }));
			res.should.have.status(200);
			res.body.should.include({ id: documentId });
			res.body.should.have.any.keys("@context");
		});

		it("return list of documents", async function() {
			if (!documentId) {
				return this.skip();
			}
			var pageSize = 10;
			const res = await request(this.server)
				.get(url(basePath, { access_token, personToken, pageSize }));
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
		});

		it("return list of templates", async function() {
			if (!templateId) {
				return this.skip();
			}
			var pageSize = 10;
			const res = await request(this.server)
				.get(url(basePath, { access_token, personToken, templates: true, pageSize }));
			res.should.have.status(200);
			res.body.results.filter((document) => {
				document.should.have.any.keys("id");
				return document["id"] === documentId;
			}).should.have.lengthOf(0);
			res.body.results.filter((document) => {
				document.should.have.any.keys("id");
				return document["id"] === templateId;
			}).should.have.lengthOf(1);
		});

		it("return item with id as editor", async function() {
			if (!documentId) {
				return this.skip();
			}
			const res = await request(this.server)
				.get(url(`${basePath}/${documentId}`, { access_token, personToken }));
			res.should.have.status(200);
			res.body.should.include({ id: documentId });
			res.body.should.have.any.keys("@context");
		});

		it("cannot delete someone elses document", async function() {
			if (!documentId) {
				return this.skip();
			}

			const res = await request(this.server)
				.delete(url(`${basePath}/${documentId}`, { access_token, personToken: friend.personToken }));
			res.should.have.status(403);
		});

		it("can delete own document", async function() {
			if (!documentId) {
				return this.skip();
			}

			const res = await request(this.server)
				.delete(url(`${basePath}/${documentId}`, { access_token, personToken }));
			res.should.have.status(200);
		});

		it("cannot delete someone elses template", async function() {
			if (!templateId) {
				return this.skip();
			}

			const res = await request(this.server)
				.delete(url(`${basePath}/${templateId}`, { access_token, personToken: friend.personToken }));
			res.should.have.status(403);
		});

		it("can delete own template", async function() {
			if (!templateId) {
				return this.skip();
			}

			const res = await request(this.server)
				.delete(url(`${basePath}/${templateId}`, { access_token, personToken }));
			res.should.have.status(200);
		});
	});

	it("doesn't return other user's single document for form with option MHL.documentsViewableForAll if doesn't have access to form", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/${documentOthersFeatureDocumentsViewableForAllId}`, { access_token, personToken }));
		res.should.have.status(403);
	});

	it("returns other user's single document for form with option MHL.documentsViewableForAll", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/${documentOthersFeatureDocumentsViewableForAllId}`, { access_token, personToken: friend2.personToken }));
		res.should.have.status(200);
	});

	it("does not allow editing other users document even with form with option MHL.documentsViewableForAll", async function() {
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
		};
		const res = await request(this.server)
			.put(url(`${basePath}/${documentOthersFeatureDocumentsViewableForAllId}`, { access_token, personToken }))
			.send(document);
		res.should.have.status(403);
	});

	it("does not allow deleting other users document even with form with MHL.documentsViewableForAll", async function() {
		const res = await request(this.server)
			.delete(url(`${basePath}/${documentOthersFeatureDocumentsViewableForAllId}`, { access_token, personToken }));
		res.should.have.status(403);
	});

	it("doesn't return other users' documents for form with MHL.documentsViewableForAll option if no permission to form", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token, personToken, collectionID: "HR.2049", formID: "MHL.33" }));
		res.should.have.status(200);
		const constainsOnlySelf = res.body.results.every(document => document.editors.includes(config.person.id));
		assert.equal(constainsOnlySelf, true);
	});

	it("returns other users' documents for form with MHL.documentsViewableForAll option", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token, personToken: friend2.personToken, collectionID: "HR.2049", formID: "MHL.33" }));
		res.should.have.status(200);
		res.body.results.should.have.length.above(2);
		const constainsNotSelf = res.body.results.some(document => !(document.editors || []).includes(friend2.id));
		assert.equal(constainsNotSelf, true);
	});

	it("doesn't allow access to other collections when using form with MHL.documentsViewableForAll option", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token, personToken: friend2.personToken, collectionID: "HR.1747", formID: "MHL.33" }));
		res.should.have.status(200);
		res.body.results.should.have.lengthOf(0);
	});

	describe("disabled form", function() {
		const document = {
			formID: disabledFormId,
			editors: [config.person.id, friend.id],
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

		it("doesn't allow sending documents", async function() {
			this.timeout(10000);
			const res = await request(this.server)
				.post(url(basePath, { access_token, personToken }));
			res.should.have.status(422);
		});

		it("doesn't allow updating documents", async function() {
			this.timeout(10000);
			// Make sure that altering formID doesn't make it bypass the disabled form check.
			delete document.formID;
			const res = await request(this.server)
				.put(url(`${basePath}/${disabledFormDocId}`, { access_token, personToken }))
				.send(document);
			res.should.have.status(422);
		});

		it("doesn't allow deleting documents", async function() {
			const res = await request(this.server)
				.delete(url(`${basePath}/${disabledFormDocId}`, { access_token, personToken }));
			res.should.have.status(422);
		});
	});
});
