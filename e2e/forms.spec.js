var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken, personToken } = config;

describe("/forms", function() {
	var basePath = "/forms";
	const disabledForm = "MHL.90";

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns list of forms when access token is correct", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(basePath);
		res.should.have.status(200);
	});

	it("allows multi lang param", async function() {
		const res = await apiRequest(this.server, { accessToken, lang: "multi" })
			.get(`${basePath}/JX.519`);
		res.should.have.status(200);
	});

	let testFormJSON;

	it("prevents non ict admin from updating form", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(`${basePath}/${disabledForm}`);
		if (res.status !== 200) {
			return this.skip();
		}
		testFormJSON = res.body;
		const res2 = await apiRequest(this.server, { accessToken, personToken })
			.put(`${basePath}/${disabledForm}`)
			.send(res.body);
		res2.should.have.status(403);
	});

	it("prevents non ict admin from using transform endpoint", async function() {
		if (!testFormJSON) {
			return this.skip();
		}
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(`${basePath}/transform`)
			.send(testFormJSON);
		res.should.have.status(403);
	});
});
