var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

describe("/api-user", function() {
	var basePath = "/api-users";

	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns user info", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token }));
		res.should.have.status(200);
		res.body.should.have.property("email");
		res.body.should.not.have.property("password");
		res.body.should.not.have.property("id");
	});

	it("returns error when no email is given", async function() {
		const res = await request(this.server)
			.post(url(basePath, { access_token }))
			.send({});
		res.should.have.status(400);
	});

});
