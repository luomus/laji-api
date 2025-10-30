var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest } = helpers;
const { accessToken } = config;
const { expect } = require("chai");

describe("/coordinates", function() {
	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.post("/coordinates/location");
		res.should.have.status(401);
	});

	it("is translated", async function() {
		const res = await apiRequest(this.server, { accessToken, lang: "fi" })
			.post("/coordinates/location")
			.send({
				"type":"GeometryCollection",
				"geometries":[{ "type":"Point","coordinates":[27.041465,62.795626] }]
			});
		res.should.have.status(200);
		expect(typeof res.body.results[0].address_components[0].short_name).to.equal("string");
	});

	it("is translated again", async function() {
		const res = await apiRequest(this.server, { accessToken, lang: "multi" })
			.post("/coordinates/location")
			.send({
				"type":"GeometryCollection",
				"geometries":[{ "type":"Point","coordinates":[27.041465,62.795626] }]
			});
		res.should.have.status(200);
		expect(typeof res.body.results[0].address_components[0].short_name).to.equal("object");
	});

	it("is translated again", async function() {
		const res = await apiRequest(this.server, { accessToken, lang: "en" })
			.post("/coordinates/location")
			.send({
				"type":"GeometryCollection",
				"geometries":[{ "type":"Point","coordinates":[27.041465,62.795626] }]
			});
		res.should.have.status(200);
		expect(typeof res.body.results[0].address_components[0].short_name).to.equal("string");
	});

	it("is translated again again", async function() {
		const res = await apiRequest(this.server, { accessToken, lang: "fi" })
			.post("/coordinates/location")
			.send({
				"type":"GeometryCollection",
				"geometries":[{ "type":"Point","coordinates":[28.041465,62.795626] }]
			});
		res.should.have.status(200);
		expect(typeof res.body.results[0].address_components[0].short_name).to.equal("string");
	});
});
