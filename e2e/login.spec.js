const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessTokenMobileVihko } = config;

describe("/login", function() {

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server).get("/login");
		res.should.have.status(401);
	});

	let tmpToken;

	it("GET /login returns tmp token", async function() {
		const res = await apiRequest(this.server, { accessToken: accessTokenMobileVihko })
			.get(url("/login"));

		res.should.have.status(200);
		res.body.should.have.property("tmpToken").that.is.a("string");
		res.body.should.have.property("loginURL").that.is.a("string");
		tmpToken = res.body.tmpToken;
	});

	it("POST /check", async function() {
		const res = await apiRequest(this.server, { accessToken: accessTokenMobileVihko })
			.post(url("/login/check", { tmpToken }));

		res.should.have.status(404);
		res.body.should.have.property("errorCode").that.is.a("string");
	});
});
