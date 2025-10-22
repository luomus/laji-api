const config = require("./config.json");
const helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token, personToken } = config;

const friendName = "Unit Tester 1 (Test)";
const friendGroup = "Test";

describe("/autocomplete", function() {
	const basePath = "/autocomplete";

	it("returns 401 when no access token specified", async function() {
		const res = await request(this.server)
			.get(`${basePath}/taxa`).set("API-Version", "1");
		res.should.have.status(401);
	});

	it("returns taxa with default size", async function() {
		this.timeout(10000);
		const defaultSize = 10;
		const searchWord = "käki";
		const res = await request(this.server)
			.get(url(`${basePath}/taxa`, { access_token, query: searchWord })).set("API-Version", "1");
		res.should.have.status(200);
		res.body.results.filter((item) => {
			item.should.include.keys("key", "value");
			return item["value"] === searchWord;
		}).should.have.lengthOf(1);
		res.body.results.should.have.lengthOf(defaultSize);
	});

	it("returns taxons with sp suffix for taxon ranks higher than genum if observationMode is true", async function() {
		this.timeout(10000);
		const res = await request(this.server)
			.get(url(`${basePath}/taxa`, {
				access_token,
				query: "parus",
				observationMode: true })
			).set("API-Version", "1");
		res.should.have.status(200);
		res.body.results.filter((res) => {
			return res["value"] === "Parus sp.";
		}).should.have.lengthOf(1);
	});

	// eslint-disable-next-line max-len
	it("doesn't return taxons with sp suffix for taxon ranks higher than genum if observationMode is false", async function() {
		this.timeout(10000);
		const res = await request(this.server)
			.get(url(`${basePath}/taxa`, { access_token, query: "parus" })).set("API-Version", "1");
		res.should.have.status(200);
		res.body.results.filter((item) => {
			return item["value"] === "Parus sp.";
		}).should.have.lengthOf(0);
	});

	it("returns friends", async function() {
		this.timeout(10000);
		const res = await request(this.server).get(url(`${basePath}/friends`, { personToken, access_token }));
		res.should.have.status(200);
		res.body.results.filter((res) => {
			res.should.include.keys("key", "value");
			res["value"].should.not.contain("undefined");
			return res["value"] === friendName;
		}).should.have.lengthOf(1);
	});

	it("returns friends when querying", async function() {
		this.timeout(10000);
		const res = await request(this.server).get(url(`${basePath}/friends`, {
			access_token,
			personToken,
			query: friendName.substring(0, 3)
		}));
		res.should.have.status(200);
		res.body.results.filter((res) => {
			res.should.include.keys("key", "value", "name", "group");
			res.value.should.not.contain("undefined");
			res.value === friendName && res.group === friendGroup;
			return res["value"] === friendName;
		}).should.have.lengthOf(1);
	});
});
