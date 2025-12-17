class InformationChild {
	title: string;
	id: string;
	children?: InformationChild[];
}

class FeaturedImage {
	url: string;
	caption: string;
}

export type RemoteInformation = {
	page?: {
		id: string;
		content?: string;
		title?: string;
		author?: string;
		posted?: string;
		tags?: string[];
		featuredImage?: FeaturedImage;
		modified?: string;
	}
	children?: InformationChild[];
	breadcrumb?: InformationChild[];
}

export class Information {
	id: string;
	content: string;
	title: string;
	author: string;
	posted: string;
	featuredImage?: FeaturedImage;
	tags: string[] = [];
	modified?: string;
	children?: InformationChild[];
	parents?: InformationChild[];
}
