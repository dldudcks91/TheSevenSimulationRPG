const user = { uid: 'codex-hover', email: 'codex-hover@example.test' };
export const restoreUser = async () => ({ ok: true, user });
export const pullSave = async () => ({ ok: true, remote: null });
export const watchUser = async () => () => {};
export const pushSave = async () => ({ ok: true, rev: 1 });
export const signIn = async () => ({ ok: true, user });
export const signOut = async () => ({ ok: true });
export const warm = () => {};
