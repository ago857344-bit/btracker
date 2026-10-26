import { error } from '@sveltejs/kit';
import {
	getAdjacentGuides,
	getCategory,
	getGuide,
	getRelatedGuides
} from '$lib/content/guides';

export function load({ params }: { params: { slug: string } }) {
	const guide = getGuide(params.slug);
	if (!guide) throw error(404, 'Guide not found');

	return {
		guide,
		category: getCategory(guide.category),
		related: getRelatedGuides(guide),
		adjacent: getAdjacentGuides(guide)
	};
}
