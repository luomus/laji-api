var config = require("./config.json");
var helpers = require("./helpers");
const expect = require("chai").expect;
const { apiRequest } = helpers;
const { accessToken, personToken } = config;

const adminToken = config.friend2.personToken;
const nonAdminToken = personToken;

describe("/forms/:id/participants", function() {
	it("returns 422 but doesn't crash with form without admin feature and collectionID", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: nonAdminToken })
			.get("/forms/JX.519/participants");
		res.should.have.status(422);
	});

	it("returns 422 if form doesn't have admin feature", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: nonAdminToken })
			.get("/forms/JX.652/participants");
		res.should.have.status(422);
	});

	it("returns 403 if user isn't admin of form", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken: nonAdminToken })
			.get("/forms/MHL.3/participants");
		res.should.have.status(403);
	});

	it("returns list containing users with form permission", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server, { accessToken, personToken: adminToken })
			.get("/forms/MHL.3/participants");
		const propTests = [
			{ prop: "id", type: "string", found: false, typeOk: false },
			{ prop: "emailAddress", type: "string", found: false, typeOk: false },
			{ prop: "address", type: "string", found: false, typeOk: false },
			{ prop: "lintuvaaraLoginName", type: "array", found: false, typeOk: false },
			{ prop: "lastDoc", type: "string", found: false, typeOk: false },
			{ prop: "docCount", type: "number", found: false, typeOk: false }
		];
		for (const item of res.body) {
			let allFound = true;
			propTests.forEach(propTest => {
				if (item[propTest.prop]) {
					propTest.found = true;
					if (
						propTest.type === "array"
						&& Array.isArray(item[propTest.prop])
						|| typeof item[propTest.prop] === propTest.type
					) {
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
			expect(propTest.found).to.equal(true, `${propTest.prop} not found`);
			expect(propTest.typeOk).to.equal(true,
				`${propTest.prop} should be of type ${propTest.type} but was ${propTest.typeOk}`
			);
		});
	});
});
