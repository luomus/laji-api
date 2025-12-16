const fs = require("fs");
const config = require("../config.json");
const helpers = require("../helpers");
const { apiRequest } = helpers;
const { accessToken, personToken } = config;

const errorOnlyOwn = "Can only update media uploaded by the user";
const errorOnlyOwnDelete = "Can only delete media uploaded by the user";

const commonProperties = [
	"@context",
	"id",
	"intellectualRights",
	"intellectualOwner",
	"uploadedBy",
	"thumbnailURL",
	"taxonVerbatim",
	"LuomusIntellectualRights",
	"captureDateTime",
	"capturerVerbatim",
	"fullURL",
	"keyword",
	"mp3URL"
];
const wavItemProperties = [
	...commonProperties,
	"wavURL"
];


const audioOthers = "MM.97725";

describe("/audio", function() {
	var basePath =  "/audio";
	var audioTmpId;
	var audioId;
	var flacAudioId;

	it("returns 401 when no access token specified for id", async function() {
		const res = await apiRequest(this.server)
			.get(`${basePath}/${audioOthers}`);
		res.should.have.status(401);
	});

	it("returns 400 when no person token specified for post request", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.post(`${basePath}/${audioOthers}`)
			.send({ intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0" });
		res.should.have.status(400);
	});

	it("returns 400 when no person token specified for put request", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.put(`${basePath}/${audioOthers}`)
			.send({});
		res.should.have.status(400);
	});

	it("returns 400 when no person token specified for delete request", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.delete(`${basePath}/${audioOthers}`);
		res.should.have.status(400);
	});

	it("returns 400 when trying to update others audio", async function() {
		this.timeout(6000);
		const res = await apiRequest(this.server, { accessToken, personToken })
			.put(`${basePath}/${audioOthers}`)
			.send({});
		res.should.have.status(400);
		res.body.should.include({ message: errorOnlyOwn });
	});

	it("returns 400 when trying to delete others audio", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.delete(`${basePath}/${audioOthers}`);
		res.should.have.status(400);
		res.body.should.include({ message: errorOnlyOwnDelete });
	});

	it("returns a temp id when adding audio", async function() {
		this.timeout(6000);
		const res = await apiRequest(this.server, { accessToken, personToken })
			.post(basePath)
			.attach("audio", fs.readFileSync(__dirname + "/bird.wav"), "bird.wav");
		res.should.have.status(200);
		res.body.should.be.a("array");
		res.body.should.have.lengthOf(1);
		res.body[0].should.have.keys("name", "filename", "id", "expires");
		audioTmpId = res.body[0].id;
	});

	describe("after receiving temporal id", function() {

		it("Cannot update meta object with empty object", async function() {
			if (!audioTmpId) {
				this.skip();
			}
			this.timeout(10000);
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(`${basePath}/${audioTmpId}`)
				.send({});
			res.should.have.status(422);
		});
	});

	describe("after receiving id", function() {
		it("updates audio meta data", async function() {
			if (!audioId) {
				this.skip();
			}
			this.timeout(5000);
			var meta = {
				intellectualRights: "MZ.intellectualRightsCC-BY-4.0",
				intellectualOwner: "Viltsu",
				uploadedBy: "MA.97"
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.put(`${basePath}/${audioId}`)
				.send(meta);
			res.should.have.status(200);
			res.body.should.be.a("object");
			helpers.toHaveOnlyKeys(res.body, wavItemProperties);
			res.body.should.have.property("intellectualRights").eql(meta.intellectualRights);
			res.body.should.have.property("intellectualOwner").eql(meta.intellectualOwner);
			res.body.should.have.property("uploadedBy").eql("MA.314");
		});

		it("doesn't accept garbage", async function() {
			if (!audioId) {
				this.skip();
			}
			this.timeout(5000);
			var meta = {
				intellectualRights: "FooBar"
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.put(`${basePath}/${audioId}`)
				.send(meta);
			res.should.have.status(400);
		});

		it("returns wav", async function() {
			if (!audioId) {
				this.skip();
			}
			this.timeout(6000);
			const res = await apiRequest(this.server, { accessToken })
				.get(`${basePath}/${audioId}/wav`);
			res.should.have.status(200);
			res.should.have.header("content-type", "audio/x-wav");
		});


		it("returns mp3", async function() {
			if (!audioId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken })
				.get(`${basePath}/${audioId}/mp3`);
			res.should.have.status(200);
			res.should.have.header("content-type", "audio/mpeg");
		});

		it("returns thumbnail jpg", async function() {
			if (!audioId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken })
				.get(`${basePath}/${audioId}/thumbnail.jpg`);
			res.should.have.status(200);
			res.should.have.header("content-type", "image/jpeg");
		});

		it("deletes audio", async function() {
			if (!audioId) {
				this.skip();
			}
			this.timeout(5000);
			const res = await apiRequest(this.server, { accessToken, personToken })
				.delete(`${basePath}/${audioId}`);
			res.should.have.status(204);
		});
	});

	describe("flac audio", function() {
		it("returns a temp id when adding flac audio", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.post(basePath)
				.attach("audio", fs.readFileSync(__dirname + "/bat.flac"), "bat.flac");
			res.should.have.status(200);
			res.body.should.be.a("array");
			res.body.should.have.lengthOf(1);
			res.body[0].should.have.keys("name", "filename", "id", "expires");
		});

		it("returns flac", async function() {
			if (!flacAudioId) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken })
				.get(`${basePath}/${flacAudioId}/flac`);
			res.should.have.status(200);
			res.should.have.header("content-type", "audio/flac");
		});
	});
});
