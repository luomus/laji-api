var config = require("./config.json");
var helpers = require("./helpers");
const { url } = helpers;
const { request } = require("chai");
const { access_token } = config;

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

describe("/checklists", function() {
	it("returns 401 when no access token specified for id", async function() {
		const res = await request(this.server)
			.get("/organizations/MOS.61");
		res.should.have.status(401);
	});

	it("returns organization", async function() {
		this.timeout(10000);
		const res = await request(this.server)
			.get(url("/organizations/MOS.61", { access_token }));
		res.should.have.status(200);
		helpers.toHaveOnlyKeys(res.body, itemProperties);
	});
});

