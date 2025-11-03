var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token, personToken } = config;

describe("/forms", function() {
	var basePath = "/forms";
	const disabledForm = "MHL.90";

	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns list of forms when access token is correct", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token }));
		res.should.have.status(200);
	});

	it("allows multi lang param", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/JX.519`, { access_token, lang: "multi" }));
		res.should.have.status(200);
	});

	let testFormJSON;

	it("prevents non ict admin from updating form", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/${disabledForm}`, { access_token, personToken }));
		if (res.status !== 200) {
			return this.skip();
		}
		testFormJSON = res.body;
		const res2 = await request(this.server)
			.put(url(`${basePath}/${disabledForm}`, { access_token, personToken }))
			.send(res.body);
		res2.should.have.status(403);
	});

	it("prevents non ict admin from using transform endpoint", async function() {
		if (!testFormJSON) {
			return this.skip();
		}
		const res = await request(this.server)
			.post(url(`${basePath}/transform`, { access_token, personToken }))
			.send(testFormJSON);
		res.should.have.status(403);
	});
});
