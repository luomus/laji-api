var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;

describe("/information", function() {
	var basePath =  "/information";
	const id =  "ex-12";

	it("returns 401 when no access token specified for id", async function() {
		const res = await apiRequest(this.server)
			.get(`${basePath}/${id}`);
		res.should.have.status(401);
	});

	it("returns by id parsed", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/${id}`);
		res.should.have.status(200);
		res.body.id.should.be.a("string");
		res.body.content.should.be.a("string");
		res.body.title.should.be.a("string");
		res.body.author.should.be.a("string");
		res.body.posted.should.be.a("string");
		res.body.modified.should.be.a("string");
		res.body.tags.should.be.a("array");
		res.body.children.should.be.a("array");
	});
});
