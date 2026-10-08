export function faviconURL(website, online=true) {
  const site=new URL(website);
  if(!['https:','http:'].includes(site.protocol) || site.username || site.password)throw Error('Choose a valid website.');
  if(online){const url=new URL('https://www.google.com/s2/favicons');url.searchParams.set('domain',site.hostname);url.searchParams.set('sz','64');return url.href;}
  if(globalThis.chrome?.runtime?.id){const url=new URL(chrome.runtime.getURL('_favicon/'));url.searchParams.set('pageUrl',site.origin+'/');url.searchParams.set('size','32');return url.href;}
  return 'assets/site-icon.svg';
}
