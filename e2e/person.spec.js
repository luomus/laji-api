const config = require("./config.json");
const helpers = require("./helpers");
const { apiRequest, url } = helpers;
const { accessToken, personToken, person, friend } = config;

const missingFullName = "MA.97";

describe("/person", function() {

	it("returns 401 when fetching with email and no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(`/person/exists-by-email/${person.emailAddress}`);
		res.should.have.status(401);
	});

	it("returns 204 when fetching with email and access token specified", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(`/person/exists-by-email/${person.emailAddress}`);
		res.should.have.status(204);
	});

	it("returns 404 when fetching with non-existing email and access token specified", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/person/exists-by-email/test");
		res.should.have.status(404);
	});

	it("returns 401 when fetching with id and no access token specified", async function() {
		const res = await apiRequest(this.server)
			.get(`/person/by-id/${person.id}`);
		res.should.have.status(401);
	});

	it("returns user object without sensitive data when accessing with id", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(`/person/by-id/${person.id}`);
		res.should.have.status(200);
		res.body.should.not.have.property("emailAddress");
		res.body.should.not.have.property("lintuvaaraLoginName");
		res.body.should.not.have.property("address");
		res.body.should.have.property("id");
	});

	it("returns full user object when accessing with token", async function() {
		const res = await apiRequest(this.server, { accessToken, personToken })
			.get("/person");
		res.should.have.status(200);
		res.body.should.eql({
			"@context": "http://schema.laji.fi/context/person.jsonld",
			"id": person.id,
			"fullName": "Viltsu Testaaja",
			"emailAddress": person.emailAddress,
			"organisation": ["MOS.1016"],
			"role": []
		});
	});

	it("returns fullname for user that only has inherited and preferred names", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(`/person/by-id/${missingFullName}`);
		res.should.have.status(200);
		res.body.should.be.a("object");
		res.body.should.have.property("fullName");
		res.body.fullName.should.not.be.empty;
	});

	it("excludes inheritedName, preferredName, lajiAuthLoginName", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get(`/person/by-id/${missingFullName}`);
		res.should.have.status(200);
		res.body.should.be.a("object");
		res.body.should.not.have.property("inheritedName");
		res.body.should.not.have.property("preferredName");
		res.body.should.not.have.property("lajiAuthLoginName");
	});

	it("returns 404 when asking with non existing id", async function() {
		const res = await apiRequest(this.server, { accessToken })
			.get("/person/by-id/MA.FOOBAR");
		res.should.have.status(404);
	});

	describe("/friends delete", function() {
		it("removes friends from both users", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken })
				.delete(`/person/${personToken}/friends/${friend.id}`);
			res.should.have.status(200);
			const res2 = await apiRequest(this.server, { accessToken })
				.delete(`/person/${friend.personToken}/friends/${person.id}`);
			res2.should.have.status(200);
		});
	});

	describe("/profile PUT", function() {

		it("cannot update userID", async function() {
			var profile = {
				userID: "MA.9009"
			};
			const res = await apiRequest(this.server, { accessToken })
				.put(`/person/${personToken}/profile`)
				.send(profile);
			res.should.have.status(422);
			res.body.should.have.property("errorCode").eql("PROFILE_UPDATING_KEY_NOT_ALLOWED");
		});

		it("updates profile", async function() {
			var profile = {
				settings: {
					search: "none"
				}
			};
			const res = await apiRequest(this.server, { accessToken })
				.put(`/person/${personToken}/profile`)
				.send(profile);
			res.should.have.status(200);
			res.body.should.have.property("id");
			res.body.should.have.property("userID").eql(person.id);
			res.body.should.have.property("friends").eql([]);
			res.body.should.have.property("blocked");
			res.body.should.have.property("friendRequests");
			res.body.should.have.property("settings").eql(profile.settings);
		});

		it("will not update profile id", async function() {
			var profile = {
				id: "JX.0"
			};
			const res = await apiRequest(this.server, { accessToken })
				.put(`/person/${personToken}/profile`)
				.send(profile);
			res.should.have.status(422);
			res.body.should.have.property("message").eql("PROFILE_UPDATING_KEY_NOT_ALLOWED");
		});

		it("will not allow updating friends", async function() {
			var profile = {
				friends: ["MA.97"]
			};
			const res = await apiRequest(this.server, { accessToken })
				.put(`/person/${personToken}/profile`)
				.send(profile);
			res.should.have.status(422);
			res.body.should.have.property("message").eql("PROFILE_UPDATING_KEY_NOT_ALLOWED");
		});

		it("will not allow updating friends requests", async function() {
			var profile = {
				friendRequests: ["MA.007"]
			};
			const res = await apiRequest(this.server, { accessToken })
				.put(`/person/${personToken}/profile`)
				.send(profile);
			res.should.have.status(422);
			res.body.should.have.property("message").eql("PROFILE_UPDATING_KEY_NOT_ALLOWED");
		});
	});

	describe("/profile other", function() {

		it("deletes friend",async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken })
				.delete(`/person/friends/${friend.id}`);
			res.should.have.status(200);
		});

		it("returns 404 when no correct user token given", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken: "foo" })
				.get("/person/profile");
			res.should.have.status(400);
		});

		it("returns users public profile", async function() {
			const res = await apiRequest(this.server, { accessToken })
				.get(`/person/by-id/${person.id}/profile`);
			res.should.have.status(200);
			res.body.should.have.property("userID");
			res.body.should.not.have.property("id");
			res.body.should.not.have.property("friends");
			res.body.should.not.have.property("blocked");
			res.body.should.not.have.property("friendRequests");
			res.body.should.not.have.property("settings");
		});

		it("returns users full profile", async function() {
			const res = await apiRequest(this.server, { accessToken, personToken })
				.get("/person/profile");
			res.should.have.status(200);
			res.body.should.have.property("id");
			res.body.should.have.property("userID");
			res.body.should.have.property("friends").eql([]);
			res.body.should.have.property("blocked");
			res.body.should.have.property("friendRequests");
			res.body.should.have.property("settings");
		});
	});

	describe("friend tests", function() {

		it("It can make a friend request", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.post(`/person/friends/${person.id}`);
			res.should.have.status(201);
			res.body.should.have.property("id");
			res.body.should.have.property("userID");
			res.body.should.have.property("friends");
			res.body.should.have.property("blocked");
			res.body.should.have.property("friendRequests");
			res.body.should.have.property("settings");
		});

		it("returns 422 when asking as a friend again", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.post(`/person/friends/${person.id}`);
			res.should.have.status(422);
		});

		it("can block friend request", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken })
				.delete(url(`/person/friends/${friend.id}`, { block: true }));
			res.should.have.status(200);
			res.body.should.have.property("friends");
			res.body.friends.should.not.contain(friend.id);
		});

		it("does not allow blocked user to make a friend request", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.post(`/person/friends/${person.id}`);
			res.should.have.status(422);
			const res2 = await apiRequest(this.server, { accessToken, personToken })
				.get(`/person/profile`);
			res2.should.have.status(200);
			res2.body.should.have.property("friends");
			res2.body.should.have.property("friendRequests");
			res2.body.should.have.property("blocked");
			res2.body.blocked.should.contain(friend.id);
			res2.body.friends.should.not.contain(friend.id);
			res2.body.friendRequests.should.not.contain(friend.id);
		});

		it("allows to remove block from a friends", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			var profile = {
				blocked: []
			};
			const res = await apiRequest(this.server, { accessToken, personToken })
				.put("/person/profile")
				.send(profile);
			res.should.have.status(200);
			res.body.should.have.property("blocked");
			res.body.blocked.should.not.contain(friend.id);
		});

		it("allows unblocked person to make friend request", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.post(`/person/friends/${person.id}`);
			res.should.have.status(201);
		});

		it("allows to accept friend request", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken })
				.put(`/person/friends/${friend.id}`);
			res.should.have.status(200);
		});

		it("shows accepted friends on are accepted on both user", async function() {
			if (!friend.personToken) {
				this.skip();
			}
			const res = await apiRequest(this.server, { accessToken, personToken })
				.get("/person/profile");
			res.should.have.status(200);
			res.body.should.have.property("friends");
			res.body.friends.should.contain(friend.id);
			const res2 = await apiRequest(this.server, { accessToken, personToken: friend.personToken })
				.get("/person/profile");
			res2.should.have.status(200);
			res2.body.should.have.property("friends");
			res2.body.friends.should.contain(person.id);
		});
	});
});
