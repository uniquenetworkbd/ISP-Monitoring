export function filterUsers(users, query = '') {
  const q = query.trim().toLowerCase();
  return users.filter((user) => !q || `${user.name || ''} ${user.username || ''} ${user.ip || ''}`.toLowerCase().includes(q));
}