var config = require("../config.json");
var helpers = require("../helpers");
const moment = require("moment");
const expect = require("chai").expect;
const { request } = require("chai");

const adminToken = config["user"]["friend2_token"];
const nonAdminToken = config["user"]["token"];

describe("/form/:id/participants", function() {
	let app;

	before(async () => {
		app = await helpers.init();
	});

	after(async () => {
		await helpers.close();
	});

	const formID = "MHL.3";
	const collectionID = "HR.39";
	const pathForForm = (formID) => `${config["urls"]["form"]}/${formID}/participants`;
	const basePath = pathForForm(formID);

	it("returns 403 but doesn't crash with form without admin feature and collectionID", function(done) {
		const query = pathForForm("JX.519")
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + nonAdminToken;
		request(app)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("returns 403 if form doesn't have admin feature", function(done) {
		const query = pathForForm("JX.652")
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + nonAdminToken;
		request(app)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("returns 403 if user isn't admin of form", function(done) {
		const query = basePath
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + nonAdminToken;
		request(app)
			.get(query)
			.end(function(err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("returns list containing users with form permission", function(done) {
		const query = basePath
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + adminToken
			+ "&formID=" + formID;
		request(app)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				const propTests = [
					{prop: "id", type: "string", found: false, typeOk: false},
					{prop: "emailAddress", type: "string", found: false, typeOk: false},
					{prop: "address", type: "string", found: false, typeOk: false},
					{prop: "lintuvaaraLoginName", type: "array", found: false, typeOk: false},
					{prop: "lastDoc", type: "string", found: false, typeOk: false},
					{prop: "docCount", type: "number", found: false, typeOk: false}
				];
				for (const item of res.body) {
					let allFound = true;
					propTests.forEach(propTest => {
						if (item[propTest.prop]) {
							propTest.found = true;
							if (propTest.type === "array" && Array.isArray(item[propTest.prop]) || typeof item[propTest.prop] === propTest.type) {
								propTest.typeOk = true;
							} else {
								propTest.typeOk = typeof item[propTest.prop];
							}
						}
						if (!propTest.found) {
							allFound = false;
						}
					});
					if (allFound) {
						break;
					}
				}

				res.should.have.status(200);
				res.body.length.should.be.above(100);
				propTests.forEach(propTest => {
					expect(propTest.found).to.equal(true, `${propTest.prop} not found`)
					expect(propTest.typeOk).to.equal(true, `${propTest.prop} should be of type ${propTest.type} but was ${propTest.typeOk}`)
				});
				done();
			});
	});
});
