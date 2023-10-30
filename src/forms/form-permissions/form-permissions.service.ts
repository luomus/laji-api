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
	private storeFormPermissionService = this.storeService.forResource<FormPermissionEntity>("formPermissionSingle");

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
		const permissionEntities = await this.storeFormPermissionService.getAll(`userID:"${person.id}"`);
		const formPermissions: FormPermissionPersonDto = {
			personID: person.id,
			...entitiesToPermissionLists(permissionEntities, "collectionID")
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

	private async getByCollectionId(collectionID: string)
	: Promise<Pick<FormPermissionDto, "admins" | "editors" | "permissionRequests">> {
		return entitiesToPermissionLists(
			await this.storeFormPermissionService.getAll(`collectionID:"${collectionID}"`),
			"userID"
		);
	}

	async getByCollectionIdAndPersonToken(collectionID: string, personToken: string): Promise<FormPermissionDto> {
		const person = await this.personsService.getByToken(personToken);
		return this.getByCollectionIdAndPerson(collectionID, person);
	}

	private async getByCollectionIdAndPerson(collectionID: string, person: Person): Promise<FormPermissionDto> {
		const formWithPermissionFeature = await this.findFormWithPermissionFeature(collectionID);

		if (!formWithPermissionFeature?.collectionID) {
			throw new HttpException("Form does not have restrict feature enabled", 404);
		}

		const permissions = await this.getByCollectionId(formWithPermissionFeature.collectionID);
		const isAdmin = await isAdminOf(permissions, person);
		if (isAdmin) {
			const listProps: (keyof PermissionLists)[] = ["admins", "editors", "permissionRequests"];
			listProps.forEach(prop => {
				permissions[prop].sort(naturalSort);
			})
		} else {
			permissions.admins = [];
			permissions.editors = permissions.editors.filter(isPerson(person));
			permissions.permissionRequests = permissions.permissionRequests.filter(isPerson(person));
		}
		return { collectionID, ...permissions };
	}

	private async findFormWithPermissionFeature(collectionID: string): Promise<Form | undefined> {
		const forms = await this.formService.getAll();
		const parentCollections = await this.collectionsService.getParents(collectionID);
		return forms.find(form =>
			(form.collectionID === collectionID
			|| parentCollections.some(parentCollection => form.collectionID === parentCollection.id))
			&& (form.options.restrictAccess || form.options.hasAdmins))
	}

	async requestAccess(collectionID: string, personToken: string) {
		const person = await this.personsService.getByToken(personToken);
		const permissions = await this.getByCollectionIdAndPerson(collectionID, person);

		if (hasEditRights(permissions, person)) {
			throw new HttpException("You already have access to this form", 406);
		}

		if (hasRequested(permissions, person)) {
			throw new HttpException("You already have requested access to this form", 406);
		}

		await this.storeFormPermissionService.create({
			collectionID,
			type: FormPermissionEntityType.request,
			userID: person.id
		});

		this.sendFormPermissionRequested(person, collectionID);

		return this.getByCollectionIdAndPerson(collectionID, person);
	}

	async acceptAccess(collectionID: string, personID: string, type: "admin" | "editor", personToken: string) {
		const author = await this.personsService.getByToken(personToken);
		const customer = await this.personsService.findByPersonId(personID);

		if (!customer) {
			throw new HttpException(`User by id ${personID} not found`, 404);
		}

		const authorPermissions = await this.getByCollectionIdAndPerson(collectionID, author);

		if (!isAdminOf(authorPermissions, author)) {
			throw new HttpException("Insufficient rights to allow form access", 403);
		}

		const permissionType = type === "admin"
			? FormPermissionEntityType.admin
			: FormPermissionEntityType.editor;
		const existing = await this.getExistingEntity(collectionID, personID);
		if (existing) {
			await this.storeFormPermissionService.update({ ...existing, type: permissionType });
		} else {
			await this.storeFormPermissionService.create({
				collectionID,
				type: permissionType,
				userID: customer.id
			});
		}

		if (!existing) {
			this.sendFormPermissionAccepted(customer, collectionID);
		}

		return this.getByCollectionIdAndPerson(collectionID, author);
	}

	private async getExistingEntity(collectionID: string, personID: string) {
		const permissions = await this.storeFormPermissionService.getAll(
			`collectionID:"${collectionID}" AND userID:"${personID}"`
		);
		const existing = permissions.pop();
		// There should be always just one permission, but in case some other system (old api...)
		// has messed thing up, we make sure there's just one. No need for awaiting for this.
		if (permissions.length > 0) {
			for (const permission of permissions) {
				this.storeFormPermissionService.delete(permission.id);
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

		const authorPermissions = await this.getByCollectionIdAndPerson(collectionID, author);

		if (!isAdminOf(authorPermissions, author)) {
			throw new HttpException("Insufficient rights to allow form access", 403);
		}

		const existing = await this.getExistingEntity(collectionID, personID);

		if (!existing) {
			throw new HttpException("User did not have a permission to delete", 404);
		}

		await this.storeFormPermissionService.delete(existing.id);
		return this.getByCollectionIdAndPerson(collectionID, author);
	}

	private async sendFormPermissionRequested(person: Person, collectionID: string) {
		const formTitle = await this.getFormTitle(collectionID);
		this.mailService.sendFormPermissionRequested(person, { formTitle });

		const form = await this.findFormWithPermissionFeature(collectionID);
		if (!form) {
			return;
		}

		const { admins } = await this.getByCollectionId(collectionID);
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
				await this.collectionsService.findOne(collectionID),
				lang,
				true
			);
			if (collection.collectionName) {
				return collection.collectionName;
			}
		}
		if (form) {
			const translatedForm = await this.formService.findOne(form.id, Format.json, lang, true);
			const titleFromForm = translatedForm.shortTitle || translatedForm.title
			if ( titleFromForm) {
				return titleFromForm;
			}
		}
		return collectionID;
	}
}

function isAdminOf(permissions: PermissionLists, person: Person) {
	return person.role?.includes(Role.Admin)
		|| permissions.admins?.includes(person.id);
}

function hasEditRights(permissions: FormPermissionDto, person: Person) {
	return isAdminOf(permissions, person)
		|| permissions.editors.includes(person.id)
}

function hasRequested(permissions: FormPermissionDto, person: Person) {
	return permissions.permissionRequests.includes(person.id);
}

const naturalSort = (a: string, b: string) =>
	parseInt(a.replace( /^\D+/g, ""), 10) - parseInt(b.replace( /^\D+/g, ""), 10);

const isPerson = (person: Person) => (userID: string) => userID === person.id;

/**
 * All response types have these properties, but they contain different values in the lists (person ids or collection ids).
 */
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
