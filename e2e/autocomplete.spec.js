const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken, personToken } = config;

const friendName = "Unit Tester 1 (Test)";
const friendGroup = "Test";

describe("/autocomplete", function() {
	const basePath = "/autocomplete";

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(`${basePath}/taxa`);
		res.should.have.status(401);
	});

	it("returns taxa with default size", async function() {
		this.timeout(10000);
		const defaultSize = 10;
		const searchWord = "käki";
		const res = await apiRequest(this.server, { accessToken })
			.get(url(`${basePath}/taxa`, { query: searchWord }));
		res.should.have.status(200);
		res.body.results.filter((item) => {
			item.should.include.keys("key", "value");
			return item["value"] === searchWord;
		}).should.have.lengthOf(1);
		res.body.results.should.have.lengthOf(defaultSize);
	});

	it("returns friends", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server,  { accessToken, personToken })
			.get(url(`${basePath}/friends`));
		res.should.have.status(200);
		res.body.results.filter((res) => {
			res.should.include.keys("key", "value");
			res["value"].should.not.contain("undefined");
			return res["value"] === friendName;
		}).should.have.lengthOf(1);
	});

	it("returns friends when querying", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get(url(`${basePath}/friends`, { query: friendName.substring(0, 3) }));
		res.should.have.status(200);
		res.body.results.filter((res) => {
			res.should.include.keys("key", "value", "name", "group");
			res.value.should.not.contain("undefined");
			res.value === friendName && res.group === friendGroup;
			return res["value"] === friendName;
		}).should.have.lengthOf(1);
	});
});
