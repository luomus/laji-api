class InformationChild {
	title: string;
	id: string;
	children?: InformationChild[];
}

class FeaturedImage {
	url: string;
	caption: string;
	alt?: string;
}

export class LajiBackendCMSNode {
	id: string;
	content?: string;
	title?: string;
	author?: string;
	posted?: string;
	tags?: string[];
	featuredImage?: FeaturedImage;
	modified?: string;
};

export type RemoteInformation = {
	page?: LajiBackendCMSNode;
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
