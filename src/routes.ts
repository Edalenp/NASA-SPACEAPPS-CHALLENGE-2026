/** Where the crew console lives; the landing page is everything else. */
export const LAB_PATH = '/lab';

export function isLabPath(pathname: string) {
  return pathname === LAB_PATH || pathname.startsWith(`${LAB_PATH}/`);
}
