import { getDatabase } from "../../utils/databaseAdapter.js";
import { destroySessionsByAuthType } from "../../utils/auth/sessionManager.js";

/**
 * 认证重置接口
 * 
 * 使用方式：
 * 浏览器访问 /api/resetAuth?key=mq254264sjndkndnncjsi
 * 成功后所有认证配置被清除，可以直接进入管理端重新设置
 */
export async function onRequestGet(context) {
    const { request, env } = context;

    // 优先读取环境变量，读不到就用内置默认 key
    const resetKey = env.RESET_KEY || 'mq254264sjndkndnncjsi';

    if (!resetKey || resetKey.trim() === '') {
        return new Response(JSON.stringify({
            error: 'RESET_KEY not configured. Set the RESET_KEY environment variable first.'
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key || key !== resetKey) {
        return new Response(JSON.stringify({ error: 'Invalid reset key' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const db = getDatabase(env);
        const settingsStr = await db.get('manage@sysConfig@security');
        if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            delete settings.auth;
            await db.put('manage@sysConfig@security', JSON.stringify(settings));
        }

        const adminDestroyed = await destroySessionsByAuthType(env, 'admin');
        const userDestroyed = await destroySessionsByAuthType(env, 'user');

        return new Response(JSON.stringify({
            success: true,
            message: 'Auth credentials reset. Other security settings preserved. All sessions cleared.',
            sessionsCleared: { admin: adminDestroyed, user: userDestroyed }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({
            error: 'Reset failed: ' + err.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
