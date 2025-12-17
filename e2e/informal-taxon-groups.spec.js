const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken } = config;

describe("/informal-taxon-groups", function() {
	const basePath =  "/informal-taxon-groups";

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns 401 when no access token specified for id", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server)
			.get(url(`${basePath}/MVL.33`));
		res.should.have.status(401);
	});

	it("returns informal taxon groups", async function() {
		this.timeout(5000);
		var pageSize = 100;
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath, { pageSize }));
		res.should.have.status(200);
		res.body.results.should.have.lengthOf(pageSize);
		res.body.results.filter(group => {
			return group["id"] === "MVL.187";
		}).should.have.lengthOf(1);
	});

	it("returns by ids", async function() {
		var ids = [
			"MVL.33","MVL.232"
		];
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath, { idIn: ids.join(","), pageSize: ids.length }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body, ids.length);
		res.body.results.filter((group) => {
			return ids.indexOf(group.id) > -1;
		}).should.have.lengthOf(ids.length);
		res.body.should.include({ total: ids.length });
	});

	it("returns by id", async function() {
		this.timeout(5000);
		var testId = "MVL.33";
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/${testId}`);
		res.should.have.status(200);
		res.body.should.have.property("id");
		res.body.should.include({ id: testId });
	});

	it("returns parent by id", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/MVL.1241/parent`);
		res.should.have.status(200);
		res.body.should.have.property("id");
		res.body.should.include({ id: "MVL.1" });
	});
});
