import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Collection } from "src/collections/collection.dto";
import { CollectionsService } from "src/collections/collections.service";
import { CompleteMultiLang, Lang, MultiLang } from "src/common.dto";
import { LangService } from "src/lang/lang.service";
import { MailService } from "src/mail/mail.service";
import { Person, Role } from "src/persons/person.dto";
import { PersonsService } from "src/persons/persons.service";
import { StoreService } from "src/store/store.service";
import { FormListing, Format } from "../dto/form.dto";
import { FormsService } from "../forms.service";
import { FormPermissionDto, FormPermissionEntity, FormPermissionEntityType, FormPermissionPersonDto
} from "./dto/form-permission.dto";

@Injectable()
export class FormPermissionsService {

	constructor(
		private personsService: PersonsService,
		@Inject("STORE_RESOURCE_SERVICE") private store: StoreService<FormPermissionEntity>,
		private formService: FormsService,
		private collectionsService: CollectionsService,
		private mailService: MailService,
		private langService: LangService
	) {}

	async getByPerson(person: Person): Promise<FormPermissionPersonDto> {
		const entities = await this.store.getAll({ userID: person.id }, undefined, { primaryKeys: ["userID"] });
		const formPermissions: FormPermissionPersonDto = {
			personID: person.id,
			...entitiesToPermissionLists(entities, "collectionID")
		};
		const listProps: (keyof PermissionLists)[] = ["admins", "editors", "permissionRequests"];
		for (const listProp of listProps) {
			for (const collectionID of formPermissions[listProp]) {
				const childCollections = await this.collectionsService.findChildren(collectionID);
				childCollections.forEach(c => formPermissions[listProp].push(c.id));
			}
		}

		return formPermissions;
	}

	private async findByCollectionID(collectionID: string)
	: Promise<Pick<FormPermissionDto, "admins" | "editors" | "permissionRequests">> {
		return entitiesToPermissionLists(
			await this.store.getAll({ collectionID }, undefined, { primaryKeys: ["collectionID"] }),
			"userID");
	}

	async getByCollectionIDAndPerson(collectionID: string, person: Person): Promise<FormPermissionDto> {
		const permissions = await this.findByCollectionIDAndPerson(collectionID, person);
		if (!permissions) {
			throw new HttpException("Form does not have restrict feature enabled", 404);
		}
		return permissions;
	}

	async findByCollectionIDAndPerson(collectionID: string, person: Person)
		: Promise<FormPermissionDto | undefined> {
		const formWithPermissionFeature = await this.findFormWithPermissionFeature(collectionID);

		if (!formWithPermissionFeature?.collectionID) {
			return;
		}

		const permissions = await this.findByCollectionID(formWithPermissionFeature.collectionID);
		const isAdmin = isAdminOf(permissions, person);
		if (isAdmin) {
			const listProps: (keyof PermissionLists)[] = ["admins", "editors", "permissionRequests"];
			listProps.forEach(prop => {
				permissions[prop].sort(naturalSort);
			});
		} else {
			permissions.admins = [];
			permissions.editors = permissions.editors.filter(withIsPerson(person));
			permissions.permissionRequests = permissions.permissionRequests.filter(withIsPerson(person));
		}
		return { collectionID, ...permissions };
	}

	private async findFormWithPermissionFeature(collectionID: string) {
		return this.formService.findFor(
			collectionID,
			form => form.options.restrictAccess || form.options.hasAdmins
		);
	}

	async requestAccess(collectionID: string, person: Person) {
		const permissions = await this.getByCollectionIDAndPerson(collectionID, person);

		if (hasEditRightsOf(permissions, person)) {
			throw new HttpException("You already have access to this form", 406);
		}

		if (hasRequested(permissions, person)) {
			throw new HttpException("You already have requested access to this form", 406);
		}

		await this.store.create({
			collectionID,
			type: FormPermissionEntityType.request,
			userID: person.id
		});

		void this.sendFormPermissionRequested(person, collectionID);

		return this.getByCollectionIDAndPerson(collectionID, person);
	}

	async acceptAccess(collectionID: string, personID: string, type: "admin" | "editor", author: Person) {
		const customer = await this.personsService.getByPersonId(personID);

		if (!customer) {
			throw new HttpException(`User by id ${personID} not found`, 404);
		}

		const authorPermissions = await this.getByCollectionIDAndPerson(collectionID, author);

		if (!isAdminOf(authorPermissions, author)) {
			throw new HttpException("Insufficient rights to allow form access", 403);
		}

		const permissionType = type === "admin"
			? FormPermissionEntityType.admin
			: FormPermissionEntityType.editor;
		const existing = await this.findExistingEntity(collectionID, personID);
		if (existing) {
			await this.store.update({ ...existing, type: permissionType });
		} else {
			await this.store.create({
				collectionID,
				type: permissionType,
				userID: customer.id
			});
		}

		if (!existing) {
			void this.sendFormPermissionAccepted(customer, collectionID);
		}

		return this.getByCollectionIDAndPerson(collectionID, author);
	}

