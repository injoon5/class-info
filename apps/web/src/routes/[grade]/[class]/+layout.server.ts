import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getConvexClient } from '$lib/server/school';
import { api } from '@class-info/backend/convex/_generated/api';

export const load = (async ({ params, parent }) => {
	const { school } = await parent();
	if (!school) throw error(404, '학교를 찾을 수 없습니다.');

	const grade = Number(params.grade);
	const classNo = Number(params.class);
	if (!Number.isInteger(grade) || !Number.isInteger(classNo)) {
		throw error(404, '잘못된 학급입니다.');
	}

	const client = getConvexClient();
	const klass = await client.query((api as any).classes.getClass, {
		schoolId: school._id,
		grade,
		classNo
	});
	if (!klass) throw error(404, '등록되지 않은 학급입니다.');

	return { klass, grade, classNo };
}) satisfies LayoutServerLoad;
