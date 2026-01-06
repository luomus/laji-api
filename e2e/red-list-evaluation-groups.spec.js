const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken } = config;

describe("/red-list-evaluation-groups", function() {

	const basePath = "/red-list-evaluation-groups";

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server).get("/publications/MP.2304");
		res.should.have.status(401);
	});

	it("GET /red-list-evalution-groups", async function() {
		this.timeout(5000);
		var pageSize = 100;
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath, { pageSize }));
		res.should.have.status(200);
		res.body.results.should.have.lengthOf(pageSize);
		res.body.results.filter(group => {
			return group.id === "MVL.1041";
		}).should.have.lengthOf(1);
	});

	it("GET /red-list-evalution-groups with multiple ids", async function() {
		var ids = [
			"MVL.1041","MVL.1044"
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

	it("GET /:id returns red list evaluation group", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/MVL.1041`);

		res.should.have.status(200);
		res.body.should.have.property("id").that.is.a("string");
		res.body.should.have.property("name").that.is.a("string");
		res.body.should.have.property("hasIucnSubGroup");
		res.body.should.have.property("@context").that.is.a("string");
	});

	it("GET /:id returns only red list evaluation groups", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/MA.308`);

		res.should.have.status(404);
	});

	it("GET /:id/parent returns parent", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/MVL.945/parent`);
		res.should.have.status(200);
		res.body.should.have.property("id");
		res.body.should.include({ id: "MVL.1044" });
	});

	it("GET /:id/children returns children", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/MVL.1041/children`);
		res.should.have.status(200);
		res.body.results.length.should.be.above(1);
		res.body.results.filter(group => group.id === "MVL.852")
			.should.have.lengthOf(1);
	});

	it("GET /:id/siblings returns siblings", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/MVL.852/siblings`);
		res.should.have.status(200);
		res.body.results.length.should.be.above(1);
		res.body.results.filter(group => group.id === "MVL.739")
			.should.have.lengthOf(1);
	});

	it("GET /roots returns roots", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/roots`);
		res.should.have.status(200);
		res.body.results.length.should.be.equal(15);
		res.body.results.forEach(group => {
			group.should.have.property("name").that.is.a("string");
		});
	});

	it("GET /tree returns tree", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/tree`);
		res.should.have.status(200);
		res.body.results.length.should.be.equal(15);
		res.body.results[0].should.have.property("hasIucnSubGroup");
		res.body.results[0].hasIucnSubGroup[0].should.have.property("name").that.is.a("string");
	});
});
