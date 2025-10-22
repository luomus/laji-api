var config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken, personToken } = config;

describe("/warehouse", function() {
	it("GET proxy works", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/warehouse/query/document?documentId=JX.334884");
		res.should.have.status(200);
	});

	it("POST proxy works", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			// eslint-disable-next-line max-len
			.post(url("/warehouse/polygon", { wkt: "POLYGON((27.327641 63.046118,27.202279 63.040706,27.297792 63.024463,27.327641 63.046118))", crs: "WGS84" }))
		res.should.have.status(200);
	});
});
