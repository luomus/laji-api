import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as htmlPdf from "html-pdf-chrome";
import * as sanitizeHtml from "sanitize-html";

@Injectable()
export class HtmlToPdfService {
	constructor(private config: ConfigService) {}

	async htmlToPdf(html: string) {
		html = sanitizeHtml(html, {
			allowedTags: false,
			allowVulnerableTags: true,
			allowedAttributes: false,
			exclusiveFilter: function(frame: any) {
				return ["script"].includes(frame.tag);
			},
			disallowedTagsMode: "discard",
			allowedSchemes: [ "http", "https", "data"],
			allowedSchemesAppliedToAttributes: [ "href", "src", "cite" ],
			allowProtocolRelative: true
		});
		html = html.replace(
			"</head>",
			"<script type=\"application/javascript\">await document.fonts.ready;</script></head>"
		);
		const pdf =	(await htmlPdf.create(html, {
			port: this.config.get("HTML_PORT"),
			host: this.config.get("HTML_HOST"),
			timeout: 30000,
			printOptions: {
				paperWidth: 8.27,
				paperHeight: 11.69,
				marginTop: 0,
				marginBottom: 0,
				marginLeft: 0,
				marginRight: 0
			}
		})).toBuffer();
		return pdf;
	}
}
