import 'server-only';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';

/**
 * Verifies if the current user is authenticated and owns the specified project.
 * @param projectId The ID of the project to check ownership for.
 * @returns An object containing the result of the verification.
 */
export async function verifyProjectOwnership(projectId: string) {
    const session = await getSession();

    if (!session || !session.user) {
        return { isAuthorized: false, error: '未登录或会话已过期' };
    }

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
    });

    if (!project) {
        return { isAuthorized: false, error: '项目不存在' };
    }

    if (project.userId !== session.user.id) {
        return { isAuthorized: false, error: '无权访问此项目' };
    }

    return { isAuthorized: true, userId: session.user.id };
}

/**
 * Verifies if the current user owns the project containing the specified L2 diagram.
 * @param diagramId The ID of the pool/swimlane diagram (L2).
 * @returns An object containing the result of the verification.
 */
export async function verifyL2DiagramOwnership(diagramId: string) {
    const session = await getSession();

    if (!session || !session.user) {
        return { isAuthorized: false, error: '未登录或会话已过期' };
    }

    const diagram = await prisma.poolSwimlaneDiagram.findUnique({
        where: { id: diagramId },
        select: { project: { select: { userId: true } } },
    });

    if (!diagram) {
        return { isAuthorized: false, error: '图表不存在' };
    }

    if (diagram.project.userId !== session.user.id) {
        return { isAuthorized: false, error: '无权访问此图表' };
    }

    return { isAuthorized: true, userId: session.user.id };
}
