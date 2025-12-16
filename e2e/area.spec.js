var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken } = config;

describe("/area", function() {
	const basePath = "/areas";

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns 401 when no access token specified for id", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server)
			.get(`${basePath}/ML.206`);
		res.should.have.status(401);
	});

	it("returns countries", async function() {
		this.timeout(5000);
		var pageSize = 248;
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath, { areaType: "ML.country", pageSize }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body, pageSize, true);
		res.body[helpers.params.results].should.have.lengthOf(pageSize);
		res.body[helpers.params.results].filter((country) => {
			return country["id"] ===  "ML.206"; // a country
		}).should.have.lengthOf(1);
		res.body[helpers.params.results].filter((area) => {
			return area["areaType"] === "ML.country";
		}).should.have.lengthOf(pageSize);
	});

	it("returns municipalities", async function() {
		this.timeout(5000);
		var pageSize = 2;
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath, { areaType: "ML.municipality", idIn: "ML.352", pageSize }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body, pageSize);
		res.body[helpers.params.results].filter((municipality) => {
			return municipality["id"] === "ML.352"; // a municipality
		}).should.have.lengthOf(1);
		res.body.should.include({ total: 1 });
	});

	it("returns by ids", async function() {
		const idIn = ["ML.352", "ML.206", "ML.253",  "ML.691"];
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath, { idIn, pageSize: idIn.length }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body, idIn.length);
		res.body[helpers.params.results].filter((area) => {
			return idIn.indexOf(area["id"]) > -1;
		}).should.have.lengthOf(idIn.length);
		res.body.should.include({ total: idIn.length });
	});

	it("returns by id", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/ML.691`);
		res.should.have.status(200);
		res.body.should.have.property("id");
		res.body.should.include({ id: "ML.691" });
	});
});
