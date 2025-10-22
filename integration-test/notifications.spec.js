const config = require("./config.json");
const helpers = require("./helpers");
const { request } = require("chai");
const { access_token, personToken, person } = config;

describe("/notifications", function() {
	const basePath =  "/notifications";

	const friendsNotification = {
		"toPerson": "MA.897",
		"friendRequestAccepted": "MA.314",
		"seen": false,
		"created": "2023-04-13T13:43:15.764Z",
		"id": "MHN.10544",
		"@type": "MHN.notification",
		"@context": "https://store-dev.luomus.fi/json-ld-context/MHN.notification.json"
	};

	it("returns 401 when fetching with person token and no access token specified", async function() {
		const res = await request(this.server)
			.get(`${basePath}/${personToken}`);
		res.should.have.status(401);
	});
	it("returns 401 when fetching with token and no access token specified", async function() {
		const res = await request(this.server)
			.get(`${basePath}/${personToken}`);
		res.should.have.status(401);
	});

	var lengthBeforeNew;

	it("returns notifications", async function() {
		this.timeout(5000);
		const res = await request(this.server)
			.get(url(`${basePath}/${personToken}`, { access_token }));
		res.should.have.status(200);
		res.body.results.length.should.be.above(1);
		res.body.results.every(item => {
			item.should.have.property("id");
			item.should.have.property("created");
		});
		lengthBeforeNew = res.body.total;
	});

	var addedNotification;

	it("updating notification doesn't allow other than seen property", async function() {

		// Create a notification first by adding friend request. This would be nice to do in after/before, but mocha/chai
		// doesn't keep the order of test execution correct then. The last test removes the friend request, so the
		// original state of the friends is restored.
		await request(this.server)
			.post(url(`/persons/${personToken}/friends/${person.id}`, { access_token }));

		// Notification is created in background when friend request is made, so we wait for that.
		await new Promise(resolve => setTimeout(resolve, 500));
		while (!addedNotification) {
			const notificationsRes = await request(this.server)
				.get(url(`${basePath}/${personToken}`, { access_token, page: lengthBeforeNew, pageSize: 1 }));
			addedNotification = notificationsRes.body.results && notificationsRes.body.results[0];
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		const updateRes = await request(this.server)
			.put(url(`${basePath}/${addedNotification.id}`, { access_token, personToken }))
			.send({ ...addedNotification, friendRequest: ["foo"] });
		updateRes.should.have.status(422);
	});

	it("updating notification allows updating seen property", async function() {
		if (!addedNotification) {
			throw new Error("added notification not found");
		}
		const res = await request(this.server)
			.put(url(`${basePath}/${addedNotification.id}`, { access_token, personToken }))
			.send({ ...addedNotification, seen: true });
		res.body.seen.should.be.equal(true);
	});

	it("allows deleting", async function() {
		if (!addedNotification) {
			throw new Error("added notification not found");
		}
		const res = await request(this.server)
			.delete(url(`${basePath}/${addedNotification.id}`, { access_token, personToken }));
		res.should.have.status(200);
	});

	it("doesn't allow updating other's notification", async function() {
		if (!addedNotification) {
			throw new Error("added notification not found");
		}
		const res = await request(this.server)
			.put(url(`${basePath}/${friendsNotification.id}`, { access_token, personToken }))
			.send(friendsNotification);
		res.should.have.status(403);
	});

	it("doesn't allow deleting other's notification", async function() {
		if (!addedNotification) {
			throw new Error("added notification not found");
		}
		const res = await request(this.server)
			.delete(url(`${basePath}/${friendsNotification.id}`, { access_token, personToken }));
		res.should.have.status(403);
	});

	it("clear friends after", async function() {
		await request(this.server)
			.delete(url(`/persons/${personToken}/friends/${person.id}`, { access_token, personToken }));
	});
});
