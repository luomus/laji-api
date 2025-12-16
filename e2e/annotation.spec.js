var config = require("./config.json");
var helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken, personToken } = config;

const annotation = {
	rootID: "JX.128736",
	targetID: "MY.1236#3",
	notes: "Just a test annotation",
	type: "MAN.typeOpinion",
	byRole: "MMAN.basic",
	addedTags: ["MMAN.26"]
};

describe("/annotation", function() {
	const basePath = "/annotations";
	let savedId;

	it("returns 401 when no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(basePath);
		res.should.have.status(401);
	});

	it("returns 401 when trying to add without permissions", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.post(basePath)
			.send({});
		res.should.have.status(400);
	});

	it("adds annotation", async function() {
		this.timeout(20000);
		const document = JSON.parse(JSON.stringify(annotation));
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(annotation);
		res.should.have.status(201);
		res.body.should.have.any.keys("id");
		res.body.should.have.any.keys("@type");
		res.body.should.have.any.keys("@context");
		res.body.should.have.any.keys("created");
		res.body.id.should.be.a("string");
		res.body.id.should.match(/^MAN\.[0-9]+$/);
		document["id"] = res.body.id;
		document["@type"] = res.body["@type"];
		document["@context"] = res.body["@context"];
		document["created"] = res.body["created"];
		document["annotationByPerson"] = config.person.id;
		res.body.should.eql(document);
		savedId = res.body.id;
	});

	it("return 403 when trying to add formAdmin tag with basic user", async function() {
		this.timeout(6000);
		const document = JSON.parse(JSON.stringify(annotation));
		document["addedTags"].push("MMAN.51");
		document["rootID"] = "JX.322170"; // line transect document
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(document);
		res.should.have.status(403);
	});


	it("return 403 when trying to add expert tag with basic user", async function() {
		this.timeout(6000);
		const document = JSON.parse(JSON.stringify(annotation));
		document["addedTags"] = ["MMAN.33"];
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(document);
		res.should.have.status(403);
	});

	it("return 403 when trying to remove expert tag with basic user", async function() {
		this.timeout(6000);
		const document = JSON.parse(JSON.stringify(annotation));
		document["removedTags"] = ["MMAN.33"];
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.send(document);
		res.should.have.status(403);
	});

	describe("After adding annotation", function() {
		it("returns annotations when asking list", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.get(url(basePath, { rootID: annotation.rootID }));
			res.should.have.status(200);
		});

		it("returns annotation by rootID", async function() {
			if (!savedId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken })
				.get(url(basePath, { rootID: annotation.rootID }));
			res.should.have.status(200);
		});

		it("requires persontoken", async function() {
			if (!savedId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken })
				.get(url(basePath, { rootID: annotation.rootID }));
			res.should.have.status(400);
		});

		it("requires rootID", async function() {
			if (!savedId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken })
				.get(basePath);
			res.should.have.status(400);
		});

		it("Does not allow delete without personToken", async function() {
			if (!savedId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken })
				.delete(`${basePath}/${savedId}`);
			res.should.have.status(400);
		});

		it("Does not allow delete with different user", async function() {
			if (!savedId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken: config.friend.personToken })
				.delete(`${basePath}/${savedId}`);
			res.should.have.status(403);
		});

		it("deletes annotation", async function() {
			if (!savedId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken })
				.delete(`${basePath}/${savedId}`);
			res.should.have.status(200);
			res.body.should.have.property("deleted").eql(true);
		});

		describe("After deleting annotation", function() {
			it("returns show that the annotation was deleted", async function() {
				if (!savedId) {
					this.skip();
				}
				const res = await apiRequest(this.server, { accessToken, personToken })
					.get(url(basePath, { rootID: annotation.rootID }));
				res.should.have.status(200);
				helpers.isPagedResult(res.body, 20, true);
				res.body[helpers.params.results].filter((a) => {
					return a["id"] === savedId && a["deleted"] !== true;
				}).should.have.lengthOf(0);
			});
		}); // After deleting annotation
	}); // After adding annotation
}); // /annotation
