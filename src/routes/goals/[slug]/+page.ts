import { error } from '@sveltejs/kit';
import { getGoal, getGoalGroup } from '$lib/content/goals';
import { getGuide, type Guide } from '$lib/content/guides';

export function load({ params }: { params: { slug: string } }) {
	const goal = getGoal(params.slug);
	if (!goal) throw error(404, 'Study goal not found');

	const relatedGuides = goal.related
		.map((slug) => getGuide(slug))
		.filter((guide): guide is Guide => Boolean(guide));

	return {
		goal,
		group: getGoalGroup(goal.group),
		relatedGuides
	};
}
