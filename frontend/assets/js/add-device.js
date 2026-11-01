export function validateDeviceForm(form) {
  const data = Object.fromEntries(new FormData(form));
  if (!data.name || !data.host || !data.type) throw new Error('Device name, host and type are required');
  return data;
}