var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken } = config;

describe("/api-user", function() {
	var basePath = "/api-users";

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns user info", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath, { accessToken }));
		res.should.have.status(200);
		res.body.should.have.property("email");
		res.body.should.not.have.property("password");
		res.body.should.not.have.property("id");
	});

	it("returns error when no email is given", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.post(basePath)
			.send({});
		res.should.have.status(400);
	});

});
