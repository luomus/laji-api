var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken } = config;

const itemProperties = [
	"@context",
	"id",
	"organizationLevel1",
	"organizationLevel2",
	"organizationLevel3",
	"organizationLevel4",
	"abbreviation",
	"fullName"
];

describe("/organizations", function() {
	it("returns 401 when no access token specified for id", async function() {
		const res = await apiRequest(this.server)
			.get("/organizations/MOS.61");
		res.should.have.status(401);
	});

	it("returns organization", async function() {
		this.timeout(10000);
		const res = await apiRequest(this.server, { accessToken })
			.get("/organizations/MOS.61");
		res.should.have.status(200);
		helpers.toHaveOnlyKeys(res.body, itemProperties);
	});
});

