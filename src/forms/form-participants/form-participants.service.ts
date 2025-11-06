import { HttpException, Injectable } from "@nestjs/common";
import { FormsService } from "../forms.service";
import { FormPermissionsService } from "src/form-permissions/form-permissions.service";
import { Person } from "src/persons/person.dto";
import { DocumentsService } from "src/documents/documents.service";
import { PersonsService } from "src/persons/persons.service";
import { CollectionsService } from "src/collections/collections.service";
import { Participant } from "./form-participants.dto";

@Injectable()
export class FormParticipantsService {

	constructor(
		private formsService: FormsService,
		private formPermissionsService: FormPermissionsService,
		private documentsService: DocumentsService,
		private personsService: PersonsService,
		private collectionsService: CollectionsService
	) {}

	async getParticipants(id: string, person: Person) {
		const form = await this.formsService.get(id);
		const { collectionID } = form;

		if (!collectionID) {
			throw new HttpException("The form doesn't have a collectionID", 422);
		}

		const mainForm = await this.formsService.findFor(collectionID, (f => f.options.hasAdmins));

		if (!mainForm) {
			throw new HttpException("The form or its parents doesn't have admins", 422);
		}

		const { collectionID: mainCollectionID } = mainForm;

		if (!mainCollectionID) {
			throw new HttpException("The form doesn't have a collectionID", 422);
		}

		if (! (await this.formPermissionsService.isAdminOf(collectionID, person))) {
			throw new HttpException("You are not an admin of the form", 403);
		}

		const { admins, editors } =
			(await this.formPermissionsService.findByCollectionIDAndPerson(mainCollectionID, person))!;
		const personIdsWithPermission = [...admins, ...editors].reduce((dict, key, idx) => {
			dict[key] = idx;
			return dict;
		}, {} as Record<string, number>);

		const collectionIDs = await this.collectionsService.findDescendants(mainCollectionID);

		let personsWithDocumentsBuckets: EsDocBucket[] = [];
		for (const subCollectionID of [mainCollectionID, ...collectionIDs.map(({ id }) => id)]) {
			const esDocs =
				await this.documentsService.store.post<EsDocResult>("_search", getESQueryFrom(subCollectionID));
			personsWithDocumentsBuckets = [...personsWithDocumentsBuckets, ...esDocs.aggregations.creator.buckets];
		}

		const personsWithDocuments = personsWithDocumentsBuckets.map(({ key, lastDoc, doc_count }) => ({
			personId: key.toUpperCase(),
			lastDoc: lastDoc.value_as_string,
			docCount: doc_count
		}));

		const personToParticipant: Record<string, Participant> = {};
		const addParticipant = (participant?: Participant) => {
			if (!participant) {
				return;
			}
			const hash = getParticipantHash(participant);
			if (!hash) {
				return;
			}
			const existingParticipant = personToParticipant[hash];
			if (existingParticipant) {
				existingParticipant.docCount = (existingParticipant.docCount || 0) + (participant.docCount || 0);
				if (
					participant.lastDoc && existingParticipant.lastDoc
					&& new Date(participant.lastDoc) >= new Date(existingParticipant.lastDoc)
				) {
					existingParticipant.lastDoc = participant.lastDoc;
				}
			}
			personToParticipant[hash] = existingParticipant || participant;
		};

		for (const { personId, lastDoc, docCount } of personsWithDocuments) {
			if (personId.toUpperCase().startsWith("MA.")) {
				delete personIdsWithPermission[personId.toUpperCase()];
				addParticipant(await this.getParticipant(personId.toUpperCase(), lastDoc, docCount));
			} else if (personId.toLowerCase().startsWith("lintuvaara:")) {
				addParticipant({
					lintuvaaraLoginName: [personId.toLowerCase()],
					lastDoc,
					docCount
				});
			}
		}
		for (const personId of Object.keys(personIdsWithPermission)) {
			addParticipant(await this.getParticipant(personId));
		}
		return Object.values(personToParticipant);
	}

	private async getParticipant(personId: string, lastDoc?: string, docCount?: number)
		: Promise<Participant | undefined> {
		try {
			const { fullName, emailAddress, address, lintuvaaraLoginName } =
				await this.personsService.get(personId);
			return { id: personId, fullName, emailAddress, address, lintuvaaraLoginName, lastDoc, docCount };
		} catch (e) {
			// Swallow errors for non existing users.
		}
	}
}

type EsDocBucket = { key: string, lastDoc: { value_as_string: string }, doc_count: number };
type EsDocResult = { aggregations: { creator: { buckets: EsDocBucket[] } } };

function getESQueryFrom(collectionID: string) {
	return {
		aggs: {
			creator: {
				terms: {
					field: "creator",
					size: 100000,
				},
				aggs: {
					lastDoc: { max: { field: "dateCreated" } }
				}
			}
		},
		query: {
			bool: {
				filter: {
					term: {
						collectionID: {
							value: collectionID
						}
					}
				}
			}
		}
	};
}

const getParticipantHash = (participant: Participant) => {
	return participant.id || participant.lintuvaaraLoginName?.join(":");
};
