// License startup check has been removed from this build.
// This stub preserves the original export so dev/start scripts keep working.

export async function runLicenseStartupCheck() {
  return {
    ok: true,
    state: 'valid',
    title: 'License check disabled',
    message: 'License validation has been removed from this build.',
    product: 'minecraft-server-web',
    hwid: 'unknown-host',
    url: '',
  };
}
