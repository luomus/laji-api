import { Annotation, Tag, Document, MMANRequiredRolesEnum } from "@luomus/laji-schema/models";
import { Inject, Injectable } from "@nestjs/common";
import { DocumentsService } from "src/documents/documents.service";
import { FormPermissionsService } from "src/form-permissions/form-permissions.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { Person, Role } from "src/persons/person.dto";
import { StoreService } from "src/store/store.service";
import { TriplestoreService } from "src/triplestore/triplestore.service";
import { CACHE_10_MIN, LocalizedException } from "src/utils";
import { WarehouseService } from "src/warehouse/warehouse.service";
import * as translations from "src/translations.json";

@Injectable()
export class AnnotationsService {

	constructor(
		@Inject("STORE_RESOURCE_SERVICE") public store: StoreService<Annotation>,
		@Inject("TRIPLESTORE_READONLY_SERVICE") private triplestoreService: TriplestoreService,
		private documentsService: DocumentsService,
		private formPermissionsService: FormPermissionsService,
		private notificationsService: NotificationsService,
		private warehouseService: WarehouseService
	) {}

	async getPage(
		rootID: string,
		person: Person,
		page?: number,
		pageSize?: number
	) {
		// Check that person has access to the document.
		await this.documentsService.get(rootID, person);
		return this.store.getPage({ rootID }, page, pageSize);
	}

	async create(annotation: Annotation, person: Person) {
		const { rootID } = annotation;
		if (annotation.id) {
			throw new LocalizedException("ANNOTATION_CREATE_SHOULDNT_HAVE_ID" , 406);
		}

		annotation.created = new Date().toISOString();

		annotation.annotationByPerson = person.isImporter() ? undefined : person.id;
		annotation.annotationBySystem = undefined;

		const tags = await this.getTags();
		const mapTagIdToTag = (id: string) => {
			const found = tags.find(t => t.id === id);
			if (!found) {
				throw new LocalizedException("ANNOTATION_BAD_TAG_ID", 422, { id });
			}
			return found;
		};

		const addedTags = (annotation.addedTags || []).map(mapTagIdToTag);
		const removedTags = (annotation.removedTags || []).map(mapTagIdToTag);

		checkArrayUniqueness(addedTags, "ANNOTATION_ADDED_TAGS_MUST_BE_UNIQUE");
		checkArrayUniqueness(removedTags, "ANNOTATION_REMOVED_TAGS_MUST_BE_UNIQUE");

		if (!addedTags.length && !removedTags.length || person.isImporter()) {
			return this.store.create(annotation);
		}

		await this.validateTagRoles(addedTags, "requiredRolesAdd", rootID, person);
		await this.validateTagRoles(removedTags, "requiredRolesRemove", rootID, person);

		return this.store.create(annotation);
	}

	/**
	 * Only one of the roles per tag needs to pass. For example, if we are adding a tag with requiredRolesAdd
	 * ["MMAN.expert", "MMAN.admin"], the person being either an expert or an admin should pass.
	 */
	private async validateTagRoles(
		tags: Tag[],
		validateRolesFromProperty: "requiredRolesAdd" | "requiredRolesRemove",
		rootID: string,
		person: Person
	) {
		for (const tag of tags) {
			// rolesValidation is undefined for empty, true for one of the roles passing, error for none of the tags passing.
			const rolesValidation = await (tag[validateRolesFromProperty] || [])
				.reduce<Promise<Error | undefined | true>>(
					async (evenOnePasses, role) => {
						if (await evenOnePasses === true) {
							return true;
						}
						try {
							await this.validateRole(rootID, role, person);
						} catch (e) {
							return e;
						}
						return true;
					}, Promise.resolve(undefined));
			if (rolesValidation !== undefined && rolesValidation !== true) {
				throw rolesValidation;
			}
		}
	};

	private async validateRole(rootID: string, role: MMANRequiredRolesEnum, person: Person) {
		let document: Document;
		switch (role) {
		case "MMAN.basic":
			return true;
		case "MMAN.expert":
			if (person.roleAnnotation !== "MMAN.expert") {
				throw new LocalizedException("ANNOTATION_NO_RIGHT_FOR_ROLE", 403, { role: "MMAN.expert" });
			}
			return true;
		case "MMAN.ictAdmin":
			if (!person.role.includes(Role.Admin)) {
				throw new LocalizedException("ANNOTATION_NO_RIGHT_FOR_ROLE", 403, { role: "MA.admin" });
			}
			return true;
		case "MMAN.owner":
			document = await this.documentsService.get(rootID, person);
			if (document.creator !== person.id && !document.editors?.includes(person.id)) {
				throw new LocalizedException("ANNOTATION_NO_RIGHT_FOR_ROLE", 403, { role: "MMAN.owner" });
			}
			return true;
		case "MMAN.formAdmin":
			document = await this.documentsService.get(rootID, person);
			const isAdmin = document.collectionID
					&& await this.formPermissionsService.isAdminOf(document.collectionID, person);
			if (!isAdmin) {
				throw new LocalizedException("ANNOTATION_NO_RIGHT_FOR_ROLE", 403, { role: "MMAN.formAdmin" });
			}
			return true;
		default:
		 throw new LocalizedException("ANNOTATION_UNKNOWN_ROLE", 500, { role });
		}
	}

	async delete(id: string, person: Person) {
		const annotation = await this.store.get(id);
		if (annotation.annotationByPerson !== person.id) {
			throw new LocalizedException("ANNOTATION_NOT_YOURS", 403);
		}
		if (annotation.deleted) {
			return annotation;
		}
		annotation.deleted = true;
		annotation.deletedByPerson = person.id;
		annotation.deletedDateTime = new Date().toISOString();
		const updated = await this.store.update(annotation);
		const document = await this.warehouseService.get(annotation.rootID);
		for (const editor of (document.editorUserIds || []).filter(id => id.startsWith("MA."))) {
			void this.notificationsService.getByAnnotationIDAndPersonID(annotation.id, editor);
		}
		return updated;
	}

	getTags() {
		return this.triplestoreService.find<Tag>({ type: "MMAN.tagClass" }, { cache: CACHE_10_MIN });
	}
}

const checkArrayUniqueness = (array: any[], msg: keyof typeof translations) => {
	if(array.length !== new Set(array).size) {
		throw new LocalizedException(msg, 422);
	}
};
