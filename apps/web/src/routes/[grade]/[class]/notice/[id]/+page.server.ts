import type { PageServerLoad } from './$types.js';
import { getConvexClient } from '$lib/server/school';
import { api } from "@class-info/backend/convex/_generated/api";
import { marked } from 'marked';

export const load = (async ({ params, parent }) => {
	const { klass } = await parent();
	const client = getConvexClient();
	const { id } = params;

	const detail = await client.query((api as any).notices.detail, { classId: klass._id, id: id as any });



	function prerenderMarkdown(text: string) {
		let processedText = text
			.replace(/\r\n/g, '\n')
			.replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
			.replace(
				/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]t=(\d+)s?)?/g,
				(_match, videoId, timestamp) => {
					const startParam = timestamp ? `?start=${timestamp}` : '';
					return `\n\n<div class="video-embed"><iframe src="https://www.youtube.com/embed/${videoId}${startParam}" frameborder="0" allowfullscreen></iframe></div>\n\n`;
				}
			);
		return marked.parse(processedText);
	}

	const prerenderedHtml = detail.notice?.description ? await prerenderMarkdown(detail.notice.description) : null;

	return { ...detail, prerenderedHtml };
}) satisfies PageServerLoad;