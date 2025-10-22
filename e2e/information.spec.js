var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

describe("/information", function() {
	var basePath =  "/information";
	const id =  "5660";

	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns 401 when no access token specified for id", async function() {
		const res = await request(this.server)
			.get(`${basePath}/${id}`);
		res.should.have.status(401);
	});

	it("returns by id parsed", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/${id}`, { access_token }));
		res.should.have.status(200);
		res.body.id.should.be.a("string");
		res.body.content.should.be.a("string");
		res.body.title.should.be.a("string");
		res.body.author.should.be.a("string");
		res.body.posted.should.be.a("string");
		res.body.featuredImage.url.should.be.a("string");
		res.body.featuredImage.caption.should.be.a("string");
		res.body.modified.should.be.a("string");
		res.body.tags.should.be.a("array");
		res.body.children.should.be.a("array");
		res.body.parents.should.be.a("array");
	});

	it("returns all parsed", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token }));
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

	it("all respects lang param", async function() {
		const res = await request(this.server)
			.get(url(basePath, { access_token, lang: "fi" }));
		res.should.have.status(200);
		res.body.title.should.equal("FI");
	});

	it("returns index", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/index`, { access_token }));
		res.should.have.status(200);
		res.body.should.have.property("page");
		res.body.should.have.property("children");
		res.body.should.have.property("roots");
	});

	it("index respects lang param", async function() {
		const res = await request(this.server)
			.get(url(`${basePath}/index`, { access_token, lang: "fi" }));
		res.should.have.status(200);
		res.body.page.title.should.equal("FI");
	});
});
