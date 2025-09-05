const config = require("./config.json");
const helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

describe("/checklist-versions", function() {
	const basePath =  "/checklist-versions";

	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns 401 when no access token specified for id", async function() {
		const res = await request(this.server).get(`${basePath}/MR.424`);
		res.should.have.status(401);
	});

	it("returns page", async function() {
		this.timeout(5000);
		const pageSize = 1000;
		const res = await request(this.server).get(url(basePath, { pageSize, access_token }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body, pageSize);
		res.body[helpers.params.results].filter((checklistVersion) => {
			return checklistVersion["id"] === "MR.424";
		}).should.have.lengthOf(1);
	});

	it("return item with id", async function() {
		this.timeout(5000);
		const res = await request(this.server).get(url(`${basePath}/MR.424`, { access_token }));
		res.should.have.status(200);
		res.body.should.include({ id: "MR.424" });
		res.body.should.have.any.keys("@context");
	});
});
