import { HttpException, Injectable } from "@nestjs/common";
import { Collection } from "src/collections/collection.dto";
import { CollectionsService } from "src/collections/collections.service";
import { CompleteMultiLang, Lang, MultiLang } from "src/common.dto";
import { LangService } from "src/lang/lang.service";
import { MailService } from "src/mail/mail.service";
import { Person, Role } from "src/persons/person.dto";
import { PersonsService } from "src/persons/persons.service";
import { StoreService } from "src/store/store.service";
import { Form, Format } from "../dto/form.dto";
import { FormsService } from "../forms.service";
import { FormPermissionDto, FormPermissionEntity, FormPermissionEntityType, FormPermissionPersonDto
} from "./dto/form-permission.dto";

@Injectable()
export class FormPermissionsService {
	private store = this.storeService.forResource<FormPermissionEntity>("formPermissionSingle");

	constructor(
		private personsService: PersonsService,
		private storeService: StoreService,
		private formService: FormsService,
		private collectionsService: CollectionsService,
		private mailService: MailService,
		private langService: LangService
	) {}

	async getByPersonToken(personToken: string): Promise<FormPermissionPersonDto> {
		const person = await this.personsService.getByToken(personToken);
		const findities = await this.store.getAll({ userID: person.id });
		const formPermissions: FormPermissionPersonDto = {
			personID: person.id,
			...entitiesToPermissionLists(findities, "collectionID")
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
		return entitiesToPermissionLists(await this.store.getAll({ collectionID }), "userID");
	}

	/** @throws HttpException */
	async getByCollectionIDAndPersonToken(collectionID: string, personToken: string): Promise<FormPermissionDto> {
		const person = await this.personsService.getByToken(personToken);
		return this.getByCollectionIDAndPerson(collectionID, person);
	}

	/** @throws HttpException */
	private async getByCollectionIDAndPerson(collectionID: string, person: Person): Promise<FormPermissionDto> {
		const formWithPermissionFeature = await this.findFormWithPermissionFeature(collectionID);

		if (!formWithPermissionFeature?.collectionID) {
			throw new HttpException("Form does not have restrict feature enabled", 404);
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
			permissions.editors = permissions.editors.filter(isPerson(person));
			permissions.permissionRequests = permissions.permissionRequests.filter(isPerson(person));
		}
		return { collectionID, ...permissions };
	}

	private async findFormWithPermissionFeature(collectionID: string): Promise<Form | undefined> {
		return this.formService.findFor(
			collectionID,
			form => form.options.restrictAccess || form.options.hasAdmins
		);
	}

	/** @throws HttpException */
	async requestAccess(collectionID: string, personToken: string) {
		const person = await this.personsService.getByToken(personToken);
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

		this.sendFormPermissionRequested(person, collectionID);

		return this.getByCollectionIDAndPerson(collectionID, person);
	}

	/** @throws HttpException */
	async acceptAccess(collectionID: string, personID: string, type: "admin" | "editor", personToken: string) {
		const author = await this.personsService.getByToken(personToken);
		const customer = await this.personsService.findByPersonId(personID);

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
			this.sendFormPermissionAccepted(customer, collectionID);
		}

		return this.getByCollectionIDAndPerson(collectionID, author);
	}

	private async findExistingEntity(collectionID: string, personID: string) {
		const permissions = await this.store.getAll({ collectionID, userID: personID });
		const existing = permissions.pop();
		// There should be always just one permission, but in case some other system (old api...)
		// has messed thing up, we make sure there's just one. No need for awaiting for this.
		if (permissions.length > 0) {
			for (const permission of permissions) {
				this.store.delete(permission.id);
			}
		}
		return existing;
	}

	async revokeAccess(collectionID: string, personID: string, personToken: string) {
		const author = await this.personsService.getByToken(personToken);
		const customer = await this.personsService.findByPersonId(personID);

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

	private async sendFormPermissionRequested(person: Person, collectionID: string) {
		const formTitle = await this.getFormTitle(collectionID);
		this.mailService.sendFormPermissionRequested(person, { formTitle });

		const form = await this.findFormWithPermissionFeature(collectionID);
		if (!form) {
			return;
		}

		const { admins } = await this.findByCollectionID(collectionID);
		for (const adminID of admins) {
			const admin = await this.personsService.findByPersonId(adminID);
			this.mailService.sendFormPermissionRequestReceived(admin, { formTitle, person: admin, formID: form.id });
		}
	}

	private async sendFormPermissionAccepted(person: Person, collectionID: string) {
		const formTitle = await this.getFormTitle(collectionID);
		this.mailService.sendFormPermissionAccepted(person, { formTitle });
	}

	private async getFormTitle(collectionID: string): Promise<CompleteMultiLang> {
		const form = await this.findFormWithPermissionFeature(collectionID);

		const fi = await this.getFormTitleForLang(collectionID, form, Lang.fi);
		const sv = await this.getFormTitleForLang(collectionID, form, Lang.sv);
		const en = await this.getFormTitleForLang(collectionID, form, Lang.en);
		return { fi, sv, en };
	}

	private async getFormTitleForLang(collectionID: string, form: Form | undefined, lang: Lang): Promise<string> {
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

export function isAdminOf(permissions: PermissionLists, person: Person) {
	return person.role?.some(r => r === Role.Admin)
		|| permissions.admins?.includes(person.id);
}

export function hasEditRightsOf(permissions: FormPermissionDto, person: Person) {
	return isAdminOf(permissions, person)
		|| permissions.editors.includes(person.id);
}

function hasRequested(permissions: FormPermissionDto, person: Person) {
	return permissions.permissionRequests.includes(person.id);
}

const naturalSort = (a: string, b: string) =>
	parseInt(a.replace( /^\D+/g, ""), 10) - parseInt(b.replace( /^\D+/g, ""), 10);

const isPerson = (person: Person) => (userID: string) => userID === person.id;

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
