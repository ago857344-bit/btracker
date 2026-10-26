import { error } from '@sveltejs/kit';
import { getCategory, getPlaybook, playbooks } from '$lib/content/playbooks';

export function load({ params }: { params: { slug: string } }) {
	const playbook = getPlaybook(params.slug);
	if (!playbook) throw error(404, 'Playbook not found');

	const related = playbook.related
		.map((slug) => getPlaybook(slug))
		.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

	const index = playbooks.findIndex((entry) => entry.slug === playbook.slug);

	return {
		playbook,
		category: getCategory(playbook.category),
		related,
		adjacent: {
			prev: index > 0 ? playbooks[index - 1] : null,
			next: index < playbooks.length - 1 ? playbooks[index + 1] : null
		}
	};
}
