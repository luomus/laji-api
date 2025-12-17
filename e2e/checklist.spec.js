const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken } = config;

const itemProperties = [
	"@context",
	"id",
	"owner",
	"isPublic",
	"rootTaxon",
	"dc:bibliographicCitation",
	"name"
];

describe("/checklists", function() {
	const basePath = "/checklists";
	const checklistId = "MR.384";

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns 401 when no access token specified for id", async function() {
		const res = await apiRequest(this.server)
			.get(`${basePath}/${checklistId}`);
		res.should.have.status(401);
	});

	it("return only public checklists and has the asked id within", async function() {
		this.timeout(5000);
		const pageSize = 1000;
		const res = await apiRequest(this.server, { accessToken })
			.get(url(basePath, { pageSize }));
		res.should.have.status(200);
		helpers.isPagedResult(res.body, pageSize);
		res.body[helpers.params.results].filter((checklist) => {
			helpers.toHaveOnlyKeys(checklist, itemProperties);
			checklist.should.have.any.keys("id");
			checklist.should.have.any.keys("isPublic");
			checklist.should.include({ isPublic: true });

			return checklist.id === checklistId;
		}).should.have.lengthOf(1);
	});

	it("return item with id", async function() {
		this.timeout(5000);
		const res = await apiRequest(this.server, { accessToken })
			.get(`${basePath}/${checklistId}`);
		res.should.have.status(200);
		helpers.toHaveOnlyKeys(res.body, itemProperties);
		res.body.should.include({ id: checklistId });
		res.body.should.have.any.keys("@context");
	});
});