	private async findExistingEntity(collectionID: string, personID: string) {
		const permissions = await this.store.getAll(
			{ collectionID, userID: personID },
			undefined,
			{ primaryKeys: ["collectionID", "userID"] }
		);
		const existing = permissions.pop();
		// There should be always just one permission, but in case some other system (old api...)
		// has messed thing up, we make sure there's just one. No need for awaiting for this.
		if (permissions.length > 0) {
			for (const permission of permissions) {
				void this.store.delete(permission.id);
			}
		}
		return existing;
	}

	async revokeAccess(collectionID: string, personID: string, author: Person) {
		const customer = await this.personsService.getByPersonId(personID);

		if (!customer) {
			throw new HttpException(`User by id ${personID} not found`, 404);
		}

		const authorPermissions = await this.getByCollectionIDAndPerson(collectionID, author);

		if (!isAdminOf(authorPermissions, author)) {
			throw new HttpException("Insufficient rights to allow form access", 403);
		}

		const existing = await this.findExistingEntity(collectionID, personID);

		if (!existing) {
			throw new HttpException("User did not have a permission to delete", 404);
		}

		await this.store.delete(existing.id);
		return this.getByCollectionIDAndPerson(collectionID, author);
	}

	async isAdminOf(collectionID: string, person: Person) {
		const permissions = await this.getByCollectionIDAndPerson(collectionID, person);
		return isAdminOf(permissions, person);
	}

	async hasEditRightsOf(collectionID: string, person: Person) {
		const permissions = await this.findByCollectionIDAndPerson(collectionID, person);
		return hasEditRightsOf(permissions, person);
	}

	private async sendFormPermissionRequested(person: Person, collectionID: string) {
		const formTitle = await this.getFormTitle(collectionID);
		void this.mailService.sendFormPermissionRequested(person, { formTitle });

		const form = await this.findFormWithPermissionFeature(collectionID);
		if (!form) {
			return;
		}

		const { admins } = await this.findByCollectionID(collectionID);
		for (const adminID of admins) {
			const admin = await this.personsService.getByPersonId(adminID);
			void this.mailService.sendFormPermissionRequestReceived(
				admin, { formTitle, person: admin, formID: form.id }
			);
		}
	}

	private async sendFormPermissionAccepted(person: Person, collectionID: string) {
		const formTitle = await this.getFormTitle(collectionID);
		void this.mailService.sendFormPermissionAccepted(person, { formTitle });
	}

	private async getFormTitle(collectionID: string): Promise<CompleteMultiLang> {
		const form = await this.findFormWithPermissionFeature(collectionID);

		const fi = await this.getFormTitleForLang(collectionID, form, Lang.fi);
		const sv = await this.getFormTitleForLang(collectionID, form, Lang.sv);
		const en = await this.getFormTitleForLang(collectionID, form, Lang.en);
		return { fi, sv, en };
	}

	private async getFormTitleForLang(
		collectionID: string,
		form: FormListing | undefined,
		lang: Lang
	): Promise<string> {
		if (form?.options.shortTitleFromCollectionName && collectionID) {
			const collection = await this.langService.translate<Collection<MultiLang>, Collection<string>>(
				await this.collectionsService.get(collectionID),
				lang,
				true
			);
			if (collection.collectionName) {
				return collection.collectionName;
			}
		}
		if (form) {
			const translatedForm = await this.formService.get(form.id, Format.json, lang, true);
			const titleFromForm = translatedForm.shortTitle || translatedForm.title;
			if ( titleFromForm) {
				return titleFromForm;
			}
		}
		return collectionID;
	}
}

const isAdminOf = (permissions: PermissionLists, person: Person) =>
	person.role?.some(r => r === Role.Admin)
		|| permissions.admins?.includes(person.id);

const hasEditRightsOf = (permissions: FormPermissionDto | undefined, person: Person) =>
	!permissions
		|| isAdminOf(permissions, person)
		|| permissions.editors.includes(person.id);

const hasRequested = (permissions: FormPermissionDto, person: Person) =>
	permissions.permissionRequests.includes(person.id);

const naturalSort = (a: string, b: string) =>
	parseInt(a.replace( /^\D+/g, ""), 10) - parseInt(b.replace( /^\D+/g, ""), 10);

const withIsPerson = (person: Person) => (userID: string) => userID === person.id;

/** All response types have these properties, but they contain different values in the lists (person ids or collection ids). */
type PermissionLists = { admins: string[], editors: string[], permissionRequests: string[] };

const entitiesToPermissionLists = (entities: FormPermissionEntity[], mapToProp: keyof FormPermissionEntity)
	: PermissionLists =>
	entities.reduce((permissions, entity) => {
		if (!entity.userID) {
			return permissions;
		}
		const value = entity[mapToProp];
		if (!value) {
			throw new HttpException(`Form permission ${mapToProp} was undefined`, 500);
		}
		switch (entity.type) {
		case(FormPermissionEntityType.admin):
			permissions.admins.push(value);
			break;
		case(FormPermissionEntityType.editor):
			permissions.editors.push(value);
			break;
		case(FormPermissionEntityType.request):
			permissions.permissionRequests.push(value);
			break;
		}
		return permissions;
	}, { admins: [], editors: [], permissionRequests: [] } as PermissionLists);
